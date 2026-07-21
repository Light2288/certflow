'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIService, AIServiceError } from '@/lib/ai';
import {
  generateDeepDive,
  parseDeepDive,
  buildDeepDivePrompt,
  buildDeepDiveSystemPrompt,
  getDeepDive,
  setDeepDive,
  clearDeepDive,
} from '@/lib/ai/deep-dive';
import type { DeepDive } from '@/lib/ai/deep-dive';
import { useSettings } from '@/lib/contexts/settings-context';
import {
  loadCertificationConfig,
  loadCertificationTopics,
  loadCertificationQuestions,
  getQuestionsByTopic,
  getRandomQuestions,
} from '@/lib/loaders/certification-loader';
import type { Question, Topic } from '@/lib/types/certification';
import { markdownComponents } from './markdown-components';

interface DeepDiveButtonProps {
  topic: Topic;
}

const MAX_RETRIES = 3;

/** Number of real questions to inject as few-shot examples. */
const FEW_SHOT_COUNT = 3;

/**
 * Build a user-friendly error message from an error thrown during a deep-dive
 * request. Mirrors the AI Tutor's per-AIServiceError-code handling.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof AIServiceError) {
    switch (error.code) {
      case 'MISSING_API_KEY':
        return `⚠️ **API Key Required**\n\nYour ${error.provider || 'AI provider'} needs an API key to generate a deep dive. Please:\n\n1. Go to [Settings](/settings)\n2. Enter your API key\n3. Try again`;
      case 'INVALID_API_KEY':
        return `🔑 **Invalid API Key**\n\nThe API key for ${error.provider || 'your provider'} appears to be invalid. Please check it in [Settings](/settings) and try again.`;
      case 'RATE_LIMIT':
        return `⏱️ **Rate Limit Reached**\n\nYou've sent too many requests to ${error.provider || 'the AI provider'}. Please wait a moment and try again.`;
      case 'QUOTA_EXCEEDED':
        return `💳 **Quota Exceeded**\n\nYour ${error.provider || 'AI provider'} quota has been exceeded. Check your account balance and try again.`;
      case 'NETWORK_ERROR':
        return `🌐 **Network Error**\n\nCouldn't connect to ${error.provider || 'the AI provider'}. Check your connection and try again.\n\nError details: ${error.message}`;
      case 'MODEL_NOT_FOUND':
        return `🤖 **Model Not Available**\n\nThe model you selected isn't available. Choose a different model in [Settings](/settings) and try again.\n\nError: ${error.message}`;
      case 'EMPTY_RESPONSE':
        return `📭 **No Content Returned**\n\nThe AI provider returned an empty or unparseable deep dive. Please try again in a moment.`;
      default:
        return `❌ **Error**\n\n${error.message}\n\nProvider: ${error.provider || 'Unknown'}\nCode: ${error.code}\n\nPlease check your [Settings](/settings) and try again.`;
    }
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return `❌ **Unexpected Error**\n\nSomething went wrong: ${message}\n\nPlease check your [Settings](/settings) and try again.`;
}

/** Render a single practice question's correct answer as display text. */
function answerText(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(', ') : answer;
}

export default function DeepDiveButton({ topic }: DeepDiveButtonProps) {
  const { settings, currentCertificationId } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dive, setDive] = useState<DeepDive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const aiService = useMemo(() => {
    return new AIService({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    });
  }, [settings]);

  /**
   * Load few-shot example questions and (best-effort) a cert-grounded system
   * prompt for the current certification. Any load failure degrades to a
   * topic-only dive: sampled = [] and systemPrompt = undefined.
   */
  const loadGrounding = async (): Promise<{
    examples: Question[];
    systemPrompt: string | undefined;
  }> => {
    if (!currentCertificationId) {
      return { examples: [], systemPrompt: undefined };
    }

    let examples: Question[] = [];
    try {
      const questions = await loadCertificationQuestions(currentCertificationId);
      const forTopic = getQuestionsByTopic(topic.id, questions);
      examples = getRandomQuestions(forTopic, FEW_SHOT_COUNT);
    } catch (err) {
      console.warn('Deep dive: failed to load practice questions.', err);
    }

    let systemPrompt: string | undefined;
    try {
      const [config, topics] = await Promise.all([
        loadCertificationConfig(currentCertificationId),
        loadCertificationTopics(currentCertificationId),
      ]);
      systemPrompt = buildDeepDiveSystemPrompt(config, topics);
    } catch (err) {
      console.warn('Deep dive: failed to build cert system prompt.', err);
    }

    return { examples, systemPrompt };
  };

  const runDeepDive = async (isRetry = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const { examples, systemPrompt } = await loadGrounding();

      let result: DeepDive;

      // Ollama runs server-side only, and a custom OpenAI-compatible endpoint
      // may not be reachable from the browser (CORS/network), so route both
      // through the /api/chat route (mirroring the AI Tutor). Other providers
      // run client-side directly.
      if (settings.provider === 'ollama' || settings.provider === 'custom') {
        const prompt = buildDeepDivePrompt(topic, examples);
        const history = systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt, timestamp: new Date() }]
          : [];

        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            history,
            config: {
              provider: settings.provider,
              apiKey: settings.apiKey,
              model: settings.model,
              baseUrl: settings.baseUrl,
              temperature: settings.temperature,
              maxTokens: settings.maxTokens,
            },
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({}));
          throw new AIServiceError(
            errorData.error || 'API request failed',
            errorData.code || 'API_ERROR',
            errorData.provider || settings.provider
          );
        }

        const data = await apiResponse.json();
        const parsed = parseDeepDive((data?.content ?? '').trim());
        if (!parsed) {
          throw new AIServiceError(
            'The AI provider returned an empty or unparseable deep-dive response.',
            'EMPTY_RESPONSE',
            settings.provider
          );
        }
        result = parsed;
      } else {
        result = await generateDeepDive(topic, aiService, examples, systemPrompt);
      }

      // Persist (best-effort; store swallows failures) and show.
      if (currentCertificationId) {
        setDeepDive({
          certId: currentCertificationId,
          topicId: topic.id,
          generatedAt: Date.now(),
          dive: result,
        });
      }
      setDive(result);
      setRetryCount(0);
    } catch (err) {
      console.error('Deep dive error:', err);
      setError(getErrorMessage(err));
      if (isRetry) {
        setRetryCount((prev) => prev + 1);
      } else {
        setRetryCount(1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Toggle the panel.
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    // Already have an in-session dive: show it, no work.
    if (dive) {
      return;
    }

    // Cache-first: serve a persisted dive without calling the provider.
    if (currentCertificationId) {
      const cached = getDeepDive(currentCertificationId, topic.id);
      if (cached) {
        setDive(cached.dive);
        return;
      }
    }

    // Cache miss: generate.
    if (!isLoading) {
      void runDeepDive(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES && !isLoading) {
      void runDeepDive(true);
    }
  };

  const handleRegenerate = () => {
    if (isLoading) {
      return;
    }
    if (currentCertificationId) {
      clearDeepDive(currentCertificationId, topic.id);
    }
    setDive(null);
    void runDeepDive(false);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        aria-expanded={isOpen}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Deep Dive with AI
      </button>

      {isOpen && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-inner">
          {isLoading && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
              <span>Generating deep dive for {topic.name}…</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-red-800 dark:text-red-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {error}
                </ReactMarkdown>
              </div>
              {retryCount < MAX_RETRIES ? (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Retry ({MAX_RETRIES - retryCount} left)
                </button>
              ) : (
                <p className="text-sm text-red-800 dark:text-red-200">
                  Maximum retries reached. Please check your{' '}
                  <Link href="/settings" className="underline hover:no-underline font-medium">
                    Settings
                  </Link>{' '}
                  and try again later.
                </p>
              )}
            </div>
          )}

          {!isLoading && !error && dive && (
            <div className="space-y-6">
              <div className="flex items-center justify-end">
                <button
                  onClick={handleRegenerate}
                  className="px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                >
                  Regenerate
                </button>
              </div>

              {dive.sections.map((section, i) => (
                <section key={`section-${i}`}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {section.heading}
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {section.body}
                    </ReactMarkdown>
                  </div>
                </section>
              ))}

              {dive.practiceQuestions.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Targeted Practice Questions
                  </h3>
                  <ol className="space-y-4 list-decimal list-inside">
                    {dive.practiceQuestions.map((q, i) => (
                      <li key={`pq-${i}`} className="text-gray-900 dark:text-white">
                        <span className="font-medium">{q.question}</span>
                        <ul className="mt-1 ml-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                          {q.options.map((opt) => (
                            <li key={opt.id}>
                              <span className="font-mono mr-1">{opt.id})</span>
                              {opt.text}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                          Answer: {answerText(q.correctAnswer)} — {q.explanation}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {dive.traps.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Common Exam Traps
                  </h3>
                  <ul className="space-y-3">
                    {dive.traps.map((trap, i) => (
                      <li key={`trap-${i}`} className="text-gray-900 dark:text-white">
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {trap.trap}
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{trap.why}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

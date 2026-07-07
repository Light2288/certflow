'use client';

import { useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIService, AIServiceError } from '@/lib/ai';
import { generateDeepDive } from '@/lib/ai/deep-dive';
import { useSettings } from '@/lib/contexts/settings-context';
import type { Topic } from '@/lib/types/certification';

type CodeRendererProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean };

interface DeepDiveButtonProps {
  topic: Topic;
}

const MAX_RETRIES = 3;

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
        return `📭 **No Content Returned**\n\nThe AI provider returned an empty deep dive. Please try again in a moment.`;
      default:
        return `❌ **Error**\n\n${error.message}\n\nProvider: ${error.provider || 'Unknown'}\nCode: ${error.code}\n\nPlease check your [Settings](/settings) and try again.`;
    }
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return `❌ **Unexpected Error**\n\nSomething went wrong: ${message}\n\nPlease check your [Settings](/settings) and try again.`;
}

/**
 * Markdown renderer components, mirroring the AI Tutor's ChatMessage styling.
 */
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
  code: ({ inline, children, ...props }: CodeRendererProps) =>
    inline ? (
      <code className="bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ) : (
      <code className="block bg-gray-200 dark:bg-gray-600 p-2 rounded text-sm font-mono overflow-x-auto my-2" {...props}>
        {children}
      </code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-2">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">{children}</blockquote>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
      {children}
    </a>
  ),
};

export default function DeepDiveButton({ topic }: DeepDiveButtonProps) {
  const { settings } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
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

  const runDeepDive = async (isRetry = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateDeepDive(topic, aiService);
      setContent(result);
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

    // Use cached content if we already have a successful deep dive.
    if (content) {
      return;
    }

    // Avoid launching a second request while one is already in flight.
    if (!isLoading) {
      void runDeepDive(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES && !isLoading) {
      void runDeepDive(true);
    }
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

          {!isLoading && !error && content && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

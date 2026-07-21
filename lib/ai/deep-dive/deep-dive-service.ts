/**
 * Topic Deep Dive — Service
 *
 * Calls the user's configured AI provider (via an AIService instance) to
 * generate a *structured* deep dive for a certification topic and parses the
 * response into a `DeepDive` object.
 *
 * Mirrors the generator's `callAi` pattern: a `system`-role message is
 * prepended to the history, and one retry is attempted when the response
 * cannot be parsed as the required JSON. The system message is the
 * cert-grounded prompt when supplied, or the base `DEEP_DIVE_SYSTEM_PROMPT`.
 */

import type { AIService } from '@/lib/ai';
import { AIServiceError } from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai/types';
import type { Question, Topic } from '@/lib/types/certification';
import {
  DEEP_DIVE_SYSTEM_PROMPT,
  DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION,
  buildDeepDivePrompt,
} from './prompts';
import type { DeepDive } from './types';

/**
 * Defensively extract a `DeepDive` object from raw AI content.
 *
 * Slices from the first `{` to the last `}` (tolerating code fences and
 * surrounding prose), parses, and verifies the required arrays are present.
 * Returns null when no conforming object can be recovered.
 */
export function parseDeepDive(content: string): DeepDive | null {
  if (!content) {
    return null;
  }

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const p = parsed as Record<string, unknown>;
  if (
    !Array.isArray(p.sections) ||
    !Array.isArray(p.practiceQuestions) ||
    !Array.isArray(p.traps)
  ) {
    return null;
  }

  return {
    topicId: typeof p.topicId === 'string' ? p.topicId : '',
    sections: p.sections as DeepDive['sections'],
    practiceQuestions: p.practiceQuestions as DeepDive['practiceQuestions'],
    traps: p.traps as DeepDive['traps'],
  };
}

/**
 * Generate a structured deep dive for a topic using the given AI service.
 *
 * Builds a grounded user prompt (topic key points + few-shot real questions),
 * prepends a `system`-role message (the cert-grounded prompt when supplied,
 * else the base prompt), calls the provider, and parses the JSON response.
 *
 * @param topic - The topic to expand.
 * @param service - The AI service to call.
 * @param exampleQuestions - Real practice questions for few-shot grounding.
 * @param systemPrompt - Optional cert-grounded system prompt; falls back to
 *   `DEEP_DIVE_SYSTEM_PROMPT` when omitted.
 * @returns The parsed `DeepDive`.
 * @throws AIServiceError on empty response, unparseable output after one
 *   retry, or underlying provider failure.
 */
export async function generateDeepDive(
  topic: Topic,
  service: AIService,
  exampleQuestions: Question[] = [],
  systemPrompt?: string
): Promise<DeepDive> {
  const userPrompt = buildDeepDivePrompt(topic, exampleQuestions);
  const systemMessage: ChatMessage = {
    role: 'system',
    content: systemPrompt ?? DEEP_DIVE_SYSTEM_PROMPT,
    timestamp: new Date(),
  };

  const first = await service.chat(userPrompt, [systemMessage]);
  const firstContent = first?.content ?? '';
  if (firstContent.trim().length === 0) {
    throw new AIServiceError(
      'The AI provider returned an empty deep-dive response.',
      'EMPTY_RESPONSE',
      service.getProviderName?.()
    );
  }

  const parsed = parseDeepDive(firstContent);
  if (parsed) {
    return parsed;
  }

  // One retry with a strict-JSON instruction.
  const retryMessage: ChatMessage = {
    role: 'system',
    content: DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION,
    timestamp: new Date(),
  };
  const second = await service.chat(userPrompt, [systemMessage, retryMessage]);
  const secondParsed = parseDeepDive(second?.content ?? '');
  if (secondParsed) {
    return secondParsed;
  }

  throw new AIServiceError(
    'The AI provider did not return a parseable deep-dive object.',
    'EMPTY_RESPONSE',
    service.getProviderName?.()
  );
}

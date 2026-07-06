/**
 * Topic Deep Dive — Service
 *
 * Calls the user's configured AI provider (via an AIService instance) to
 * generate a structured markdown deep dive for a certification topic.
 */

import type { AIService } from '@/lib/ai';
import { AIServiceError } from '@/lib/ai';
import type { Topic } from '@/lib/types/certification';
import { buildDeepDivePrompt } from './prompts';

/**
 * Generate a markdown deep dive for a topic using the given AI service.
 *
 * Builds a topic-grounded prompt, calls the provider, and returns the markdown
 * content. If the provider returns empty/whitespace content, an AIServiceError
 * with code `EMPTY_RESPONSE` is thrown so the UI can show a friendly fallback.
 * Any AIServiceError raised by the service propagates unchanged.
 *
 * @param topic - The topic to expand.
 * @param service - The AI service to call.
 * @returns The markdown deep-dive content.
 * @throws AIServiceError on empty response or underlying provider failure.
 */
export async function generateDeepDive(
  topic: Topic,
  service: AIService
): Promise<string> {
  const prompt = buildDeepDivePrompt(topic);

  const response = await service.chat(prompt);

  const content = response?.content ?? '';
  if (content.trim().length === 0) {
    throw new AIServiceError(
      'The AI provider returned an empty deep-dive response.',
      'EMPTY_RESPONSE',
      service.getProviderName?.()
    );
  }

  return content;
}

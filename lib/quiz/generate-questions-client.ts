/**
 * Client helper: route question generation through the server API.
 *
 * The exam simulator runs in the browser, but some providers (notably Ollama)
 * are server-only. This helper POSTs a GenerationRequest + provider config to
 * `/api/generate-questions`, where the QuestionGenerator + validator run
 * server-side, and returns a GenerationResult. It never throws: transport or
 * server failures are surfaced via the `error` field so callers can fall back
 * to curated questions.
 */

import type { AISettings } from '@/lib/types/ai-settings';
import type { GenerationRequest, GenerationResult } from '@/lib/ai/generator';
import { AIServiceError } from '@/lib/ai/types';

/** Empty stats used when a request fails before the server could count anything. */
function emptyStats(count: number): GenerationResult['stats'] {
  return { requested: count, produced: 0, approved: 0, flagged: 0, rejected: 0 };
}

export async function generateQuestionsViaApi(
  request: GenerationRequest,
  settings: AISettings
): Promise<GenerationResult> {
  const config = {
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  };

  try {
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, config }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        (data && typeof data.error === 'string' && data.error) ||
        'Question generation failed on the server.';
      const code =
        (data && typeof data.code === 'string' && data.code) || 'SERVICE_ERROR';
      return {
        generated: [],
        rejected: [],
        stats: emptyStats(request.count),
        error: new AIServiceError(message, code, settings.provider),
      };
    }

    // Rehydrate a serialized error (the server sends a plain object).
    const error = data.error
      ? new AIServiceError(
          data.error.message ?? 'Question generation failed.',
          data.error.code ?? 'SERVICE_ERROR',
          data.error.provider ?? settings.provider
        )
      : undefined;

    return {
      generated: Array.isArray(data.generated) ? data.generated : [],
      rejected: Array.isArray(data.rejected) ? data.rejected : [],
      stats: data.stats ?? emptyStats(request.count),
      error,
    };
  } catch (err) {
    return {
      generated: [],
      rejected: [],
      stats: emptyStats(request.count),
      error: new AIServiceError(
        err instanceof Error ? err.message : 'Network error during generation.',
        'SERVICE_ERROR',
        settings.provider
      ),
    };
  }
}

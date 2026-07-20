/**
 * Tests for generateQuestionsViaApi: the client helper that routes question
 * generation through the server API (so server-only providers like Ollama work).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQuestionsViaApi } from '../generate-questions-client';
import type { AISettings } from '@/lib/types/ai-settings';
import type { GenerationRequest } from '@/lib/ai/generator';
import type { Topic } from '@/lib/types/certification';

const topic: Topic = {
  id: 'data-eng',
  name: 'Data Engineering',
  description: 'x',
  weight: 20,
  order: 1,
  subtopics: [{ id: 'ingestion', name: 'Ingestion', description: 'x', keyPoints: [] }],
};

const request: GenerationRequest = {
  topic,
  subtopic: topic.subtopics[0],
  difficulty: 'medium',
  count: 2,
  existingQuestionIds: ['q0'],
};

const settings: AISettings = { provider: 'ollama', model: 'llama3', baseUrl: 'http://localhost:11434' };

describe('generateQuestionsViaApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs the request and config to /api/generate-questions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generated: [],
        rejected: [],
        stats: { requested: 2, produced: 0, approved: 0, flagged: 0, rejected: 0 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await generateQuestionsViaApi(request, settings);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/generate-questions');
    const body = JSON.parse(init.body);
    expect(body.request.count).toBe(2);
    expect(body.request.topic.id).toBe('data-eng');
    expect(body.config.provider).toBe('ollama');
    expect(body.config.model).toBe('llama3');
  });

  it('returns the parsed GenerationResult on success', async () => {
    const generated = [{ id: 'gen_1', metadata: { source: 'ai-generated' } }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          generated,
          rejected: [],
          stats: { requested: 2, produced: 1, approved: 1, flagged: 0, rejected: 0 },
        }),
      })
    );

    const result = await generateQuestionsViaApi(request, settings);
    expect(result.generated).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('returns an error result when the API responds with an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Ollama unreachable', code: 'SERVICE_ERROR' }),
      })
    );

    const result = await generateQuestionsViaApi(request, settings);
    expect(result.generated).toHaveLength(0);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('Ollama unreachable');
  });

  it('returns an error result when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await generateQuestionsViaApi(request, settings);
    expect(result.generated).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });
});

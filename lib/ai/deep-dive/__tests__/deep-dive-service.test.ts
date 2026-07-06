/**
 * Tests for the Topic Deep Dive service and prompt builder.
 *
 * Verifies:
 * - The prompt injects topic name, description, and aggregated subtopic key points.
 * - A topic with no/empty key points still produces a valid prompt.
 * - generateDeepDive returns the provider's markdown content on success.
 * - Empty AI content surfaces an AIServiceError (EMPTY_RESPONSE).
 * - A thrown AIServiceError from the service propagates unchanged.
 *
 * Never hits the network — uses a lightweight stub AIService.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildDeepDivePrompt, generateDeepDive } from '../index';
import { AIServiceError } from '@/lib/ai';
import type { AIService } from '@/lib/ai';
import type { Topic } from '@/lib/types/certification';

/**
 * Build a stub AIService with a mockable chat method.
 */
function makeStubService(chat: ReturnType<typeof vi.fn>): AIService {
  return { chat } as unknown as AIService;
}

const topic: Topic = {
  id: 'data-engineering',
  name: 'Data Engineering',
  description: 'Building and maintaining data pipelines for ML workloads.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'de-1',
      name: 'Data Repositories',
      description: 'Where data lives.',
      keyPoints: ['S3 data lakes', 'Feature stores'],
    },
    {
      id: 'de-2',
      name: 'Data Ingestion',
      description: 'Getting data in.',
      keyPoints: ['Kinesis streaming', 'Glue batch jobs'],
    },
  ],
};

const emptyTopic: Topic = {
  id: 'sparse',
  name: 'Sparse Topic',
  description: 'A topic with no subtopics or key points.',
  weight: 5,
  order: 9,
  subtopics: [],
};

describe('buildDeepDivePrompt', () => {
  it('injects the topic name and description', () => {
    const prompt = buildDeepDivePrompt(topic);
    expect(prompt).toContain('Data Engineering');
    expect(prompt).toContain('Building and maintaining data pipelines for ML workloads.');
  });

  it('injects key points aggregated from subtopics', () => {
    const prompt = buildDeepDivePrompt(topic);
    expect(prompt).toContain('S3 data lakes');
    expect(prompt).toContain('Feature stores');
    expect(prompt).toContain('Kinesis streaming');
    expect(prompt).toContain('Glue batch jobs');
  });

  it('requests the four structured sections', () => {
    const prompt = buildDeepDivePrompt(topic).toLowerCase();
    expect(prompt).toContain('overview');
    expect(prompt).toContain('example');
    expect(prompt).toContain('real-world');
    expect(prompt).toContain('exam tip');
  });

  it('produces a valid prompt for a topic with no key points (no crash)', () => {
    const prompt = buildDeepDivePrompt(emptyTopic);
    expect(prompt).toContain('Sparse Topic');
    expect(prompt).toContain('A topic with no subtopics or key points.');
    expect(prompt.length).toBeGreaterThan(0);
  });
});

describe('generateDeepDive', () => {
  it('returns the provider markdown content on success', async () => {
    const chat = vi.fn().mockResolvedValue({
      content: '## Overview\n\nData Engineering is...',
      finishReason: 'stop',
    });
    const service = makeStubService(chat);

    const result = await generateDeepDive(topic, service);

    expect(result).toBe('## Overview\n\nData Engineering is...');
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('passes topic context into the AI call', async () => {
    const chat = vi.fn().mockResolvedValue({ content: 'ok', finishReason: 'stop' });
    const service = makeStubService(chat);

    await generateDeepDive(topic, service);

    const promptArg = chat.mock.calls[0][0] as string;
    expect(promptArg).toContain('Data Engineering');
    expect(promptArg).toContain('S3 data lakes');
  });

  it('throws an AIServiceError with code EMPTY_RESPONSE when content is blank', async () => {
    const chat = vi.fn().mockResolvedValue({ content: '   ', finishReason: 'stop' });
    const service = makeStubService(chat);

    await expect(generateDeepDive(topic, service)).rejects.toMatchObject({
      name: 'AIServiceError',
      code: 'EMPTY_RESPONSE',
    });
  });

  it('propagates an AIServiceError thrown by the service unchanged', async () => {
    const original = new AIServiceError('bad key', 'INVALID_API_KEY', 'openai');
    const chat = vi.fn().mockRejectedValue(original);
    const service = makeStubService(chat);

    await expect(generateDeepDive(topic, service)).rejects.toBe(original);
  });
});

/**
 * Tests for the Topic Deep Dive service.
 *
 * Verifies:
 * - generateDeepDive returns a parsed structured DeepDive on valid JSON.
 * - Topic context + few-shot questions are passed into the AI call.
 * - The cert-grounded system prompt (when supplied) is prepended as a
 *   system-role message; otherwise the base system prompt is used.
 * - Empty AI content surfaces an AIServiceError (EMPTY_RESPONSE).
 * - Unparseable JSON triggers a single retry, then fails without returning
 *   a corrupt object.
 * - A thrown AIServiceError from the service propagates unchanged.
 * - parseDeepDive extracts a DeepDive object defensively.
 *
 * Never hits the network — uses a lightweight stub AIService.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateDeepDive, parseDeepDive } from '../index';
import { DEEP_DIVE_SYSTEM_PROMPT } from '../prompts';
import { AIServiceError } from '@/lib/ai';
import type { AIService } from '@/lib/ai';
import type { Question, Topic } from '@/lib/types/certification';
import type { DeepDive } from '../types';

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
  ],
};

const exampleQuestion: Question = {
  id: 'q1',
  topicId: 'data-engineering',
  subtopicId: 'de-1',
  type: 'multiple-choice',
  question: 'Which service ingests streaming data?',
  difficulty: 'medium',
  options: [
    { id: 'a', text: 'Amazon Kinesis' },
    { id: 'b', text: 'Amazon Glacier' },
  ],
  correctAnswer: 'a',
  explanation: {
    correct: 'Kinesis handles streaming.',
    whyOthersWrong: { b: 'Glacier is archival.' },
  },
  metadata: {
    createdAt: '2026-01-01',
    lastReviewed: '2026-01-01',
    source: 'curated',
  },
};

const validDive: DeepDive = {
  topicId: 'data-engineering',
  sections: [{ heading: 'Overview', body: 'Data engineering is...' }],
  practiceQuestions: [
    {
      question: 'What ingests streams?',
      options: [
        { id: 'a', text: 'Kinesis' },
        { id: 'b', text: 'Glacier' },
      ],
      correctAnswer: 'a',
      explanation: 'Kinesis.',
    },
  ],
  traps: [{ trap: 'Confusing Glacier with Kinesis', why: 'Different purposes.' }],
};

describe('parseDeepDive', () => {
  it('parses a bare JSON object', () => {
    const parsed = parseDeepDive(JSON.stringify(validDive));
    expect(parsed).not.toBeNull();
    expect(parsed?.topicId).toBe('data-engineering');
    expect(parsed?.sections).toHaveLength(1);
  });

  it('parses a JSON object embedded in surrounding prose / fences', () => {
    const wrapped = '```json\n' + JSON.stringify(validDive) + '\n```';
    const parsed = parseDeepDive(wrapped);
    expect(parsed?.topicId).toBe('data-engineering');
  });

  it('returns null on non-JSON / malformed content', () => {
    expect(parseDeepDive('not json at all')).toBeNull();
    expect(parseDeepDive('{ broken')).toBeNull();
  });

  it('returns null when required arrays are missing', () => {
    expect(parseDeepDive(JSON.stringify({ topicId: 'x' }))).toBeNull();
  });
});

describe('generateDeepDive', () => {
  it('returns a parsed structured DeepDive on valid JSON', async () => {
    const chat = vi
      .fn()
      .mockResolvedValue({ content: JSON.stringify(validDive), finishReason: 'stop' });
    const service = makeStubService(chat);

    const result = await generateDeepDive(topic, service, [exampleQuestion]);

    expect(result.topicId).toBe('data-engineering');
    expect(result.sections[0].heading).toBe('Overview');
    expect(result.practiceQuestions).toHaveLength(1);
    expect(result.traps).toHaveLength(1);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('passes topic context and few-shot questions into the AI call', async () => {
    const chat = vi
      .fn()
      .mockResolvedValue({ content: JSON.stringify(validDive), finishReason: 'stop' });
    const service = makeStubService(chat);

    await generateDeepDive(topic, service, [exampleQuestion]);

    const promptArg = chat.mock.calls[0][0] as string;
    expect(promptArg).toContain('Data Engineering');
    expect(promptArg).toContain('S3 data lakes');
    expect(promptArg).toContain('Which service ingests streaming data?');
  });

  it('prepends the base system prompt when no cert prompt is supplied', async () => {
    const chat = vi
      .fn()
      .mockResolvedValue({ content: JSON.stringify(validDive), finishReason: 'stop' });
    const service = makeStubService(chat);

    await generateDeepDive(topic, service, []);

    const history = chat.mock.calls[0][1] as Array<{ role: string; content: string }>;
    expect(history[0].role).toBe('system');
    expect(history[0].content).toContain(DEEP_DIVE_SYSTEM_PROMPT);
  });

  it('prepends the supplied cert-grounded system prompt', async () => {
    const chat = vi
      .fn()
      .mockResolvedValue({ content: JSON.stringify(validDive), finishReason: 'stop' });
    const service = makeStubService(chat);

    await generateDeepDive(topic, service, [], 'CERT GROUNDED PROMPT');

    const history = chat.mock.calls[0][1] as Array<{ role: string; content: string }>;
    expect(history[0].role).toBe('system');
    expect(history[0].content).toBe('CERT GROUNDED PROMPT');
  });

  it('throws AIServiceError EMPTY_RESPONSE when content is blank', async () => {
    const chat = vi.fn().mockResolvedValue({ content: '   ', finishReason: 'stop' });
    const service = makeStubService(chat);

    await expect(generateDeepDive(topic, service, [])).rejects.toMatchObject({
      name: 'AIServiceError',
      code: 'EMPTY_RESPONSE',
    });
  });

  it('retries once on unparseable JSON, then succeeds', async () => {
    const chat = vi
      .fn()
      .mockResolvedValueOnce({ content: 'sorry, here is prose', finishReason: 'stop' })
      .mockResolvedValueOnce({ content: JSON.stringify(validDive), finishReason: 'stop' });
    const service = makeStubService(chat);

    const result = await generateDeepDive(topic, service, []);

    expect(result.topicId).toBe('data-engineering');
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('throws (no corrupt object) when JSON stays unparseable after retry', async () => {
    const chat = vi.fn().mockResolvedValue({ content: 'never json', finishReason: 'stop' });
    const service = makeStubService(chat);

    await expect(generateDeepDive(topic, service, [])).rejects.toBeInstanceOf(
      AIServiceError
    );
    expect(chat).toHaveBeenCalledTimes(2);
  });

  it('propagates an AIServiceError thrown by the service unchanged', async () => {
    const original = new AIServiceError('bad key', 'INVALID_API_KEY', 'openai');
    const chat = vi.fn().mockRejectedValue(original);
    const service = makeStubService(chat);

    await expect(generateDeepDive(topic, service, [])).rejects.toBe(original);
  });
});

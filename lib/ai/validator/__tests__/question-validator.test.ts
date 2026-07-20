/**
 * Tests for QuestionValidator.
 */

import { describe, it, expect } from 'vitest';
import { QuestionValidator } from '../question-validator';
import { DEFAULT_VALIDATOR_THRESHOLDS } from '../types';
import { AIServiceError } from '@/lib/ai/types';
import {
  CannedJsonProvider,
  makeServiceWithProvider,
  cannedResponse,
  dataEngTopic,
  ingestionSubtopic,
  goodQuestion,
  borderlineQuestion,
  badQuestion,
  goodResponse,
  borderlineResponse,
  badResponse,
  topicsData,
} from './fixtures';
import type { Question } from '@/lib/types/certification';

describe('QuestionValidator.validate', () => {
  it('returns a ValidationResult echoing the question id', async () => {
    const provider = new CannedJsonProvider([cannedResponse({})]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.questionId).toBe(goodQuestion.id);
    expect(typeof result.reasoning).toBe('string');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('approves when overall >= 8 AND confidence >= 0.85', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('approved');
    expect(result.score.overall).toBe(9);
    expect(result.confidence).toBe(0.9);
  });

  it('flags a high-overall but low-confidence question', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.5 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('flagged');
  });

  it('flags a mid-band overall score', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 7, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('flagged');
  });

  it('rejects when overall < 5', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 4, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('rejected');
  });

  it('flags (keeps) a borderline score at the reject boundary', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 5, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    // 5.0 is no longer below the reject bar, so it is kept as 'flagged'.
    expect(result.verdict).toBe('flagged');
  });

  it('honours custom thresholds', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 7, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(
      makeServiceWithProvider(provider),
      { approveOverall: 7, approveConfidence: 0.8, rejectOverall: 5 }
    );

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('approved');
  });

  it('clamps out-of-range scores into 0-10 and confidence into 0-1', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({
        clarity: 12,
        topicAlignment: -3,
        correctness: 10,
        difficulty: 5,
        overall: 99,
        confidence: 2,
      }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.score.clarity).toBe(10);
    expect(result.score.topicAlignment).toBe(0);
    expect(result.score.overall).toBeLessThanOrEqual(10);
    expect(result.confidence).toBe(1);
  });

  it('parses JSON wrapped in markdown code fences', async () => {
    const json = cannedResponse({ overall: 9, confidence: 0.9 });
    const provider = new CannedJsonProvider([
      'Here is my review:\n```json\n' + json + '\n```\nThanks!',
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('approved');
  });

  it('retries once on malformed JSON then succeeds', async () => {
    const provider = new CannedJsonProvider([
      'not json at all',
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(provider.calls).toBe(2);
    expect(result.verdict).toBe('approved');
  });

  it('returns a flagged error verdict when JSON is still malformed after retry', async () => {
    const provider = new CannedJsonProvider(['nope', 'still nope']);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(provider.calls).toBe(2);
    expect(result.verdict).toBe('flagged');
    expect(result.confidence).toBe(0);
    expect(result.score.overall).toBe(0);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.questionId).toBe(goodQuestion.id);
  });

  it('treats partial scores (missing fields) as malformed and retries', async () => {
    const provider = new CannedJsonProvider([
      JSON.stringify({ clarity: 9, confidence: 0.9 }),
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(provider.calls).toBe(2);
    expect(result.verdict).toBe('approved');
  });

  it('returns a flagged error verdict when the AI service throws', async () => {
    const provider = new CannedJsonProvider([
      new AIServiceError('rate limited', 'RATE_LIMIT', 'canned'),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('flagged');
    expect(result.confidence).toBe(0);
    expect(result.issues.join(' ')).toMatch(/rate limited|error/i);
  });

  it('uses subtopic context when provided without crashing', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(
      goodQuestion,
      dataEngTopic,
      ingestionSubtopic
    );

    expect(result.verdict).toBe('approved');
  });

  it('returns a flagged error verdict when the AI returns empty content', async () => {
    const provider = new CannedJsonProvider(['', '']);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('flagged');
    expect(result.confidence).toBe(0);
  });

  it('returns a flagged error verdict when content has no JSON object', async () => {
    const provider = new CannedJsonProvider([
      'just prose, no braces',
      'still none',
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const result = await validator.validate(goodQuestion, dataEngTopic);

    expect(result.verdict).toBe('flagged');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('exposes the default thresholds', () => {
    expect(DEFAULT_VALIDATOR_THRESHOLDS.approveOverall).toBe(8.0);
    expect(DEFAULT_VALIDATOR_THRESHOLDS.approveConfidence).toBe(0.85);
    expect(DEFAULT_VALIDATOR_THRESHOLDS.rejectOverall).toBe(5.0);
  });
});

describe('QuestionValidator.validateBatch', () => {
  function makeQ(id: string): Question {
    return { ...goodQuestion, id };
  }

  it('returns [] for an empty list', async () => {
    const provider = new CannedJsonProvider([cannedResponse({})]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateBatch([], topicsData);

    expect(results).toEqual([]);
    expect(provider.calls).toBe(0);
  });

  it('preserves input order', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const questions = [makeQ('q1'), makeQ('q2'), makeQ('q3')];
    const results = await validator.validateBatch(questions, topicsData);

    expect(results.map((r) => r.questionId)).toEqual(['q1', 'q2', 'q3']);
  });

  it('respects the default concurrency limit of 3', async () => {
    const provider = new CannedJsonProvider(
      [cannedResponse({ overall: 9, confidence: 0.9 })],
      20
    );
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const questions = Array.from({ length: 8 }, (_, i) => makeQ(`q${i}`));
    await validator.validateBatch(questions, topicsData);

    expect(provider.maxInFlight).toBeLessThanOrEqual(3);
    expect(provider.maxInFlight).toBeGreaterThan(1);
  });

  it('honours a custom concurrency limit', async () => {
    const provider = new CannedJsonProvider(
      [cannedResponse({ overall: 9, confidence: 0.9 })],
      20
    );
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const questions = Array.from({ length: 6 }, (_, i) => makeQ(`q${i}`));
    await validator.validateBatch(questions, topicsData, 1);

    expect(provider.maxInFlight).toBe(1);
  });

  it('produces a flagged error verdict for a question whose topic is missing', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const orphan: Question = { ...goodQuestion, id: 'orphan', topicId: 'nope' };
    const questions = [makeQ('q1'), orphan];
    const results = await validator.validateBatch(questions, topicsData);

    expect(results).toHaveLength(2);
    const orphanResult = results.find((r) => r.questionId === 'orphan');
    expect(orphanResult?.verdict).toBe('flagged');
    expect(orphanResult?.issues.join(' ')).toMatch(/topic/i);
    // The valid question still resolves normally.
    expect(results.find((r) => r.questionId === 'q1')?.verdict).toBe(
      'approved'
    );
  });

  it('isolates a per-question AI failure without rejecting the batch', async () => {
    // First call throws, subsequent calls succeed. With concurrency 1 the
    // first question fails and the rest still validate.
    const provider = new CannedJsonProvider(
      [
        new Error('boom'),
        cannedResponse({ overall: 9, confidence: 0.9 }),
      ],
      0
    );
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateBatch(
      [makeQ('a'), makeQ('b')],
      topicsData,
      1
    );

    expect(results).toHaveLength(2);
    expect(results[0].verdict).toBe('flagged');
    expect(results[1].verdict).toBe('approved');
  });

  it('resolves the subtopic from topic data when available', async () => {
    const provider = new CannedJsonProvider([
      cannedResponse({ overall: 9, confidence: 0.9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const q = { ...goodQuestion, subtopicId: ingestionSubtopic.id };
    const results = await validator.validateBatch([q], topicsData);

    expect(results[0].verdict).toBe('approved');
  });
});

describe('QuestionValidator fixture verdicts', () => {
  const cases: Array<{
    name: string;
    question: Question;
    response: string;
    expected: 'approved' | 'flagged' | 'rejected';
  }> = [
    {
      name: 'good',
      question: goodQuestion,
      response: goodResponse,
      expected: 'approved',
    },
    {
      name: 'borderline',
      question: borderlineQuestion,
      response: borderlineResponse,
      expected: 'flagged',
    },
    {
      name: 'bad',
      question: badQuestion,
      response: badResponse,
      expected: 'rejected',
    },
  ];

  for (const c of cases) {
    it(`maps the ${c.name} fixture to ${c.expected}`, async () => {
      const provider = new CannedJsonProvider([c.response]);
      const validator = new QuestionValidator(
        makeServiceWithProvider(provider)
      );

      const result = await validator.validate(c.question, dataEngTopic);

      expect(result.verdict).toBe(c.expected);
    });
  }

  it('classifies the whole fixture set correctly in a single batch', async () => {
    // Each question gets the same canned response slot; use a provider that
    // returns the matching response per call order.
    const provider = new CannedJsonProvider([
      goodResponse,
      borderlineResponse,
      badResponse,
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateBatch(
      [
        { ...goodQuestion, id: 'g' },
        { ...borderlineQuestion, id: 'bl' },
        { ...badQuestion, id: 'bd' },
      ],
      topicsData,
      1
    );

    expect(results.map((r) => r.verdict)).toEqual([
      'approved',
      'flagged',
      'rejected',
    ]);
  });
});

describe('QuestionValidator.validateMany (single-call batch)', () => {
  const batchArray = (
    entries: Array<{ index: number; overall: number; confidence?: number }>
  ): string =>
    JSON.stringify(
      entries.map((e) => ({
        index: e.index,
        clarity: e.overall,
        topicAlignment: e.overall,
        correctness: e.overall,
        difficulty: e.overall,
        overall: e.overall,
        confidence: e.confidence ?? 0.9,
        reasoning: 'ok',
        issues: [],
      }))
    );

  it('scores all questions in ONE model call and returns verdicts in order', async () => {
    const provider = new CannedJsonProvider([
      batchArray([
        { index: 0, overall: 9 },
        { index: 1, overall: 7 },
        { index: 2, overall: 3 },
      ]),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateMany(
      [
        { ...goodQuestion, id: 'g' },
        { ...borderlineQuestion, id: 'bl' },
        { ...badQuestion, id: 'bd' },
      ],
      dataEngTopic,
      ingestionSubtopic
    );

    // Exactly one AI call for the whole batch.
    expect(provider.calls).toBe(1);
    expect(results.map((r) => r.questionId)).toEqual(['g', 'bl', 'bd']);
    expect(results.map((r) => r.verdict)).toEqual([
      'approved',
      'flagged',
      'rejected',
    ]);
  });

  it('falls back to per-question validation when the batch response is unusable', async () => {
    // First (batch) call returns junk; then per-question calls return good JSON.
    const provider = new CannedJsonProvider([
      'not json at all',
      cannedResponse({ overall: 9 }),
      cannedResponse({ overall: 9 }),
    ]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateMany(
      [
        { ...goodQuestion, id: 'g' },
        { ...goodQuestion, id: 'g2' },
      ],
      dataEngTopic
    );

    expect(results.map((r) => r.questionId)).toEqual(['g', 'g2']);
    expect(results.every((r) => r.verdict === 'approved')).toBe(true);
  });

  it('returns an empty array for no questions without calling the model', async () => {
    const provider = new CannedJsonProvider([cannedResponse({})]);
    const validator = new QuestionValidator(makeServiceWithProvider(provider));

    const results = await validator.validateMany([], dataEngTopic);
    expect(results).toEqual([]);
    expect(provider.calls).toBe(0);
  });
});

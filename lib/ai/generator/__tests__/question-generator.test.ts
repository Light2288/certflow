/**
 * Tests for QuestionGenerator (generate, mix, near-duplicate dedup).
 */

import { describe, it, expect } from 'vitest';
import { QuestionGenerator } from '../question-generator';
import { QuestionValidator } from '@/lib/ai/validator';
import type { Question } from '@/lib/types/certification';
import type { GenerationRequest } from '../types';
import { AIServiceError } from '@/lib/ai/types';
import {
  RoutingProvider,
  makeServiceWithProvider,
  candidate,
  candidateArray,
  genTopic,
  genSubtopic,
} from './fixtures';

function makeGenerator(provider: RoutingProvider): QuestionGenerator {
  const service = makeServiceWithProvider(provider);
  const validator = new QuestionValidator(service);
  return new QuestionGenerator(service, validator);
}

function makeRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    topic: genTopic,
    subtopic: genSubtopic,
    difficulty: 'medium',
    count: 2,
    existingQuestionIds: [],
    ...overrides,
  };
}

/** Distinct candidates so the near-duplicate heuristic does not drop them. */
function distinctCandidates(n: number): Array<Record<string, unknown>> {
  const stems = [
    'Which AWS service is best for real-time streaming ingestion?',
    'What is the primary purpose of feature scaling in a model?',
    'Which storage class minimizes cost for rarely accessed data?',
    'How do you trigger an AWS Glue job on a schedule?',
    'Which metric best evaluates an imbalanced classification model?',
  ];
  return Array.from({ length: n }, (_, i) =>
    candidate({ question: stems[i % stems.length] })
  );
}

describe('QuestionGenerator.generate', () => {
  it('returns generated questions stamped with gen_ ids and ai-generated source', async () => {
    const provider = new RoutingProvider({
      generationResponse: candidateArray(distinctCandidates(2)),
      verdicts: ['approved', 'approved'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 2 }));

    expect(result.generated).toHaveLength(2);
    for (const q of result.generated) {
      expect(q.id).toMatch(/^gen_\d+_\d+$/);
      expect(q.metadata.source).toBe('ai-generated');
      expect(q.metadata.createdAt).toBeTruthy();
      expect(q.generationMeta).toBeDefined();
      expect(q.generationMeta?.validatorScore).toBeDefined();
    }
  });

  it('honours the requested difficulty and topic on generated questions', async () => {
    const provider = new RoutingProvider({
      generationResponse: candidateArray(distinctCandidates(2)),
      verdicts: ['approved', 'approved'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 2, difficulty: 'hard' }));

    for (const q of result.generated) {
      expect(q.difficulty).toBe('hard');
      expect(q.topicId).toBe('data-eng');
    }
  });

  it('keeps approved and flagged, drops rejected, and reports stats', async () => {
    const provider = new RoutingProvider({
      generationResponse: candidateArray(distinctCandidates(3)),
      verdicts: ['approved', 'flagged', 'rejected'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 3 }));

    expect(result.generated).toHaveLength(2);
    expect(result.stats.requested).toBe(3);
    expect(result.stats.produced).toBe(3);
    expect(result.stats.approved).toBe(1);
    expect(result.stats.flagged).toBe(1);
    expect(result.stats.rejected).toBe(1);

    const verdicts = result.generated.map((q) => q.generationMeta?.verdict).sort();
    expect(verdicts).toEqual(['approved', 'flagged']);
  });

  it('records a malformed candidate in rejected and continues', async () => {
    // One valid candidate plus one schema-invalid object (missing options etc.)
    const raw = JSON.stringify([
      candidate({ question: 'A perfectly valid streaming question?' }),
      { topicId: 'data-eng', question: 'broken' },
    ]);
    const provider = new RoutingProvider({
      generationResponse: raw,
      verdicts: ['approved'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 2 }));

    expect(result.generated).toHaveLength(1);
    expect(result.rejected.length).toBeGreaterThanOrEqual(1);
    expect(result.stats.rejected).toBeGreaterThanOrEqual(1);
  });

  it('returns an empty result with error populated on total AI failure', async () => {
    const provider = new RoutingProvider({
      generationResponse: new AIServiceError('No key', 'MISSING_API_KEY', 'routing'),
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 3 }));

    expect(result.generated).toEqual([]);
    expect(result.stats.requested).toBe(3);
    expect(result.stats.produced).toBe(0);
    expect(result.error).toBeInstanceOf(AIServiceError);
    expect(result.error?.code).toBe('MISSING_API_KEY');
  });

  it('drops candidates whose id collides with existingQuestionIds', async () => {
    // Candidate carries an explicit id that is in existingQuestionIds.
    const raw = JSON.stringify([
      candidate({ id: 'q001', question: 'Existing collision question?' }),
      candidate({ question: 'A fresh distinct question about Glue scheduling?' }),
    ]);
    const provider = new RoutingProvider({
      generationResponse: raw,
      verdicts: ['approved', 'approved'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(
      makeRequest({ count: 2, existingQuestionIds: ['q001'] })
    );

    // The colliding candidate is dropped; only the fresh one survives.
    expect(result.generated).toHaveLength(1);
    expect(result.generated[0].question).toContain('Glue scheduling');
  });

  it('drops near-duplicate candidates within a batch', async () => {
    const raw = JSON.stringify([
      candidate({ question: 'Which AWS service is best for real-time streaming ingestion?' }),
      candidate({ question: 'which aws service is BEST for real-time streaming ingestion??' }),
    ]);
    const provider = new RoutingProvider({
      generationResponse: raw,
      verdicts: ['approved', 'approved'],
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 2 }));

    expect(result.generated).toHaveLength(1);
  });

  it('handles non-array JSON output by returning no generated questions', async () => {
    const provider = new RoutingProvider({
      generationResponse: JSON.stringify({ not: 'an array' }),
    });
    const gen = makeGenerator(provider);

    const result = await gen.generate(makeRequest({ count: 2 }));

    expect(result.generated).toEqual([]);
    expect(result.rejected.length).toBeGreaterThanOrEqual(1);
  });
});

describe('QuestionGenerator.mix', () => {
  const gen = makeGenerator(
    new RoutingProvider({ generationResponse: '[]' })
  );

  function seedQ(id: string): Question {
    return {
      id,
      topicId: 'data-eng',
      subtopicId: 'ingestion',
      type: 'multiple-choice',
      difficulty: 'medium',
      question: `Seed ${id}`,
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      correctAnswer: 'a',
      explanation: { correct: 'A', whyOthersWrong: { b: 'no' } },
      metadata: { createdAt: '2026-01-01', lastReviewed: '2026-01-01', source: 'curated' },
    };
  }
  function genQ(id: string): Question {
    return { ...seedQ(id), question: `Gen ${id}`, metadata: { ...seedQ(id).metadata, source: 'ai-generated' } };
  }

  it('produces an exact 30/70 split when both pools are large enough', () => {
    // Output size = seed + generated = 40. For an exact 30/70 split with no
    // clamping, the pools must each be large enough: 30% of 40 = 12 curated
    // (seed has 12) and 70% = 28 generated (generated has 28).
    const seed = Array.from({ length: 12 }, (_, i) => seedQ(`s${i}`));
    const generated = Array.from({ length: 28 }, (_, i) => genQ(`g${i}`));

    const mixed = gen.mix(seed, generated, 0.3);

    const curatedCount = mixed.filter((q) => q.metadata.source === 'curated').length;
    const generatedCount = mixed.filter((q) => q.metadata.source === 'ai-generated').length;
    expect(mixed).toHaveLength(40);
    expect(curatedCount).toBe(12);
    expect(generatedCount).toBe(28);
  });

  it('returns only generated when seed is empty', () => {
    const generated = [genQ('g0'), genQ('g1')];
    const mixed = gen.mix([], generated, 0.3);
    expect(mixed).toHaveLength(2);
    expect(mixed.every((q) => q.metadata.source === 'ai-generated')).toBe(true);
  });

  it('returns only seed when generated is empty', () => {
    const seed = [seedQ('s0'), seedQ('s1')];
    const mixed = gen.mix(seed, [], 0.3);
    expect(mixed).toHaveLength(2);
    expect(mixed.every((q) => q.metadata.source === 'curated')).toBe(true);
  });

  it('returns an empty array when both pools are empty', () => {
    expect(gen.mix([], [], 0.3)).toEqual([]);
  });

  it('is deterministic for a fixed seed and varies for a different seed', () => {
    const seed = Array.from({ length: 5 }, (_, i) => seedQ(`s${i}`));
    const generated = Array.from({ length: 5 }, (_, i) => genQ(`g${i}`));

    const a = gen.mix(seed, generated, 0.3, 'session-1').map((q) => q.id);
    const b = gen.mix(seed, generated, 0.3, 'session-1').map((q) => q.id);
    const c = gen.mix(seed, generated, 0.3, 'session-2').map((q) => q.id);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

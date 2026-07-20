/**
 * Tests for the useQuestionPool hook (Phase 10 - AI-Enhanced Simulator).
 *
 * The hook bridges the certification loader and the Phase 9 QuestionGenerator:
 * it filters the curated pool, and — when augmentation is requested and the
 * curated pool is too small — generates + validates extra questions and blends
 * them via mix(). It must never hit a real network (mock provider path) and
 * must degrade gracefully on generation failure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuestionPool } from '../use-question-pool';
import type { CertificationData, Question } from '@/lib/types/certification';
import type { AISettings } from '@/lib/types/ai-settings';
import type { GenerationResult } from '@/lib/ai/generator';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeQuestion(id: string, topicId = 'data-eng', difficulty: Question['difficulty'] = 'medium'): Question {
  return {
    id,
    topicId,
    subtopicId: 'ingestion',
    type: 'multiple-choice',
    difficulty,
    question: `Curated question ${id}?`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    correctAnswer: 'a',
    explanation: { correct: 'A', whyOthersWrong: { b: 'no' } },
    metadata: { createdAt: '2026-01-01', lastReviewed: '2026-01-01', source: 'curated' },
  };
}

function makeCertData(questionCount: number): CertificationData {
  return {
    config: {
      id: 'aws-ml',
      name: 'AWS ML',
      code: 'MLS-C01',
      version: '1.0',
      description: 'x',
      provider: 'AWS',
      examDetails: { duration: 180, questionCount: 65, passingScore: 750, scoreRange: { min: 100, max: 1000 } },
      metadata: { lastUpdated: '2026-01-01', difficulty: 'advanced' },
    },
    topics: {
      topics: [
        {
          id: 'data-eng',
          name: 'Data Engineering',
          description: 'x',
          weight: 20,
          order: 1,
          subtopics: [{ id: 'ingestion', name: 'Ingestion', description: 'x', keyPoints: ['Kinesis'] }],
        },
      ],
    },
    questions: {
      questions: Array.from({ length: questionCount }, (_, i) => makeQuestion(`q${i}`)),
    },
  };
}

const mockSettings: AISettings = { provider: 'mock', temperature: 0.7, maxTokens: 2000 };
const openAiSettings: AISettings = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4' };

// ---------------------------------------------------------------------------
// Mock the QuestionGenerator (for mix) and the server-API generation helper.
// Tests never hit a network.
// ---------------------------------------------------------------------------

const generateMock = vi.fn();
const mixMock = vi.fn();

vi.mock('@/lib/ai/generator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/generator')>();
  return {
    ...actual,
    QuestionGenerator: class {
      generate = generateMock;
      mix = mixMock;
    },
  };
});

// Generation is routed through the server API; mock the client helper so it
// resolves with the same canned GenerationResults the tests build.
vi.mock('@/lib/quiz/generate-questions-client', () => ({
  generateQuestionsViaApi: (...args: unknown[]) => generateMock(...args),
}));

function makeGenerated(id: string): Question {
  return {
    ...makeQuestion(id),
    question: `Generated question ${id}?`,
    metadata: { createdAt: '2026-01-02', lastReviewed: '2026-01-02', source: 'ai-generated' },
  };
}

function genResult(generated: Question[], overrides: Partial<GenerationResult> = {}): GenerationResult {
  return {
    generated,
    rejected: [],
    stats: {
      requested: generated.length,
      produced: generated.length,
      approved: generated.length,
      flagged: 0,
      rejected: 0,
    },
    ...overrides,
  };
}

describe('useQuestionPool', () => {
  beforeEach(() => {
    generateMock.mockReset();
    mixMock.mockReset();
    // Default mix: concatenate curated + generated for predictability.
    mixMock.mockImplementation((seed: Question[], generated: Question[]) => [...seed, ...generated]);
  });

  it('returns curated questions without generating when augment is off', async () => {
    const data = makeCertData(15);
    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: mockSettings,
        augment: false,
      })
    );

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.questions).toHaveLength(10);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('tops up generation across multiple calls to reach the AI target', async () => {
    // Each generate() call returns only 10 questions, but the target needs more,
    // so the hook must call generate() repeatedly and accumulate unique AI Qs.
    const data = makeCertData(65);
    let batch = 0;
    generateMock.mockImplementation(() => {
      const start = batch * 10;
      batch += 1;
      const qs = Array.from({ length: 10 }, (_, i) => makeGenerated(`g${start + i}`));
      return Promise.resolve(genResult(qs));
    });
    // Real-ish blend so AI questions actually land in the final pool.
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 65,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 75,
        seed: 'seed-topup',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // aiTarget = round(65 * 0.75) = 49; at 10 per call it needs >= 5 calls.
    expect(generateMock.mock.calls.length).toBeGreaterThanOrEqual(5);
    const aiCount = result.current.questions.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;
    expect(aiCount).toBeGreaterThanOrEqual(45);
  });

  it('dispatches multiple generation calls concurrently (parallel waves)', async () => {
    // Track how many generate() calls are in flight at once. The hook should
    // run a wave of parallel requests rather than strictly one-at-a-time.
    const data = makeCertData(65);
    let inFlight = 0;
    let maxInFlight = 0;
    let n = 0;
    generateMock.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight -= 1;
      const id = n;
      n += 1;
      return genResult([makeGenerated(`w${id}`)]);
    });
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 20,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-parallel',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // At least 2 requests were in flight simultaneously (parallel waves).
    expect(maxInFlight).toBeGreaterThanOrEqual(2);
  });

  it('caps each generation call to a reliable batch size', async () => {
    // Even for a large AI target, no single call should request an unbounded
    // count — big single requests are slow and error-prone for real providers.
    const data = makeCertData(65);
    let n = 0;
    generateMock.mockImplementation((request: GenerationRequest) => {
      const qs = Array.from({ length: request.count }, (_, i) =>
        makeGenerated(`b${n}_${i}`)
      );
      n += 1;
      return Promise.resolve(genResult(qs));
    });
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 65,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-batch',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // Every call must request a bounded batch (<= 5) so the model's JSON output
    // fits the default token limit, never the full 65.
    for (const call of generateMock.mock.calls) {
      expect(call[0].count).toBeLessThanOrEqual(5);
    }
    // And it should still take multiple calls to reach the target.
    expect(generateMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('tolerates an occasional empty batch instead of giving up immediately', async () => {
    // A provider hiccup (a batch with no usable questions) must not abandon the
    // whole run; the loop should keep trying and still reach the target.
    const data = makeCertData(65);
    let call = 0;
    generateMock.mockImplementation((request: GenerationRequest) => {
      call += 1;
      // Every 2nd call returns an empty batch (bad JSON / all duplicates).
      if (call % 2 === 0) {
        return Promise.resolve(genResult([]));
      }
      const qs = Array.from({ length: request.count }, (_, i) =>
        makeGenerated(`t${call}_${i}`)
      );
      return Promise.resolve(genResult(qs));
    });
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 20,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-empty',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    const aiCount = result.current.questions.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;
    // Despite alternating empty batches, it should still reach the target.
    expect(aiCount).toBeGreaterThanOrEqual(18);
  });

  it('stops quickly after a wave that adds no new questions (no token waste)', async () => {
    // First wave yields some questions; every wave after adds nothing new.
    const data = makeCertData(65);
    let wave = 0;
    generateMock.mockImplementation(() => {
      wave += 1;
      // Only the very first call returns a question; the rest are empty.
      if (wave === 1) {
        return Promise.resolve(genResult([makeGenerated('only-one')]));
      }
      return Promise.resolve(genResult([]));
    });
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 20,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-stop',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // Wave 1 (3 calls) makes progress; wave 2 (3 calls) adds nothing and stops.
    // So no more than ~2 waves worth of calls are made.
    expect(generateMock.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('stops immediately when the first wave produces zero candidates', async () => {
    // The model returns no parseable candidates at all (produced 0). Retrying
    // wastes tokens, so the loop should give up after the first wave.
    const data = makeCertData(65);
    generateMock.mockResolvedValue(
      genResult([], {
        stats: { requested: 10, produced: 0, approved: 0, flagged: 0, rejected: 0, tokensUsed: 100 },
      })
    );
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 20,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-zero',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // Only the first wave (<= concurrency 3 calls) ran; it did not keep retrying.
    expect(generateMock.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('exposes live cumulative generation progress', async () => {
    const data = makeCertData(65);
    generateMock.mockImplementation((request: GenerationRequest) =>
      Promise.resolve(
        genResult(
          Array.from({ length: request.count }, (_, i) =>
            makeGenerated(`p${Math.random()}_${i}`)
          )
        )
      )
    );
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 30,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 100,
        seed: 'seed-progress',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    const progress = result.current.generationProgress;
    expect(progress).not.toBeNull();
    expect(progress?.target).toBe(30);
    expect(progress?.kept).toBeGreaterThanOrEqual(28);
    expect(progress?.batches).toBeGreaterThan(1);
  });

  it('keeps the highest-scored AI questions when more are generated than needed', async () => {
    // 8 generated questions with distinct validator scores; only 3 are needed.
    const data = makeCertData(65);
    const scored = [3, 9, 5, 10, 4, 8, 6, 7].map((overall, i) => {
      const q = makeGenerated(`s${i}`) as Question & {
        generationMeta?: {
          verdict: string;
          validatorScore: { overall: number };
          confidence: number;
        };
      };
      q.generationMeta = {
        verdict: 'approved',
        validatorScore: { overall } as { overall: number },
        confidence: 0.9,
      };
      return q as Question;
    });
    generateMock.mockResolvedValue(genResult(scored));
    // Pass-through blend so we can read exactly which AI questions were chosen.
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 30, // aiTarget = 3
        seed: 'seed-topscore',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    const scores = result.current.questions
      .filter((q) => q.metadata.source === 'ai-generated')
      .map(
        (q) =>
          (q as { generationMeta?: { validatorScore: { overall: number } } })
            .generationMeta?.validatorScore.overall
      )
      .filter((n): n is number => typeof n === 'number');
    // The 3 kept AI questions must be the three highest scores: 10, 9, 8.
    expect(scores.length).toBe(3);
    expect([...scores].sort((a, b) => b - a)).toEqual([10, 9, 8]);
  });

  it('includes the target share of AI-generated questions in the final pool', async () => {
    // Large curated pool that already satisfies the count, so the only way to
    // see AI questions is the target-% honoring the blend precisely.
    const data = makeCertData(65);
    const generated = Array.from({ length: 20 }, (_, i) => makeGenerated(`g${i}`));
    generateMock.mockResolvedValue(genResult(generated));
    // Use the real blend so this test exercises the actual mixing math.
    mixMock.mockImplementation((seed: Question[], gen: Question[], ratio = 0.3) => {
      const total = seed.length + gen.length;
      let curatedTarget = Math.min(Math.round(total * ratio), seed.length);
      let generatedTarget = total - curatedTarget;
      if (generatedTarget > gen.length) {
        generatedTarget = gen.length;
        curatedTarget = total - generatedTarget;
      }
      return [...seed.slice(0, curatedTarget), ...gen.slice(0, generatedTarget)];
    });

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 30,
        seed: 'seed-mix',
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    const finalPool = result.current.questions;
    expect(finalPool).toHaveLength(50);
    const aiCount = finalPool.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;
    // ~30% of 50 ≈ 15 AI questions (allow a small rounding tolerance).
    expect(aiCount).toBeGreaterThanOrEqual(13);
    expect(aiCount).toBeLessThanOrEqual(17);
  });

  it('does not generate when augmenting with a 0% AI target and a sufficient pool', async () => {
    const data = makeCertData(20);
    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 0,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.questions).toHaveLength(10);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it('generates to reach the AI target even when the curated pool is sufficient', async () => {
    const data = makeCertData(20);
    const generated = Array.from({ length: 3 }, (_, i) => makeGenerated(`g${i}`));
    generateMock.mockResolvedValue(genResult(generated));

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 30,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    // Even though 20 curated >= 10 requested, a 30% AI target requests ~3 AI questions.
    expect(generateMock).toHaveBeenCalled();
    expect(generateMock.mock.calls[0][0].count).toBe(3);
    expect(result.current.questions).toHaveLength(10);
    const aiCount = result.current.questions.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;
    expect(aiCount).toBe(3);
  });

  it('generates to fill the gap and applies mix when augmenting a short pool', async () => {
    const data = makeCertData(15);
    const generated = Array.from({ length: 35 }, (_, i) => makeGenerated(`g${i}`));
    generateMock.mockResolvedValue(genResult(generated));

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(generateMock).toHaveBeenCalled();
    // Each call requests a bounded batch (min(gap 35, batch 5) = 5).
    expect(generateMock.mock.calls[0][0].count).toBe(5);
    expect(mixMock).toHaveBeenCalled();
    // mix() blends curated + generated; final pool capped at requestedCount.
    expect(result.current.questions).toHaveLength(50);
    const aiCount = result.current.questions.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;
    expect(aiCount).toBeGreaterThanOrEqual(35);
  });

  it('passes existing curated ids to the generator for de-duplication', async () => {
    const data = makeCertData(15);
    generateMock.mockResolvedValue(genResult([makeGenerated('g0')]));

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 20,
        aiSettings: openAiSettings,
        augment: true,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    const passedIds = generateMock.mock.calls[0][0].existingQuestionIds;
    expect(passedIds).toContain('q0');
    expect(passedIds.length).toBe(15);
  });

  it('falls back to curated questions and surfaces an error on generation failure', async () => {
    const data = makeCertData(15);
    const aiError = Object.assign(new Error('No key'), { code: 'MISSING_API_KEY', name: 'AIServiceError' });
    generateMock.mockResolvedValue(
      genResult([], { error: aiError as unknown as GenerationResult['error'], stats: { requested: 35, produced: 0, approved: 0, flagged: 0, rejected: 0 } })
    );

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.error).toBeTruthy();
    // Falls back to the 15 curated questions rather than crashing.
    expect(result.current.questions).toHaveLength(15);
  });

  it('build() resolves with the error and a zero AI count on generation failure', async () => {
    const data = makeCertData(15);
    const aiError = Object.assign(new Error('No key'), {
      code: 'MISSING_API_KEY',
      name: 'AIServiceError',
    });
    generateMock.mockResolvedValue(
      genResult([], {
        error: aiError as unknown as GenerationResult['error'],
        stats: { requested: 35, produced: 0, approved: 0, flagged: 0, rejected: 0 },
      })
    );

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 80,
      })
    );

    let outcome: Awaited<ReturnType<typeof result.current.build>> | undefined;
    await act(async () => {
      outcome = await result.current.build();
    });

    expect(outcome?.error).toBeTruthy();
    expect(outcome?.aiCount).toBe(0);
  });

  it('build() reports the AI count in the returned result', async () => {
    const data = makeCertData(65);
    const generated = Array.from({ length: 20 }, (_, i) => makeGenerated(`g${i}`));
    generateMock.mockResolvedValue(genResult(generated));
    mixMock.mockImplementation((seed: Question[], gen: Question[]) => [...gen, ...seed]);

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
        targetAiPercent: 30,
        seed: 'seed-aicount',
      })
    );

    let outcome: Awaited<ReturnType<typeof result.current.build>> | undefined;
    await act(async () => {
      outcome = await result.current.build();
    });

    expect(outcome?.error).toBeNull();
    // ~30% of 50 ≈ 15 AI questions.
    expect(outcome?.aiCount).toBeGreaterThanOrEqual(13);
    expect(outcome?.aiCount).toBeLessThanOrEqual(17);
  });

  it('filters the curated pool by topic and difficulty', async () => {
    const data = makeCertData(0);
    data.questions.questions = [
      makeQuestion('e1', 'data-eng', 'easy'),
      makeQuestion('m1', 'data-eng', 'medium'),
      makeQuestion('m2', 'modeling', 'medium'),
    ];

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'data-eng',
        difficulty: 'medium',
        requestedCount: 10,
        aiSettings: mockSettings,
        augment: false,
      })
    );

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0].id).toBe('m1');
  });

  it('settles to the curated pool when cancelled', async () => {
    const data = makeCertData(15);
    // generate never resolves until we cancel.
    generateMock.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
      })
    );

    act(() => {
      void result.current.build();
    });

    act(() => {
      result.current.cancel();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.questions).toHaveLength(15);
  });

  it('produces a deterministic curated selection for the same seed', async () => {
    const data = makeCertData(30);

    const render1 = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: mockSettings,
        augment: false,
        seed: 'seed-abc',
      })
    );
    await waitFor(() => expect(render1.result.current.isGenerating).toBe(false));
    const ids1 = render1.result.current.questions.map((q) => q.id);

    const render2 = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: mockSettings,
        augment: false,
        seed: 'seed-abc',
      })
    );
    await waitFor(() => expect(render2.result.current.isGenerating).toBe(false));
    const ids2 = render2.result.current.questions.map((q) => q.id);

    expect(ids1).toEqual(ids2);
    expect(ids1).toHaveLength(10);
  });

  it('yields different curated orders for different seeds', async () => {
    const data = makeCertData(30);

    const a = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 30,
        aiSettings: mockSettings,
        augment: false,
        seed: 'seed-a',
      })
    );
    await waitFor(() => expect(a.result.current.isGenerating).toBe(false));

    const b = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 30,
        aiSettings: mockSettings,
        augment: false,
        seed: 'seed-b',
      })
    );
    await waitFor(() => expect(b.result.current.isGenerating).toBe(false));

    const idsA = a.result.current.questions.map((q) => q.id);
    const idsB = b.result.current.questions.map((q) => q.id);
    expect(idsA).not.toEqual(idsB);
  });

  it('passes the derived curated ratio and seed to mix()', async () => {
    const data = makeCertData(15);
    const generated = Array.from({ length: 35 }, (_, i) => makeGenerated(`g${i}`));
    generateMock.mockResolvedValue(genResult(generated));

    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 50,
        aiSettings: openAiSettings,
        augment: true,
        seed: 'seed-xyz',
        targetAiPercent: 70,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(mixMock).toHaveBeenCalledTimes(1);
    // targetAiPercent 70 => curated ratio 0.3.
    const [, , ratio, seed] = mixMock.mock.calls[0];
    expect(ratio).toBeCloseTo(0.3);
    expect(seed).toBe('seed-xyz');
  });
});

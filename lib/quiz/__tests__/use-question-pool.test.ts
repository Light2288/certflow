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
// Mock the QuestionGenerator so tests never hit a network.
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

  it('does not generate when the curated pool already satisfies the count', async () => {
    const data = makeCertData(20);
    const { result } = renderHook(() =>
      useQuestionPool({
        certificationData: data,
        topicId: 'all',
        difficulty: 'all',
        requestedCount: 10,
        aiSettings: openAiSettings,
        augment: true,
      })
    );

    await act(async () => {
      await result.current.build();
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
    expect(result.current.questions).toHaveLength(10);
    expect(generateMock).not.toHaveBeenCalled();
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
    expect(generateMock).toHaveBeenCalledTimes(1);
    // generate() was asked to fill the gap (50 requested - 15 curated = 35).
    expect(generateMock.mock.calls[0][0].count).toBe(35);
    expect(mixMock).toHaveBeenCalledTimes(1);
    // mix() blends curated + generated; final pool capped at requestedCount.
    expect(result.current.questions).toHaveLength(50);
    expect(result.current.generationStats?.approved).toBe(35);
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
});

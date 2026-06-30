/**
 * useQuestionPool - Phase 10 (AI-Enhanced Simulator)
 *
 * Bridges the certification loader and the Phase 9 QuestionGenerator. It
 * exposes a curated question selection synchronously and, when augmentation is
 * requested and the curated pool is too small for the requested count,
 * generates + validates extra questions and blends them via `mix()`.
 *
 * Design notes:
 * - Never hits a real network on the mock-provider path (the generator only
 *   calls the configured AIService).
 * - Degrades gracefully: on a total generation failure it falls back to the
 *   curated pool and surfaces the error.
 * - Generation runs off the render path (kicked off by `build()`), so it never
 *   blocks the UI thread.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  CertificationData,
  Question,
  DifficultyLevel,
} from '@/lib/types/certification';
import type { AISettings } from '@/lib/types/ai-settings';
import { AIService } from '@/lib/ai/ai-service';
import { QuestionValidator } from '@/lib/ai/validator';
import {
  QuestionGenerator,
  type GenerationRequest,
  type GenerationResult,
  type GenerationStats,
  type GeneratedQuestion,
} from '@/lib/ai/generator';
import {
  getQuestionsByTopic,
  getQuestionsByDifficulty,
  getTopicById,
  getSubtopicById,
} from '@/lib/loaders/certification-loader';

export type GenerationStage =
  | 'idle'
  | 'drafting'
  | 'validating'
  | 'mixing'
  | 'done';

export interface UseQuestionPoolOptions {
  certificationData: CertificationData;
  /** Selected topic id, or 'all' for no topic filter. */
  topicId: string;
  /** Selected difficulty, or 'all' for no difficulty filter. */
  difficulty: DifficultyLevel | 'all';
  requestedCount: number;
  aiSettings: AISettings;
  /** When true, fill any gap with AI-generated questions. */
  augment: boolean;
}

export interface UseQuestionPoolResult {
  questions: Question[];
  isGenerating: boolean;
  stage: GenerationStage;
  generationStats: GenerationStats | null;
  error: GenerationResult['error'] | null;
  /**
   * Build the final pool. Resolves with the questions to use. When no
   * generation is needed this resolves with the curated selection immediately.
   */
  build: () => Promise<Question[]>;
  /** Best-effort cancel: settles to the curated pool. */
  cancel: () => void;
}

/** Filter the curated questions by topic/difficulty selection. */
function filterCurated(
  data: CertificationData,
  topicId: string,
  difficulty: DifficultyLevel | 'all'
): Question[] {
  let filtered = data.questions.questions;
  if (topicId !== 'all') {
    filtered = getQuestionsByTopic(topicId, { questions: filtered });
  }
  if (difficulty !== 'all') {
    filtered = getQuestionsByDifficulty(difficulty, { questions: filtered });
  }
  return filtered;
}

/** Deterministic-ish shuffle that does not depend on the generator internals. */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useQuestionPool(
  options: UseQuestionPoolOptions
): UseQuestionPoolResult {
  const {
    certificationData,
    topicId,
    difficulty,
    requestedCount,
    aiSettings,
    augment,
  } = options;

  const curated = useMemo(
    () => filterCurated(certificationData, topicId, difficulty),
    [certificationData, topicId, difficulty]
  );

  const curatedSelection = useMemo(
    () => shuffle(curated).slice(0, requestedCount),
    [curated, requestedCount]
  );

  const [questions, setQuestions] = useState<Question[]>(curatedSelection);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(
    null
  );
  const [error, setError] = useState<GenerationResult['error'] | null>(null);

  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsGenerating(false);
    setStage('idle');
    setQuestions(curatedSelection);
  }, [curatedSelection]);

  const build = useCallback(async (): Promise<Question[]> => {
    cancelledRef.current = false;
    setError(null);

    const needsGeneration = augment && curated.length < requestedCount;
    if (!needsGeneration) {
      setQuestions(curatedSelection);
      setStage('idle');
      return curatedSelection;
    }

    setIsGenerating(true);
    setStage('drafting');

    const topic =
      topicId !== 'all'
        ? getTopicById(topicId, certificationData.topics)
        : certificationData.topics.topics[0];

    // Without a topic there is nothing to ground generation in; fall back.
    if (!topic) {
      setIsGenerating(false);
      setStage('done');
      setQuestions(curatedSelection);
      return curatedSelection;
    }

    const subtopic = topic.subtopics[0]
      ? getSubtopicById(topic.id, topic.subtopics[0].id, certificationData.topics)
      : undefined;

    const aiService = new AIService({
      provider: aiSettings.provider,
      apiKey: aiSettings.apiKey,
      model: aiSettings.model,
      baseUrl: aiSettings.baseUrl,
      temperature: aiSettings.temperature,
      maxTokens: aiSettings.maxTokens,
    });
    const validator = new QuestionValidator(aiService);
    const generator = new QuestionGenerator(aiService, validator);

    const gap = requestedCount - curated.length;
    const request: GenerationRequest = {
      topic,
      subtopic,
      difficulty: difficulty === 'all' ? 'medium' : difficulty,
      count: gap,
      existingQuestionIds: curated.map((q) => q.id),
    };

    setStage('validating');
    const result = await generator.generate(request);

    if (cancelledRef.current) {
      return curatedSelection;
    }

    setGenerationStats(result.stats);

    if (result.error) {
      setError(result.error);
      setIsGenerating(false);
      setStage('done');
      setQuestions(curatedSelection);
      return curatedSelection;
    }

    setStage('mixing');
    const generated: GeneratedQuestion[] = result.generated;
    const blended = generator.mix(curated, generated);
    const finalPool = blended.slice(0, requestedCount);

    if (cancelledRef.current) {
      return curatedSelection;
    }

    setQuestions(finalPool);
    setIsGenerating(false);
    setStage('done');
    return finalPool;
  }, [
    augment,
    curated,
    curatedSelection,
    requestedCount,
    topicId,
    difficulty,
    certificationData,
    aiSettings,
  ]);

  return {
    questions,
    isGenerating,
    stage,
    generationStats,
    error,
    build,
    cancel,
  };
}

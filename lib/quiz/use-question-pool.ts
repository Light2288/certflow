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
  shuffle,
  type GenerationRequest,
  type GenerationResult,
  type GenerationStats,
  type GeneratedQuestion,
} from '@/lib/ai/generator';
import { generateQuestionsViaApi } from '@/lib/quiz/generate-questions-client';
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

/** Live, cumulative progress across all generation batches. */
export interface GenerationProgress {
  /** How many AI questions we're aiming to accumulate. */
  target: number;
  /** Unique AI questions kept so far. */
  kept: number;
  /** Total candidates the model has produced so far. */
  produced: number;
  /** Cumulative approved / flagged / rejected across batches. */
  approved: number;
  flagged: number;
  rejected: number;
  /** Batches (server calls) completed so far. */
  batches: number;
  /** Total tokens used so far (0 when the provider doesn't report usage). */
  tokensUsed: number;
}

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
  /**
   * Deterministic seed for reproducible curated selection and generation
   * ordering. Defaults to a stable string when omitted.
   */
  seed?: string;
  /**
   * Target percentage (0–100) of AI-generated questions in the blend. Passed to
   * `mix()` as a curated ratio of `1 - targetAiPercent/100`. Defaults to 70
   * (i.e. 30% curated), matching the prior hardcoded blend.
   */
  targetAiPercent?: number;
  /**
   * Whether AI-generated questions are quality-validated (default true). When
   * false, generation is much faster and keeps more questions but skips the
   * validator.
   */
  validateAi?: boolean;
}

export interface BuildResult {
  /** The final questions to use for the quiz. */
  questions: Question[];
  /** Generation error, when generation failed outright. */
  error: GenerationResult['error'] | null;
  /** Number of AI-generated questions that made it into the pool. */
  aiCount: number;
  /** Stats from the last generation attempt (produced/approved/rejected). */
  stats: GenerationStats | null;
}

export interface UseQuestionPoolResult {
  questions: Question[];
  isGenerating: boolean;
  stage: GenerationStage;
  generationStats: GenerationStats | null;
  /** Live, cumulative generation progress (null until generation starts). */
  generationProgress: GenerationProgress | null;
  error: GenerationResult['error'] | null;
  /**
   * Build the final pool. Resolves with the questions to use plus generation
   * outcome (error, AI count). When no generation is needed this resolves with
   * the curated selection immediately.
   */
  build: () => Promise<BuildResult>;
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

/** Default target % AI-generated (i.e. 30% curated), matching the prior blend. */
const DEFAULT_TARGET_AI_PERCENT = 70;

/**
 * A generated question's validator score (0–10), used to rank which AI
 * questions to keep when more are generated than needed. Unscored questions
 * (e.g. when validation was skipped) sort in the middle so they compete fairly.
 */
function aiScore(q: Question): number {
  const meta = (q as GeneratedQuestion).generationMeta;
  return meta?.validatorScore.overall ?? 5;
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
    seed = 'default-seed',
    targetAiPercent = DEFAULT_TARGET_AI_PERCENT,
    validateAi = true,
  } = options;

  const curated = useMemo(
    () => filterCurated(certificationData, topicId, difficulty),
    [certificationData, topicId, difficulty]
  );

  const curatedSelection = useMemo(
    () => shuffle(curated, seed).slice(0, requestedCount),
    [curated, requestedCount, seed]
  );

  const [questions, setQuestions] = useState<Question[]>(curatedSelection);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(
    null
  );
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const [error, setError] = useState<GenerationResult['error'] | null>(null);

  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsGenerating(false);
    setStage('idle');
    setGenerationProgress(null);
    setQuestions(curatedSelection);
  }, [curatedSelection]);

  const build = useCallback(async (): Promise<BuildResult> => {
    cancelledRef.current = false;
    setError(null);
    setGenerationProgress(null);

    // How many AI questions the target implies for the requested count.
    const aiTarget = Math.round(requestedCount * (targetAiPercent / 100));
    // Generate when augmenting and either the curated pool can't fill the count
    // or the user asked for a non-zero share of AI-generated questions.
    const needsGeneration =
      augment && (curated.length < requestedCount || aiTarget > 0);
    if (!needsGeneration) {
      setQuestions(curatedSelection);
      setStage('idle');
      return { questions: curatedSelection, error: null, aiCount: 0, stats: null };
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
      return { questions: curatedSelection, error: null, aiCount: 0, stats: null };
    }

    const subtopic = topic.subtopics[0]
      ? getSubtopicById(topic.id, topic.subtopics[0].id, certificationData.topics)
      : undefined;

    // The generator instance is used only for its pure, provider-free `mix()`.
    // Actual generation is routed through the server API so that server-only
    // providers (e.g. Ollama) work — the simulator runs in the browser.
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

    // Ask for enough AI questions to honor the target, and at least enough to
    // cover any shortfall in the curated pool.
    const shortfall = Math.max(0, requestedCount - curated.length);
    const targetCount = Math.max(shortfall, aiTarget);

    // A few real curated question stems to anchor the generator's style.
    const exampleQuestions = curated.slice(0, 5).map((q) => q.question);

    setStage('validating');

    // Providers frequently return fewer questions than requested in a single
    // call, which would starve the AI share. Top up across multiple capped
    // attempts (waves run in parallel to keep throughput high), accumulating
    // unique questions until we reach the target.
    // Each call requests a small, bounded batch: large single requests are slow
    // and, crucially, their JSON output can exceed the model's max output-token
    // limit and get truncated (unparseable). ~5 questions reliably fits the
    // default 2000-token budget.
    const GENERATION_BATCH_SIZE = 5;
    const GENERATION_CONCURRENCY = 3;
    const MAX_GENERATION_WAVES = 10;
    // Stop after a single wave that adds no new questions: each wave costs real
    // tokens/time, so grinding on an unproductive model wastes both.
    const MAX_EMPTY_ROUNDS = 1;
    const generated: GeneratedQuestion[] = [];
    const seenIds = new Set<string>(curated.map((q) => q.id));
    let lastError: GenerationResult['error'] | null = null;
    let emptyRounds = 0;

    // Cumulative, live progress across all batches (drives the on-screen log).
    const cumulative: GenerationProgress = {
      target: targetCount,
      kept: 0,
      produced: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
      batches: 0,
      tokensUsed: 0,
    };
    setGenerationProgress({ ...cumulative });

    const buildRequest = (): GenerationRequest => ({
      topic,
      subtopic,
      difficulty: difficulty === 'all' ? 'medium' : difficulty,
      count: Math.min(
        Math.max(1, targetCount - generated.length),
        GENERATION_BATCH_SIZE
      ),
      // Feed back accumulated ids so repeat calls avoid duplicates.
      existingQuestionIds: Array.from(seenIds),
      // Ground generation in the specific exam so questions aren't generic.
      certificationName: certificationData.config.name,
      certificationDescription: certificationData.config.description,
      // A handful of real curated stems anchor the model's style/specificity.
      exampleQuestions: exampleQuestions.slice(0, 5),
      // Optional per-question quality validation (faster/looser when off).
      validate: validateAi,
    });

    for (
      let wave = 0;
      wave < MAX_GENERATION_WAVES && generated.length < targetCount;
      wave += 1
    ) {
      // Fire a wave of concurrent requests. Snapshot the same existingIds for
      // all requests in the wave; cross-wave dedup still runs on the results.
      const waveSize = Math.min(
        GENERATION_CONCURRENCY,
        Math.max(1, targetCount - generated.length)
      );
      const requests = Array.from({ length: waveSize }, () => buildRequest());
      const results = await Promise.all(
        requests.map((req) => generateQuestionsViaApi(req, aiSettings))
      );

      if (cancelledRef.current) {
        return { questions: curatedSelection, error: null, aiCount: 0, stats: null };
      }

      let addedThisWave = 0;
      let producedThisWave = 0;
      for (const result of results) {
        if (result.error) {
          lastError = result.error;
          continue;
        }
        cumulative.produced += result.stats.produced;
        producedThisWave += result.stats.produced;
        cumulative.approved += result.stats.approved;
        cumulative.flagged += result.stats.flagged;
        cumulative.rejected += result.stats.rejected;
        cumulative.tokensUsed += result.stats.tokensUsed ?? 0;
        for (const q of result.generated) {
          if (seenIds.has(q.id)) continue;
          seenIds.add(q.id);
          generated.push(q);
          addedThisWave += 1;
        }
      }

      cumulative.kept = generated.length;
      cumulative.batches += results.length;
      setGenerationProgress({ ...cumulative });
      setGenerationStats({
        requested: targetCount,
        produced: cumulative.produced,
        approved: cumulative.approved,
        flagged: cumulative.flagged,
        rejected: cumulative.rejected,
      });

      // If the very first wave produced no parseable candidates at all, the
      // model can't produce the required output — retrying only burns tokens.
      if (wave === 0 && producedThisWave === 0) {
        break;
      }

      // Tolerate a bounded number of unproductive waves before stopping.
      if (addedThisWave === 0) {
        emptyRounds += 1;
        if (emptyRounds >= MAX_EMPTY_ROUNDS) {
          break;
        }
      } else {
        emptyRounds = 0;
      }
    }

    if (cancelledRef.current) {
      return { questions: curatedSelection, error: null, aiCount: 0, stats: null };
    }

    const finalStats: GenerationStats = {
      requested: targetCount,
      produced: cumulative.produced,
      approved: cumulative.approved,
      flagged: cumulative.flagged,
      rejected: cumulative.rejected,
    };
    setGenerationStats(finalStats);

    // Only treat it as a failure when generation produced nothing at all.
    if (lastError && generated.length === 0) {
      setError(lastError);
      setIsGenerating(false);
      setStage('done');
      setQuestions(curatedSelection);
      return { questions: curatedSelection, error: lastError, aiCount: 0, stats: finalStats };
    }

    setStage('mixing');

    // Blend against the requested count (not the whole pool) so the AI share
    // matches the target, while still filling the quota when one side is short.
    // 1) Aim for `aiTarget` generated questions (capped by what's available).
    // 2) Fill the rest from curated.
    // 3) If curated can't cover its share, backfill with more generated (and
    //    vice-versa) so the pool reaches the requested count when possible.
    let aiTake = Math.min(aiTarget, generated.length);
    let curatedTake = Math.min(
      Math.max(0, requestedCount - aiTake),
      curated.length
    );
    // Backfill any remaining slots from whichever pool still has questions.
    const remaining = requestedCount - aiTake - curatedTake;
    if (remaining > 0) {
      const extraAi = Math.min(remaining, generated.length - aiTake);
      aiTake += extraAi;
      const stillRemaining = requestedCount - aiTake - curatedTake;
      if (stillRemaining > 0) {
        curatedTake = Math.min(curatedTake + stillRemaining, curated.length);
      }
    }

    const curatedPick = shuffle(curated, `${seed}:curated`).slice(0, curatedTake);
    // When more AI questions were generated than needed, keep the BEST ones by
    // validator score (highest overall first). Ties and unscored questions fall
    // back to a deterministic seeded shuffle so selection stays reproducible.
    const shuffledGenerated = shuffle(generated, `${seed}:generated`);
    const rankedGenerated = [...shuffledGenerated].sort(
      (a, b) => aiScore(b) - aiScore(a)
    );
    const generatedPick = rankedGenerated.slice(0, aiTake);
    // Delegate the final interleave/shuffle to the generator's deterministic
    // mix so curated + generated are combined reproducibly.
    const curatedRatio = Math.min(Math.max(1 - targetAiPercent / 100, 0), 1);
    const blended = generator.mix(curatedPick, generatedPick, curatedRatio, seed);
    const finalPool = blended.slice(0, requestedCount);

    if (cancelledRef.current) {
      return { questions: curatedSelection, error: null, aiCount: 0, stats: null };
    }

    const aiCount = finalPool.filter(
      (q) => q.metadata.source === 'ai-generated'
    ).length;

    setQuestions(finalPool);
    setIsGenerating(false);
    setStage('done');
    return { questions: finalPool, error: lastError, aiCount, stats: finalStats };
  }, [
    augment,
    curated,
    curatedSelection,
    requestedCount,
    topicId,
    difficulty,
    certificationData,
    aiSettings,
    seed,
    targetAiPercent,
    validateAi,
  ]);

  return {
    questions,
    isGenerating,
    stage,
    generationStats,
    generationProgress,
    error,
    build,
    cancel,
  };
}

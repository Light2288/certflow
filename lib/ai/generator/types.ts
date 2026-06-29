/**
 * AI Question Generation Service - Type Contract
 *
 * Public types for the client-side question generator (Phase 9).
 *
 * The generator asks the configured AI provider (via `AIService`) to draft
 * candidate exam questions, validates each candidate through the Phase 8
 * `QuestionValidator`, and returns the kept questions plus per-run statistics.
 */

import type {
  Question,
  Topic,
  Subtopic,
  DifficultyLevel,
} from '@/lib/types/certification';
import type { ValidationScore, ValidationVerdict } from '@/lib/ai/validator';
import type { AIServiceError } from '@/lib/ai/types';

/**
 * A single generation request.
 *
 * `difficulty` is a single value: a request targets exactly one difficulty.
 * Mixed-difficulty batches are produced by issuing multiple requests.
 */
export interface GenerationRequest {
  topic: Topic;
  subtopic?: Subtopic;
  difficulty: DifficultyLevel;
  count: number;
  /** IDs of questions that already exist, used for de-duplication context. */
  existingQuestionIds: string[];
}

/**
 * Provenance metadata attached to a generated question.
 *
 * This is a non-breaking extension carried on `GeneratedQuestion`; the shared
 * `QuestionMetadata` contract (createdAt/lastReviewed/source) is left intact.
 */
export interface GenerationMeta {
  verdict: ValidationVerdict;
  validatorScore: ValidationScore;
  confidence: number;
}

/**
 * A `Question` produced by the generator, carrying the validator score.
 *
 * Remains structurally assignable to `Question` (the extra field is optional).
 */
export interface GeneratedQuestion extends Question {
  generationMeta?: GenerationMeta;
}

/**
 * Per-run counts describing what generation produced.
 */
export interface GenerationStats {
  requested: number;
  produced: number;
  approved: number;
  flagged: number;
  rejected: number;
}

/**
 * The result of a generation run.
 *
 * On a total AI failure the generator returns an otherwise-empty result with
 * `error` populated so callers (e.g. the simulator) can fall back to curated
 * questions and surface a friendly message.
 */
export interface GenerationResult {
  generated: GeneratedQuestion[];
  rejected: Array<{ raw: unknown; reason: string }>;
  stats: GenerationStats;
  /** Populated when the underlying AI call failed entirely. */
  error?: AIServiceError;
}

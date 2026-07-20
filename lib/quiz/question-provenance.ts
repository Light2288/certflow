/**
 * Question provenance helpers.
 *
 * Detect whether a Question is AI-generated (via `generationMeta` or
 * `metadata.source`) and expose its generation metadata. Shared by AnswerReview
 * and the live QuestionCard so the generated-vs-pool badge is consistent.
 */

import type { Question } from '@/lib/types/certification';
import type { GeneratedQuestion } from '@/lib/ai/generator';

/** Detect AI-generated provenance carried via generationMeta. */
export function getGenerationMeta(
  question: Question
): GeneratedQuestion['generationMeta'] | undefined {
  const meta = (question as GeneratedQuestion).generationMeta;
  if (meta) return meta;
  return undefined;
}

/** True when the question is AI-generated (by generationMeta or metadata.source). */
export function isAIGenerated(question: Question): boolean {
  return !!getGenerationMeta(question) || question.metadata.source === 'ai-generated';
}

/**
 * Format a validator score for display, rounded to one decimal place and
 * without a trailing ".0" (e.g. 7.200000000000001 -> "7.2", 8 -> "8").
 */
export function formatValidatorScore(score: number): string {
  return String(Math.round(score * 10) / 10);
}

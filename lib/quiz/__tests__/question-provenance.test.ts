/**
 * question-provenance helper tests
 *
 * These helpers detect whether a Question is AI-generated (via generationMeta or
 * metadata.source) and expose its generation metadata. They back the
 * generated-vs-pool badges shown in both AnswerReview and the live QuestionCard.
 */

import { describe, it, expect } from 'vitest';
import type { Question } from '@/lib/types/certification';
import type { GeneratedQuestion } from '@/lib/ai/generator';
import { getGenerationMeta, isAIGenerated, formatValidatorScore } from '../question-provenance';

const baseQuestion: Question = {
  id: 'q1',
  topicId: 't1',
  subtopicId: 'st1',
  type: 'multiple-choice',
  difficulty: 'medium',
  question: 'What is 2 + 2?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
  ],
  correctAnswer: 'b',
  explanation: { correct: '4 is correct', whyOthersWrong: {} },
  metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'curated' },
};

const generationMeta: GeneratedQuestion['generationMeta'] = {
  verdict: 'approved',
  validatorScore: {
    overall: 8.5,
    accuracy: 9,
    clarity: 8,
    relevance: 9,
    difficulty: 8,
  },
  confidence: 0.9,
};

describe('question-provenance', () => {
  it('isAIGenerated is false for a curated question', () => {
    expect(isAIGenerated(baseQuestion)).toBe(false);
  });

  it('isAIGenerated is true when metadata.source is ai-generated', () => {
    const q: Question = {
      ...baseQuestion,
      metadata: { ...baseQuestion.metadata, source: 'ai-generated' },
    };
    expect(isAIGenerated(q)).toBe(true);
  });

  it('isAIGenerated is true when the question carries generationMeta', () => {
    const q = { ...baseQuestion, generationMeta } as GeneratedQuestion;
    expect(isAIGenerated(q)).toBe(true);
  });

  it('getGenerationMeta returns the meta when present', () => {
    const q = { ...baseQuestion, generationMeta } as GeneratedQuestion;
    expect(getGenerationMeta(q)).toEqual(generationMeta);
  });

  it('getGenerationMeta returns undefined when absent', () => {
    expect(getGenerationMeta(baseQuestion)).toBeUndefined();
  });

  it('formatValidatorScore rounds to one decimal place', () => {
    expect(formatValidatorScore(7.200000000000001)).toBe('7.2');
    expect(formatValidatorScore(8)).toBe('8');
    expect(formatValidatorScore(8.75)).toBe('8.8');
    expect(formatValidatorScore(9.04)).toBe('9');
  });
});

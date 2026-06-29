/**
 * Tests for validator prompt builders.
 */

import { describe, it, expect } from 'vitest';
import {
  VALIDATOR_SYSTEM_PROMPT,
  STRICT_JSON_RETRY_INSTRUCTION,
  buildValidationPrompt,
} from '../prompts';
import type { Question, Topic, Subtopic } from '@/lib/types/certification';

const topic: Topic = {
  id: 'data-eng',
  name: 'Data Engineering',
  description: 'Building data pipelines on AWS.',
  weight: 20,
  order: 1,
  subtopics: [],
};

const subtopic: Subtopic = {
  id: 'ingestion',
  name: 'Data Ingestion',
  description: 'Batch and streaming ingestion.',
  keyPoints: ['Kinesis for streaming', 'Glue for batch ETL'],
};

const question: Question = {
  id: 'q-1',
  topicId: 'data-eng',
  subtopicId: 'ingestion',
  type: 'multiple-choice',
  difficulty: 'medium',
  question: 'Which service is best for real-time streaming ingestion?',
  options: [
    { id: 'a', text: 'Amazon Kinesis' },
    { id: 'b', text: 'AWS Glue' },
    { id: 'c', text: 'Amazon S3' },
    { id: 'd', text: 'Amazon Athena' },
  ],
  correctAnswer: 'a',
  explanation: {
    correct: 'Kinesis is designed for real-time streaming.',
    whyOthersWrong: {
      b: 'Glue is batch ETL.',
      c: 'S3 is object storage.',
      d: 'Athena is interactive query.',
    },
  },
  metadata: {
    createdAt: '2026-01-01',
    lastReviewed: '2026-01-01',
    source: 'curated',
  },
};

describe('validator prompts', () => {
  describe('VALIDATOR_SYSTEM_PROMPT', () => {
    it('frames the model as an exam-question reviewer demanding JSON', () => {
      expect(VALIDATOR_SYSTEM_PROMPT).toMatch(/review/i);
      expect(VALIDATOR_SYSTEM_PROMPT).toMatch(/json/i);
    });

    it('documents the required score fields', () => {
      for (const field of [
        'clarity',
        'topicAlignment',
        'correctness',
        'difficulty',
        'overall',
        'confidence',
        'reasoning',
        'issues',
      ]) {
        expect(VALIDATOR_SYSTEM_PROMPT).toContain(field);
      }
    });
  });

  describe('STRICT_JSON_RETRY_INSTRUCTION', () => {
    it('instructs the model to re-emit valid JSON only', () => {
      expect(STRICT_JSON_RETRY_INSTRUCTION).toMatch(/json/i);
    });
  });

  describe('buildValidationPrompt', () => {
    it('includes the question stem', () => {
      const prompt = buildValidationPrompt(question, topic);
      expect(prompt).toContain(question.question);
    });

    it('includes every option id and text', () => {
      const prompt = buildValidationPrompt(question, topic);
      for (const opt of question.options) {
        expect(prompt).toContain(opt.text);
        expect(prompt).toContain(opt.id);
      }
    });

    it('includes the correct answer', () => {
      const prompt = buildValidationPrompt(question, topic);
      expect(prompt).toContain('a');
      expect(prompt).toContain(question.explanation.correct);
    });

    it('includes topic name and description', () => {
      const prompt = buildValidationPrompt(question, topic);
      expect(prompt).toContain(topic.name);
      expect(prompt).toContain(topic.description);
    });

    it('includes subtopic key points only when a subtopic is provided', () => {
      const without = buildValidationPrompt(question, topic);
      expect(without).not.toContain('Kinesis for streaming');

      const withSub = buildValidationPrompt(question, topic, subtopic);
      expect(withSub).toContain(subtopic.name);
      expect(withSub).toContain('Kinesis for streaming');
      expect(withSub).toContain('Glue for batch ETL');
    });

    it('renders an array correct answer as a joined list', () => {
      const multi: Question = {
        ...question,
        type: 'multi-select',
        correctAnswer: ['a', 'c'],
      };
      const prompt = buildValidationPrompt(multi, topic);
      expect(prompt).toContain('a');
      expect(prompt).toContain('c');
    });
  });
});

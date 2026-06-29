/**
 * Tests for the question-generation prompt builders.
 */

import { describe, it, expect } from 'vitest';
import {
  GENERATOR_SYSTEM_PROMPT,
  STRICT_JSON_RETRY_INSTRUCTION,
  buildGenerationPrompt,
} from '../prompts';
import type { GenerationRequest } from '../types';
import type { Topic, Subtopic } from '@/lib/types/certification';

const topic: Topic = {
  id: 'data-eng',
  name: 'Data Engineering',
  description: 'Building data pipelines on AWS.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'ingestion',
      name: 'Data Ingestion',
      description: 'Batch and streaming ingestion.',
      keyPoints: ['Kinesis for streaming', 'Glue for batch ETL'],
    },
  ],
};

const subtopic: Subtopic = topic.subtopics[0];

function makeRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    topic,
    difficulty: 'medium',
    count: 3,
    existingQuestionIds: [],
    ...overrides,
  };
}

describe('GENERATOR_SYSTEM_PROMPT', () => {
  it('demands JSON-only array output with no prose or code fences', () => {
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/json/i);
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/array/i);
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/no (markdown|prose|code fences)/i);
  });

  it('lists the required Question schema fields', () => {
    for (const field of [
      'topicId',
      'subtopicId',
      'type',
      'difficulty',
      'question',
      'options',
      'correctAnswer',
      'explanation',
      'whyOthersWrong',
    ]) {
      expect(GENERATOR_SYSTEM_PROMPT).toContain(field);
    }
  });

  it('instructs the model to omit id and metadata', () => {
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/omit/i);
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/\bid\b/);
    expect(GENERATOR_SYSTEM_PROMPT).toMatch(/metadata/);
  });
});

describe('STRICT_JSON_RETRY_INSTRUCTION', () => {
  it('is a non-empty string asking for valid JSON only', () => {
    expect(typeof STRICT_JSON_RETRY_INSTRUCTION).toBe('string');
    expect(STRICT_JSON_RETRY_INSTRUCTION).toMatch(/json/i);
  });
});

describe('buildGenerationPrompt', () => {
  it('includes the topic name, difficulty, and requested count', () => {
    const prompt = buildGenerationPrompt(makeRequest({ count: 5, difficulty: 'hard' }));
    expect(prompt).toContain('Data Engineering');
    expect(prompt).toContain('hard');
    expect(prompt).toContain('5');
  });

  it('includes the topic description and key points context', () => {
    const prompt = buildGenerationPrompt(makeRequest());
    expect(prompt).toContain('Building data pipelines on AWS.');
  });

  it('includes subtopic name and key points when a subtopic is provided', () => {
    const prompt = buildGenerationPrompt(makeRequest({ subtopic }));
    expect(prompt).toContain('Data Ingestion');
    expect(prompt).toContain('Kinesis for streaming');
  });

  it('omits subtopic context gracefully when no subtopic is provided', () => {
    const prompt = buildGenerationPrompt(makeRequest());
    expect(prompt).not.toContain('Data Ingestion');
  });

  it('mentions existing question ids as avoid-context when provided', () => {
    const prompt = buildGenerationPrompt(
      makeRequest({ existingQuestionIds: ['q001', 'q002'] })
    );
    expect(prompt).toContain('q001');
    expect(prompt).toContain('q002');
  });

  it('includes a few-shot example with the correct schema shape', () => {
    const prompt = buildGenerationPrompt(makeRequest());
    // The example should demonstrate the explanation/whyOthersWrong shape.
    expect(prompt).toMatch(/whyOthersWrong/);
  });
});

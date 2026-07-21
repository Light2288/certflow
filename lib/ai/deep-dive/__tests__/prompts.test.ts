/**
 * Tests for the reworked Topic Deep Dive prompt builders.
 *
 * Verifies:
 * - The system prompt frames a structured-JSON deep dive (sections,
 *   practice questions, exam traps).
 * - buildDeepDiveSystemPrompt injects certification identity + domains.
 * - buildDeepDivePrompt grounds in the topic's real key points.
 * - Few-shot real questions appear when supplied and are omitted otherwise.
 * - A strict-JSON retry instruction exists.
 */

import { describe, it, expect } from 'vitest';
import {
  DEEP_DIVE_SYSTEM_PROMPT,
  DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION,
  buildDeepDiveSystemPrompt,
  buildDeepDivePrompt,
} from '../prompts';
import type {
  CertificationConfig,
  Question,
  TopicsData,
  Topic,
} from '@/lib/types/certification';

const topic: Topic = {
  id: 'data-engineering',
  name: 'Data Engineering',
  description: 'Building and maintaining data pipelines for ML workloads.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'de-1',
      name: 'Data Repositories',
      description: 'Where data lives.',
      keyPoints: ['S3 data lakes', 'Feature stores'],
      content: 'Feature stores centralise curated features.',
    },
    {
      id: 'de-2',
      name: 'Data Ingestion',
      description: 'Getting data in.',
      keyPoints: ['Kinesis streaming', 'Glue batch jobs'],
    },
  ],
};

const config: CertificationConfig = {
  id: 'aws-ml',
  name: 'AWS Certified Machine Learning',
  code: 'MLS-C01',
  version: '1.0',
  description: 'ML specialty.',
  provider: 'AWS',
  examDetails: {
    duration: 180,
    questionCount: 65,
    passingScore: 750,
    scoreRange: { min: 100, max: 1000 },
  },
  metadata: { lastUpdated: '2026-01-01', difficulty: 'advanced' },
};

const topicsData: TopicsData = { topics: [topic] };

const sampleQuestion: Question = {
  id: 'q1',
  topicId: 'data-engineering',
  subtopicId: 'de-1',
  type: 'multiple-choice',
  question: 'Which service ingests streaming data?',
  difficulty: 'medium',
  options: [
    { id: 'a', text: 'Amazon Kinesis' },
    { id: 'b', text: 'Amazon Glacier' },
  ],
  correctAnswer: 'a',
  explanation: {
    correct: 'Kinesis handles real-time streaming ingestion.',
    whyOthersWrong: { b: 'Glacier is cold archival storage.' },
  },
  metadata: {
    createdAt: '2026-01-01',
    lastReviewed: '2026-01-01',
    source: 'curated',
  },
};

describe('DEEP_DIVE_SYSTEM_PROMPT', () => {
  it('asks for a single JSON object with the deep-dive schema', () => {
    const lower = DEEP_DIVE_SYSTEM_PROMPT.toLowerCase();
    expect(lower).toMatch(/json/);
    expect(lower).toContain('sections');
    expect(lower).toContain('practicequestions');
    expect(lower).toContain('traps');
  });
});

describe('DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION', () => {
  it('is a string mentioning JSON', () => {
    expect(typeof DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION).toBe('string');
    expect(DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION).toMatch(/json/i);
  });
});

describe('buildDeepDiveSystemPrompt', () => {
  it('injects certification identity and exam domains', () => {
    const prompt = buildDeepDiveSystemPrompt(config, topicsData);
    expect(prompt).toContain('AWS Certified Machine Learning');
    expect(prompt).toContain('MLS-C01');
    expect(prompt).toContain('Data Engineering');
  });

  it('still returns the base system prompt framing', () => {
    const prompt = buildDeepDiveSystemPrompt(config, topicsData);
    expect(prompt).toContain(DEEP_DIVE_SYSTEM_PROMPT);
  });
});

describe('buildDeepDivePrompt', () => {
  it('grounds in the topic name, description, and real key points', () => {
    const prompt = buildDeepDivePrompt(topic);
    expect(prompt).toContain('Data Engineering');
    expect(prompt).toContain(
      'Building and maintaining data pipelines for ML workloads.'
    );
    expect(prompt).toContain('S3 data lakes');
    expect(prompt).toContain('Feature stores');
    expect(prompt).toContain('Kinesis streaming');
    expect(prompt).toContain('Glue batch jobs');
  });

  it('includes enriched subtopic content when present', () => {
    const prompt = buildDeepDivePrompt(topic);
    expect(prompt).toContain('Feature stores centralise curated features.');
  });

  it('requests targeted practice questions and common exam traps', () => {
    const lower = buildDeepDivePrompt(topic).toLowerCase();
    expect(lower).toContain('practice question');
    expect(lower).toContain('trap');
  });

  it('includes few-shot real questions when supplied', () => {
    const prompt = buildDeepDivePrompt(topic, [sampleQuestion]);
    expect(prompt).toContain('Which service ingests streaming data?');
    expect(prompt).toContain('Amazon Kinesis');
    expect(prompt).toContain('Kinesis handles real-time streaming ingestion.');
  });

  it('omits the few-shot section when no questions are supplied', () => {
    const prompt = buildDeepDivePrompt(topic, []);
    expect(prompt).not.toContain('Which service ingests streaming data?');
    expect(prompt.toLowerCase()).not.toContain('example exam questions');
  });

  it('produces a valid prompt for a topic with no key points (no crash)', () => {
    const sparse: Topic = {
      id: 'sparse',
      name: 'Sparse Topic',
      description: 'A topic with no subtopics or key points.',
      weight: 5,
      order: 9,
      subtopics: [],
    };
    const prompt = buildDeepDivePrompt(sparse);
    expect(prompt).toContain('Sparse Topic');
    expect(prompt.length).toBeGreaterThan(0);
  });
});

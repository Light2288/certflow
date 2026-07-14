/**
 * Tests for the tutor certification-grounding prompt builder.
 */

import { describe, it, expect } from 'vitest';
import { TUTOR_SYSTEM_PROMPT, buildTutorSystemPrompt } from '../prompts';
import type {
  CertificationConfig,
  TopicsData,
} from '@/lib/types/certification';

const config: CertificationConfig = {
  id: 'snowpro-core',
  name: 'SnowPro Core Certification',
  code: 'COF-C02',
  version: '2024',
  description: 'Snowflake core certification.',
  provider: 'Snowflake',
  examDetails: {
    duration: 115,
    questionCount: 100,
    passingScore: 750,
    scoreRange: { min: 0, max: 1000 },
  },
  metadata: {
    lastUpdated: '2024-01-01',
    difficulty: 'intermediate',
  },
};

const topics: TopicsData = {
  topics: [
    {
      id: 'architecture',
      name: 'Snowflake Architecture',
      description: 'Core architecture concepts.',
      weight: 25,
      order: 1,
      subtopics: [
        {
          id: 'storage',
          name: 'Storage Layer',
          description: 'How Snowflake stores data.',
          keyPoints: ['Micro-partitions', 'Columnar storage'],
        },
      ],
    },
    {
      id: 'loading',
      name: 'Data Loading',
      description: 'Loading data into Snowflake.',
      weight: 15,
      order: 2,
      subtopics: [
        {
          id: 'copy',
          name: 'COPY command',
          description: 'Bulk loading.',
          keyPoints: ['Stages', 'File formats'],
        },
      ],
    },
  ],
};

describe('TUTOR_SYSTEM_PROMPT', () => {
  it('is a non-empty string framing the model as a certification study tutor', () => {
    expect(typeof TUTOR_SYSTEM_PROMPT).toBe('string');
    expect(TUTOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    expect(TUTOR_SYSTEM_PROMPT).toMatch(/tutor/i);
  });
});

describe('buildTutorSystemPrompt', () => {
  it('includes the TUTOR_SYSTEM_PROMPT framing', () => {
    const prompt = buildTutorSystemPrompt(config, topics);
    expect(prompt).toContain(TUTOR_SYSTEM_PROMPT);
  });

  it('includes the certification name and code', () => {
    const prompt = buildTutorSystemPrompt(config, topics);
    expect(prompt).toContain('SnowPro Core Certification');
    expect(prompt).toContain('COF-C02');
  });

  it('includes exam detail values', () => {
    const prompt = buildTutorSystemPrompt(config, topics);
    expect(prompt).toContain('115');
    expect(prompt).toContain('100');
    expect(prompt).toContain('750');
    expect(prompt).toContain('1000');
  });

  it('includes each domain name and its weight', () => {
    const prompt = buildTutorSystemPrompt(config, topics);
    expect(prompt).toContain('Snowflake Architecture');
    expect(prompt).toContain('25');
    expect(prompt).toContain('Data Loading');
    expect(prompt).toContain('15');
  });

  it('includes subtopic names and key points', () => {
    const prompt = buildTutorSystemPrompt(config, topics);
    expect(prompt).toContain('Storage Layer');
    expect(prompt).toContain('Micro-partitions');
    expect(prompt).toContain('Columnar storage');
    expect(prompt).toContain('COPY command');
    expect(prompt).toContain('Stages');
  });

  it('handles a certification with no topics gracefully', () => {
    const prompt = buildTutorSystemPrompt(config, { topics: [] });
    expect(prompt).toContain('SnowPro Core Certification');
    expect(typeof prompt).toBe('string');
  });
});

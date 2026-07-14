import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  validateCertificationConfig,
  validateTopics,
  validateQuestions,
  validateTopicReference,
} from '../certification-loader';
import type {
  CertificationConfig,
  CertificationListData,
  TopicsData,
  QuestionsData,
} from '@/lib/types/certification';

// ---------------------------------------------------------------------------
// This test loads the real, committed certification JSON from the filesystem
// and enforces the strict rules from specs/study-materials-cert-pipeline.md.
// Several of the loader's checks are only "warnings" at runtime; here we
// upgrade them to hard failures (weights must sum to 100, all references must
// resolve, ids must be unique, correctAnswer type must match question type).
// ---------------------------------------------------------------------------

const CERT_DIR = path.resolve(__dirname, '../../../public/data/certifications');

function readJson<T>(...segments: string[]): T {
  const file = path.join(CERT_DIR, ...segments);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

const index = readJson<CertificationListData>('index.json');
const certIds = index.certifications.map((c) => c.id);

describe('certification manifest (index.json)', () => {
  it('lists at least one certification', () => {
    expect(certIds.length).toBeGreaterThan(0);
  });

  it('does not reference removed placeholder certifications', () => {
    expect(certIds).not.toContain('aws-ml');
  });

  it('has a folder for every listed certification', () => {
    for (const id of certIds) {
      expect(existsSync(path.join(CERT_DIR, id, 'config.json'))).toBe(true);
      expect(existsSync(path.join(CERT_DIR, id, 'topics.json'))).toBe(true);
      expect(existsSync(path.join(CERT_DIR, id, 'questions.json'))).toBe(true);
    }
  });
});

describe.each(certIds)('certification: %s', (certId) => {
  const config = readJson<CertificationConfig>(certId, 'config.json');
  const topics = readJson<TopicsData>(certId, 'topics.json');
  const questions = readJson<QuestionsData>(certId, 'questions.json');

  it('config is valid and id matches folder', () => {
    const result = validateCertificationConfig(config);
    expect(result.errors).toEqual([]);
    expect(config.id).toBe(certId);
  });

  it('topics pass loader validation', () => {
    const result = validateTopics(topics);
    expect(result.errors).toEqual([]);
  });

  it('topic weights sum to 100', () => {
    const total = topics.topics.reduce((sum, t) => sum + (t.weight || 0), 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.01);
  });

  it('every topic has at least one subtopic', () => {
    for (const t of topics.topics) {
      expect(t.subtopics.length).toBeGreaterThan(0);
    }
  });

  it('topic and subtopic ids are unique', () => {
    const topicIds = topics.topics.map((t) => t.id);
    expect(new Set(topicIds).size).toBe(topicIds.length);
    for (const t of topics.topics) {
      const subIds = t.subtopics.map((s) => s.id);
      expect(new Set(subIds).size).toBe(subIds.length);
    }
  });

  it('questions pass loader validation', () => {
    const result = validateQuestions(questions);
    expect(result.errors).toEqual([]);
  });

  it('question ids are unique', () => {
    const ids = questions.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question references an existing topic/subtopic', () => {
    for (const q of questions.questions) {
      expect(
        validateTopicReference(q.topicId, q.subtopicId, topics),
      ).toBe(true);
    }
  });

  it('correctAnswer type matches question type and references options', () => {
    for (const q of questions.questions) {
      const optionIds = q.options.map((o) => o.id);
      if (q.type === 'multiple-choice') {
        expect(typeof q.correctAnswer).toBe('string');
        expect(optionIds).toContain(q.correctAnswer as string);
      } else {
        expect(Array.isArray(q.correctAnswer)).toBe(true);
        const answers = q.correctAnswer as string[];
        expect(answers.length).toBeGreaterThan(0);
        for (const a of answers) {
          expect(optionIds).toContain(a);
        }
      }
    }
  });

  it('every question has a non-empty correct explanation', () => {
    for (const q of questions.questions) {
      expect(q.explanation.correct.trim().length).toBeGreaterThan(0);
    }
  });
});

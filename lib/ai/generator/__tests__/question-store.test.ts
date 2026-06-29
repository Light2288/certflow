/**
 * Tests for the localStorage-backed approved-question cache.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApproved,
  addApproved,
  clear,
  generatedQuestionsKey,
} from '../question-store';
import type { GeneratedQuestion } from '../types';

function makeQuestion(id: string, overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    id,
    topicId: 'data-eng',
    subtopicId: 'ingestion',
    type: 'multiple-choice',
    difficulty: 'medium',
    question: `Question ${id}?`,
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'a',
    explanation: {
      correct: 'A is correct.',
      whyOthersWrong: { b: 'B is wrong.' },
    },
    metadata: {
      createdAt: '2026-01-01',
      lastReviewed: '2026-01-01',
      source: 'ai-generated',
    },
    ...overrides,
  };
}

describe('question-store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips approved questions for a certification id', () => {
    const q = makeQuestion('gen_1');
    addApproved('aws-ml', [q]);

    const loaded = getApproved('aws-ml');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('gen_1');
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getApproved('aws-ml')).toEqual([]);
  });

  it('appends and de-duplicates by id across multiple addApproved calls', () => {
    addApproved('aws-ml', [makeQuestion('gen_1')]);
    addApproved('aws-ml', [makeQuestion('gen_1'), makeQuestion('gen_2')]);

    const loaded = getApproved('aws-ml');
    const ids = loaded.map((q) => q.id).sort();
    expect(ids).toEqual(['gen_1', 'gen_2']);
  });

  it('isolates questions per certification id', () => {
    addApproved('aws-ml', [makeQuestion('gen_a')]);
    addApproved('azure-ai', [makeQuestion('gen_b')]);

    expect(getApproved('aws-ml').map((q) => q.id)).toEqual(['gen_a']);
    expect(getApproved('azure-ai').map((q) => q.id)).toEqual(['gen_b']);
  });

  it('clear(certId) removes only that certification cache', () => {
    addApproved('aws-ml', [makeQuestion('gen_a')]);
    addApproved('azure-ai', [makeQuestion('gen_b')]);

    clear('aws-ml');

    expect(getApproved('aws-ml')).toEqual([]);
    expect(getApproved('azure-ai').map((q) => q.id)).toEqual(['gen_b']);
  });

  it('returns [] when the stored entry is corrupt JSON', () => {
    localStorage.setItem(generatedQuestionsKey('aws-ml'), '{not valid json');
    expect(getApproved('aws-ml')).toEqual([]);
  });

  it('drops schema-invalid stored items on read', () => {
    const valid = makeQuestion('gen_ok');
    const invalid = { id: 'gen_bad' }; // missing required fields
    localStorage.setItem(
      generatedQuestionsKey('aws-ml'),
      JSON.stringify([valid, invalid])
    );

    const loaded = getApproved('aws-ml');
    expect(loaded.map((q) => q.id)).toEqual(['gen_ok']);
  });

  it('returns [] when the stored value is not an array', () => {
    localStorage.setItem(generatedQuestionsKey('aws-ml'), JSON.stringify({ foo: 'bar' }));
    expect(getApproved('aws-ml')).toEqual([]);
  });

  it('does not throw when a write fails', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });

    expect(() => addApproved('aws-ml', [makeQuestion('gen_1')])).not.toThrow();

    spy.mockRestore();
  });
});

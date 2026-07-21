/**
 * Tests for the localStorage-backed deep-dive cache.
 *
 * Verifies:
 * - The per-topic key builder.
 * - Round-tripping a StoredDeepDive via set then get.
 * - Returns null on missing / corrupt / non-object storage.
 * - clear removes only the given topic's entry.
 * - Write failures (setItem throwing) are swallowed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDeepDive,
  setDeepDive,
  clearDeepDive,
  deepDiveKey,
} from '../deep-dive-store';
import type { StoredDeepDive } from '../types';

function makeStored(
  certId: string,
  topicId: string,
  overrides: Partial<StoredDeepDive> = {}
): StoredDeepDive {
  return {
    certId,
    topicId,
    generatedAt: 1_700_000_000_000,
    dive: {
      topicId,
      sections: [{ heading: 'Overview', body: 'Some markdown.' }],
      practiceQuestions: [
        {
          question: 'What is X?',
          options: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correctAnswer: 'a',
          explanation: 'A is correct.',
        },
      ],
      traps: [{ trap: 'Confusing X and Y', why: 'They differ in Z.' }],
    },
    ...overrides,
  };
}

describe('deep-dive-store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a per-topic key namespaced by certification and topic', () => {
    expect(deepDiveKey('aws-ml', 'data-eng')).toBe(
      'certflow:deep-dive:aws-ml:data-eng'
    );
  });

  it('round-trips a stored deep dive via set then get', () => {
    const entry = makeStored('aws-ml', 'data-eng');
    setDeepDive(entry);

    const loaded = getDeepDive('aws-ml', 'data-eng');
    expect(loaded).not.toBeNull();
    expect(loaded?.certId).toBe('aws-ml');
    expect(loaded?.topicId).toBe('data-eng');
    expect(loaded?.dive.sections[0].heading).toBe('Overview');
    expect(loaded?.dive.practiceQuestions).toHaveLength(1);
    expect(loaded?.dive.traps).toHaveLength(1);
  });

  it('returns null when nothing is stored', () => {
    expect(getDeepDive('aws-ml', 'data-eng')).toBeNull();
  });

  it('returns null and drops corrupt (non-JSON) entries', () => {
    localStorage.setItem(deepDiveKey('aws-ml', 'data-eng'), '{not json');
    expect(getDeepDive('aws-ml', 'data-eng')).toBeNull();
  });

  it('returns null for a parseable-but-malformed entry (missing dive shape)', () => {
    localStorage.setItem(
      deepDiveKey('aws-ml', 'data-eng'),
      JSON.stringify({ certId: 'aws-ml', topicId: 'data-eng' })
    );
    expect(getDeepDive('aws-ml', 'data-eng')).toBeNull();
  });

  it('scopes entries per topic (different topics do not collide)', () => {
    setDeepDive(makeStored('aws-ml', 'data-eng'));
    setDeepDive(makeStored('aws-ml', 'security'));

    expect(getDeepDive('aws-ml', 'data-eng')?.topicId).toBe('data-eng');
    expect(getDeepDive('aws-ml', 'security')?.topicId).toBe('security');
  });

  it('clear removes only the given topic entry', () => {
    setDeepDive(makeStored('aws-ml', 'data-eng'));
    setDeepDive(makeStored('aws-ml', 'security'));

    clearDeepDive('aws-ml', 'data-eng');

    expect(getDeepDive('aws-ml', 'data-eng')).toBeNull();
    expect(getDeepDive('aws-ml', 'security')).not.toBeNull();
  });

  it('does not throw when a write fails (quota / serialization)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => setDeepDive(makeStored('aws-ml', 'data-eng'))).not.toThrow();
    spy.mockRestore();
  });
});

/**
 * Topic Deep Dive — localStorage cache
 *
 * A localStorage-backed cache of generated deep dives, keyed per topic within
 * a certification. Lets a generated dive be revisited without re-invoking the
 * provider on every click.
 *
 * Mirrors the conventions of `lib/ai/generator/question-store.ts`: a key
 * prefix, a storage-availability guard, defensive JSON parsing (corrupt or
 * malformed entries are dropped and treated as absent), and swallowed write
 * failures (quota / serialization errors degrade gracefully).
 *
 * NOTE: like the question store, this cache grows unbounded; size capping /
 * eviction is intentionally out of scope.
 */

import type { StoredDeepDive } from './types';

const KEY_PREFIX = 'certflow:deep-dive:';

/** Build the localStorage key for a certification/topic pair. */
export function deepDiveKey(certId: string, topicId: string): string {
  return `${KEY_PREFIX}${certId}:${topicId}`;
}

/** True when localStorage is available (i.e. running in a browser). */
function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Type-guard that a parsed value has the minimum StoredDeepDive shape. Guards
 * against corrupt or partially-written entries so callers never see a
 * malformed dive.
 */
function isStoredDeepDive(value: unknown): value is StoredDeepDive {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.certId !== 'string' || typeof v.topicId !== 'string') {
    return false;
  }
  if (typeof v.generatedAt !== 'number') {
    return false;
  }
  const dive = v.dive as Record<string, unknown> | undefined;
  if (typeof dive !== 'object' || dive === null) {
    return false;
  }
  return (
    Array.isArray(dive.sections) &&
    Array.isArray(dive.practiceQuestions) &&
    Array.isArray(dive.traps)
  );
}

/**
 * Read the stored deep dive for a certification/topic pair.
 *
 * Returns null on missing, corrupt, malformed, or unavailable storage.
 */
export function getDeepDive(
  certId: string,
  topicId: string
): StoredDeepDive | null {
  if (!hasStorage()) {
    return null;
  }

  let raw: string | null;
  try {
    raw = localStorage.getItem(deepDiveKey(certId, topicId));
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isStoredDeepDive(parsed) ? parsed : null;
}

/**
 * Persist a deep dive for its certification/topic pair. Write failures
 * (quota / serialization) are swallowed so the caller can still show the
 * in-session dive.
 */
export function setDeepDive(entry: StoredDeepDive): void {
  if (!hasStorage()) {
    return;
  }
  try {
    localStorage.setItem(
      deepDiveKey(entry.certId, entry.topicId),
      JSON.stringify(entry)
    );
  } catch {
    // Degrade gracefully on quota / serialization errors.
  }
}

/** Remove only the given certification/topic dive. */
export function clearDeepDive(certId: string, topicId: string): void {
  if (!hasStorage()) {
    return;
  }
  try {
    localStorage.removeItem(deepDiveKey(certId, topicId));
  } catch {
    // Ignore.
  }
}

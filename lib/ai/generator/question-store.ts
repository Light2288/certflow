/**
 * AI Question Generation Service - Approved-question cache
 *
 * A localStorage-backed cache of approved (and flagged) generated questions,
 * keyed by certification id. Lets generation cost amortise across sessions:
 * callers merge cached questions with the curated set on future loads.
 *
 * NOTE: the cache currently grows unbounded. Size capping / eviction is a
 * documented future concern, intentionally out of scope for Phase 9.
 */

import { validateQuestion } from '@/lib/loaders/certification-loader';
import type { Question } from '@/lib/types/certification';
import type { GeneratedQuestion } from './types';

const KEY_PREFIX = 'certflow:generated-questions:';

/** Build the localStorage key for a certification's cache. */
export function generatedQuestionsKey(certId: string): string {
  return `${KEY_PREFIX}${certId}`;
}

/** True when localStorage is available (i.e. running in a browser). */
function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Read approved questions for a certification.
 *
 * Returns [] on missing, corrupt, non-array, or unavailable storage. Items
 * that fail schema validation are dropped defensively.
 */
export function getApproved(certId: string): GeneratedQuestion[] {
  if (!hasStorage()) {
    return [];
  }

  let raw: string | null;
  try {
    raw = localStorage.getItem(generatedQuestionsKey(certId));
  } catch {
    return [];
  }

  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is GeneratedQuestion => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    return validateQuestion(item as Question).valid;
  });
}

/**
 * Add approved questions to a certification's cache, merging by id (existing
 * entries win on collision). Write failures are swallowed (never throws).
 */
export function addApproved(
  certId: string,
  questions: GeneratedQuestion[]
): void {
  if (!hasStorage() || questions.length === 0) {
    return;
  }

  const existing = getApproved(certId);
  const byId = new Map<string, GeneratedQuestion>();
  for (const q of existing) {
    byId.set(q.id, q);
  }
  for (const q of questions) {
    if (!byId.has(q.id)) {
      byId.set(q.id, q);
    }
  }

  try {
    localStorage.setItem(
      generatedQuestionsKey(certId),
      JSON.stringify(Array.from(byId.values()))
    );
  } catch {
    // Degrade gracefully on quota / serialization errors.
  }
}

/** Remove only the given certification's cache. */
export function clear(certId: string): void {
  if (!hasStorage()) {
    return;
  }
  try {
    localStorage.removeItem(generatedQuestionsKey(certId));
  } catch {
    // Ignore.
  }
}

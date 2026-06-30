/**
 * CertFlow - Progress Storage Service
 *
 * Persists per-certification progress to localStorage. Records completed quiz
 * sessions as lightweight summaries and recomputes per-topic / per-subtopic
 * performance on every record. Degrades gracefully on missing/corrupt data and
 * never throws to the caller.
 */

import {
  recomputePerformance,
  summarizeSession,
  type SummarizableResult,
} from './aggregate';
import type { ProgressStorageResult, UserProgress } from './types';

const STORAGE_KEY_PREFIX = 'certflow_progress_';

export class ProgressStorage {
  /** localStorage key for a certification's progress. */
  private static key(certId: string): string {
    return `${STORAGE_KEY_PREFIX}${certId}`;
  }

  /** A valid, empty progress object for a certification. */
  private static empty(certId: string): UserProgress {
    return {
      certificationId: certId,
      sessions: [],
      topicPerformance: {},
      subtopicPerformance: {},
      lastActivity: '',
    };
  }

  /**
   * Load progress for a certification. Returns an empty UserProgress when
   * nothing is stored or when the stored data is missing/corrupt.
   */
  static getProgress(certId: string): UserProgress {
    if (typeof window === 'undefined') return this.empty(certId);

    try {
      const serialized = localStorage.getItem(this.key(certId));
      if (!serialized) return this.empty(certId);

      const parsed = JSON.parse(serialized);
      if (!this.isValidProgress(parsed)) {
        console.warn('Invalid progress format, using empty progress');
        return this.empty(certId);
      }

      return { ...this.empty(certId), ...parsed };
    } catch (error) {
      console.error('Failed to load progress:', error);
      return this.empty(certId);
    }
  }

  /**
   * Record a completed quiz session: append a lightweight summary, recompute
   * aggregate performance, and persist.
   */
  static recordSession(result: SummarizableResult): ProgressStorageResult<UserProgress> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'window is undefined' };
    }

    try {
      const certId = result.certificationId;
      const current = this.getProgress(certId);

      const sessions = [...current.sessions, summarizeSession(result)];
      const { topicPerformance, subtopicPerformance } =
        recomputePerformance(sessions);

      const updated: UserProgress = {
        certificationId: certId,
        sessions,
        topicPerformance,
        subtopicPerformance,
        lastActivity: new Date().toISOString(),
      };

      localStorage.setItem(this.key(certId), JSON.stringify(updated));
      return { success: true, data: updated };
    } catch (error) {
      console.error('Failed to record session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear progress for a single certification. Does not touch any other
   * localStorage keys (e.g. AI settings).
   */
  static reset(certId: string): ProgressStorageResult<void> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'window is undefined' };
    }

    try {
      localStorage.removeItem(this.key(certId));
      return { success: true };
    } catch (error) {
      console.error('Failed to reset progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Export a certification's progress as a pretty-printed JSON string. */
  static export(certId: string): ProgressStorageResult<string> {
    try {
      const progress = this.getProgress(certId);
      return { success: true, data: JSON.stringify(progress, null, 2) };
    } catch (error) {
      console.error('Failed to export progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import progress from a JSON string. Rejects malformed or structurally
   * invalid data without overwriting any existing progress.
   */
  static import(json: string): ProgressStorageResult<UserProgress> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'window is undefined' };
    }

    try {
      const parsed = JSON.parse(json);
      if (!this.isValidProgress(parsed)) {
        return { success: false, error: 'Invalid progress format' };
      }

      const progress = { ...this.empty(parsed.certificationId), ...parsed };
      localStorage.setItem(
        this.key(progress.certificationId),
        JSON.stringify(progress)
      );
      return { success: true, data: progress };
    } catch (error) {
      console.error('Failed to import progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /** Structural validation guard for a UserProgress object. */
  private static isValidProgress(obj: unknown): obj is UserProgress {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'certificationId' in obj &&
      typeof (obj as UserProgress).certificationId === 'string' &&
      'sessions' in obj &&
      Array.isArray((obj as UserProgress).sessions)
    );
  }
}

/** Convenience functions for direct use. */
export const getProgress = (certId: string) => ProgressStorage.getProgress(certId);
export const recordSession = (result: SummarizableResult) =>
  ProgressStorage.recordSession(result);
export const resetProgress = (certId: string) => ProgressStorage.reset(certId);

// Made with Bob

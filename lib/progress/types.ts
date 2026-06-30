/**
 * CertFlow - Progress Tracking Types
 *
 * Type definitions for per-topic / per-subtopic performance tracking and the
 * lightweight session summaries that back it. Persisted in localStorage,
 * keyed by certification id.
 */

/** Aggregate performance for a single topic or subtopic. */
export interface TopicPerformance {
  topicId: string;
  attempted: number;
  correct: number;
  averageScore: number; // 0-100, derived from correct/attempted
  lastPracticed: string; // ISO timestamp of the most recent session touching this topic
  trend: 'up' | 'down' | 'flat';
}

/** Per-topic / per-subtopic correct/total tally for a single session. */
export interface PerformanceBucket {
  correct: number;
  total: number;
}

/**
 * Lightweight record of a completed quiz session. Intentionally omits the full
 * `questions` and `answers` arrays of `QuizSessionResult` to keep localStorage
 * small; only the aggregate counts needed to recompute performance are kept.
 */
export interface SessionSummary {
  sessionId: string;
  certificationId: string;
  score: number; // percentage
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  totalQuestions: number;
  timeSpent: number; // seconds
  completedAt: string; // ISO timestamp
  topicBreakdown: Record<string, PerformanceBucket>;
  subtopicBreakdown: Record<string, PerformanceBucket>;
}

/** All tracked progress for a single certification. */
export interface UserProgress {
  certificationId: string;
  sessions: SessionSummary[];
  topicPerformance: Record<string, TopicPerformance>;
  subtopicPerformance: Record<string, TopicPerformance>;
  lastActivity: string; // ISO timestamp
}

/** Generic result envelope for progress storage operations. */
export interface ProgressStorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Minimum number of attempts a topic must have before it is eligible to be
 * surfaced as a "weak topic", so single-question samples do not dominate.
 */
export const WEAK_TOPIC_MIN_ATTEMPTS = 3;

/**
 * Score delta (in percentage points) below which a topic's trend reads as
 * 'flat' rather than 'up' or 'down'.
 */
export const TREND_FLAT_THRESHOLD = 5;

// Made with Bob

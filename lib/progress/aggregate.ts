/**
 * CertFlow - Progress Aggregation Helpers
 *
 * Pure functions that turn completed quiz results into lightweight session
 * summaries and derive per-topic / per-subtopic performance (including trends
 * and weak-topic ranking). No I/O — all persistence lives in
 * `progress-storage.ts`.
 */

import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';
import type { QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import {
  TREND_FLAT_THRESHOLD,
  WEAK_TOPIC_MIN_ATTEMPTS,
  type PerformanceBucket,
  type SessionSummary,
  type TopicPerformance,
} from './types';

/**
 * Input to `summarizeSession`: a `QuizSessionResult` augmented with the
 * certification id and completion timestamp, which the session manager tracks
 * on the session state but does not include on the result object itself.
 */
export type SummarizableResult = QuizSessionResult & {
  certificationId: string;
  completedAt: string;
};

/**
 * Convert a completed quiz result into a lightweight `SessionSummary`,
 * bucketing each question into per-topic and per-subtopic correct/total
 * tallies. Unanswered questions count toward `total` but never `correct`.
 */
export function summarizeSession(result: SummarizableResult): SessionSummary {
  const topicBreakdown: Record<string, PerformanceBucket> = {};
  const subtopicBreakdown: Record<string, PerformanceBucket> = {};

  for (const question of result.questions) {
    const userAnswer = result.answers[question.id];
    const isCorrect =
      userAnswer !== undefined &&
      QuizSessionManager.checkAnswer(question, userAnswer);

    bump(topicBreakdown, question.topicId, isCorrect);
    bump(subtopicBreakdown, question.subtopicId, isCorrect);
  }

  return {
    sessionId: result.sessionId,
    certificationId: result.certificationId,
    score: result.score,
    correctAnswers: result.correctAnswers,
    incorrectAnswers: result.incorrectAnswers,
    unanswered: result.unanswered,
    totalQuestions: result.totalQuestions,
    timeSpent: result.timeSpent,
    completedAt: result.completedAt,
    topicBreakdown,
    subtopicBreakdown,
  };
}

function bump(
  map: Record<string, PerformanceBucket>,
  key: string,
  isCorrect: boolean
): void {
  if (!map[key]) {
    map[key] = { correct: 0, total: 0 };
  }
  map[key].total += 1;
  if (isCorrect) {
    map[key].correct += 1;
  }
}

/**
 * Recompute aggregate per-topic and per-subtopic performance from the full
 * list of session summaries. Attempts/correct are summed across all sessions;
 * `trend` compares the two most recent attempts that touched the topic.
 */
export function recomputePerformance(sessions: SessionSummary[]): {
  topicPerformance: Record<string, TopicPerformance>;
  subtopicPerformance: Record<string, TopicPerformance>;
} {
  // Process sessions in chronological order so "most recent" is well-defined.
  const ordered = [...sessions].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt)
  );

  return {
    topicPerformance: aggregate(ordered, (s) => s.topicBreakdown),
    subtopicPerformance: aggregate(ordered, (s) => s.subtopicBreakdown),
  };
}

function aggregate(
  orderedSessions: SessionSummary[],
  pick: (s: SessionSummary) => Record<string, PerformanceBucket>
): Record<string, TopicPerformance> {
  const totals: Record<
    string,
    { attempted: number; correct: number; lastPracticed: string }
  > = {};
  // Per-topic, the chronological sequence of per-attempt scores (0-100).
  const attemptScores: Record<string, number[]> = {};

  for (const session of orderedSessions) {
    const buckets = pick(session);
    for (const [id, bucket] of Object.entries(buckets)) {
      if (bucket.total === 0) continue;

      if (!totals[id]) {
        totals[id] = { attempted: 0, correct: 0, lastPracticed: session.completedAt };
        attemptScores[id] = [];
      }
      totals[id].attempted += bucket.total;
      totals[id].correct += bucket.correct;
      totals[id].lastPracticed = session.completedAt;
      attemptScores[id].push((bucket.correct / bucket.total) * 100);
    }
  }

  const performance: Record<string, TopicPerformance> = {};
  for (const [id, t] of Object.entries(totals)) {
    performance[id] = {
      topicId: id,
      attempted: t.attempted,
      correct: t.correct,
      averageScore:
        t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
      lastPracticed: t.lastPracticed,
      trend: computeTrend(attemptScores[id]),
    };
  }

  return performance;
}

/**
 * Determine the trend from the two most recent per-attempt scores. A single
 * attempt (or none) is 'flat'; deltas within `TREND_FLAT_THRESHOLD` are 'flat'.
 */
function computeTrend(scores: number[]): 'up' | 'down' | 'flat' {
  if (scores.length < 2) return 'flat';
  const previous = scores[scores.length - 2];
  const latest = scores[scores.length - 1];
  const delta = latest - previous;
  if (delta > TREND_FLAT_THRESHOLD) return 'up';
  if (delta < -TREND_FLAT_THRESHOLD) return 'down';
  return 'flat';
}

/**
 * Rank topics from weakest to strongest by `averageScore` ascending, excluding
 * any topic that has not yet met the minimum-attempts floor.
 */
export function rankWeakTopics(
  topicPerformance: Record<string, TopicPerformance>
): TopicPerformance[] {
  return Object.values(topicPerformance)
    .filter((t) => t.attempted >= WEAK_TOPIC_MIN_ATTEMPTS)
    .sort((a, b) => a.averageScore - b.averageScore);
}

// Made with Bob

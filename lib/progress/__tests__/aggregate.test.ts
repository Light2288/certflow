import { describe, it, expect } from 'vitest';
import {
  summarizeSession,
  recomputePerformance,
  rankWeakTopics,
} from '../aggregate';
import {
  WEAK_TOPIC_MIN_ATTEMPTS,
  TREND_FLAT_THRESHOLD,
  type SessionSummary,
  type TopicPerformance,
} from '../types';
import type { QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import type { Question } from '@/lib/types/certification';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mcQuestion(
  id: string,
  topicId: string,
  subtopicId: string,
  correctAnswer = 'a'
): Question {
  return {
    id,
    topicId,
    subtopicId,
    type: 'multiple-choice',
    difficulty: 'medium',
    question: `Question ${id}?`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correctAnswer,
    explanation: { correct: 'because', whyOthersWrong: {} },
    metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'test' },
  };
}

/**
 * Build a QuizSessionResult from questions + an answers map. Counts are derived
 * the same way QuizSessionManager.calculateResults would.
 */
function buildResult(
  sessionId: string,
  certificationId: string,
  questions: Question[],
  answers: Record<string, string | string[]>,
  timeSpent = 120,
  completedAt = '2026-01-01T00:00:00.000Z'
): QuizSessionResult & { certificationId: string; completedAt: string } {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined) {
      unanswered++;
    } else if (a === q.correctAnswer) {
      correct++;
    } else {
      incorrect++;
    }
  }
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return {
    sessionId,
    certificationId,
    totalQuestions: total,
    correctAnswers: correct,
    incorrectAnswers: incorrect,
    unanswered,
    score,
    timeSpent,
    answers,
    questions,
    completedAt,
  };
}

// ---------------------------------------------------------------------------
// summarizeSession
// ---------------------------------------------------------------------------

describe('summarizeSession', () => {
  it('buckets correct/total per topic and subtopic', () => {
    const questions = [
      mcQuestion('q1', 'topicA', 'subA1'),
      mcQuestion('q2', 'topicA', 'subA2'),
      mcQuestion('q3', 'topicB', 'subB1'),
    ];
    const answers = { q1: 'a', q2: 'b', q3: 'a' }; // q1 correct, q2 wrong, q3 correct
    const result = buildResult('s1', 'aws-ml', questions, answers);

    const summary = summarizeSession(result);

    expect(summary.sessionId).toBe('s1');
    expect(summary.certificationId).toBe('aws-ml');
    expect(summary.totalQuestions).toBe(3);
    expect(summary.topicBreakdown.topicA).toEqual({ correct: 1, total: 2 });
    expect(summary.topicBreakdown.topicB).toEqual({ correct: 1, total: 1 });
    expect(summary.subtopicBreakdown.subA1).toEqual({ correct: 1, total: 1 });
    expect(summary.subtopicBreakdown.subA2).toEqual({ correct: 0, total: 1 });
    expect(summary.subtopicBreakdown.subB1).toEqual({ correct: 1, total: 1 });
  });

  it('counts unanswered questions toward total but not correct', () => {
    const questions = [
      mcQuestion('q1', 'topicA', 'subA1'),
      mcQuestion('q2', 'topicA', 'subA1'),
    ];
    const answers = { q1: 'a' }; // q2 unanswered
    const result = buildResult('s1', 'aws-ml', questions, answers);

    const summary = summarizeSession(result);

    expect(summary.topicBreakdown.topicA).toEqual({ correct: 1, total: 2 });
    expect(summary.unanswered).toBe(1);
  });

  it('does not retain full question or answer arrays (lightweight)', () => {
    const questions = [mcQuestion('q1', 'topicA', 'subA1')];
    const result = buildResult('s1', 'aws-ml', questions, { q1: 'a' });

    const summary = summarizeSession(result) as unknown as Record<string, unknown>;

    expect(summary.questions).toBeUndefined();
    expect(summary.answers).toBeUndefined();
  });

  it('preserves session score, counts, time and completedAt', () => {
    const questions = [
      mcQuestion('q1', 'topicA', 'subA1'),
      mcQuestion('q2', 'topicA', 'subA1'),
    ];
    const result = buildResult('s1', 'aws-ml', questions, { q1: 'a', q2: 'a' }, 300, '2026-02-02T10:00:00.000Z');

    const summary = summarizeSession(result);

    expect(summary.score).toBe(100);
    expect(summary.correctAnswers).toBe(2);
    expect(summary.timeSpent).toBe(300);
    expect(summary.completedAt).toBe('2026-02-02T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// recomputePerformance
// ---------------------------------------------------------------------------

describe('recomputePerformance', () => {
  function summaryWith(
    sessionId: string,
    topicBreakdown: Record<string, { correct: number; total: number }>,
    completedAt: string
  ): SessionSummary {
    return {
      sessionId,
      certificationId: 'aws-ml',
      score: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unanswered: 0,
      totalQuestions: 0,
      timeSpent: 0,
      completedAt,
      topicBreakdown,
      subtopicBreakdown: {},
    };
  }

  it('aggregates attempted/correct across sessions', () => {
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 1, total: 2 } }, '2026-01-01T00:00:00.000Z'),
      summaryWith('s2', { topicA: { correct: 2, total: 2 } }, '2026-01-02T00:00:00.000Z'),
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.attempted).toBe(4);
    expect(topicPerformance.topicA.correct).toBe(3);
    expect(topicPerformance.topicA.averageScore).toBe(75); // 3/4
  });

  it('sets lastPracticed to the most recent session that touched the topic', () => {
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 1, total: 1 } }, '2026-01-01T00:00:00.000Z'),
      summaryWith('s2', { topicB: { correct: 1, total: 1 } }, '2026-01-05T00:00:00.000Z'),
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.lastPracticed).toBe('2026-01-01T00:00:00.000Z');
    expect(topicPerformance.topicB.lastPracticed).toBe('2026-01-05T00:00:00.000Z');
  });

  it('computes an "up" trend when the latest attempt scores higher', () => {
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 0, total: 2 } }, '2026-01-01T00:00:00.000Z'), // 0%
      summaryWith('s2', { topicA: { correct: 2, total: 2 } }, '2026-01-02T00:00:00.000Z'), // 100%
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.trend).toBe('up');
  });

  it('computes a "down" trend when the latest attempt scores lower', () => {
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 2, total: 2 } }, '2026-01-01T00:00:00.000Z'), // 100%
      summaryWith('s2', { topicA: { correct: 0, total: 2 } }, '2026-01-02T00:00:00.000Z'), // 0%
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.trend).toBe('down');
  });

  it('computes a "flat" trend when scores are within the flat threshold', () => {
    // Two near-equal scores: 100% then 100%
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 2, total: 2 } }, '2026-01-01T00:00:00.000Z'),
      summaryWith('s2', { topicA: { correct: 2, total: 2 } }, '2026-01-02T00:00:00.000Z'),
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.trend).toBe('flat');
    // Sanity: the threshold is a positive number.
    expect(TREND_FLAT_THRESHOLD).toBeGreaterThan(0);
  });

  it('resolves trend to "flat" for a single attempt', () => {
    const sessions: SessionSummary[] = [
      summaryWith('s1', { topicA: { correct: 1, total: 2 } }, '2026-01-01T00:00:00.000Z'),
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.trend).toBe('flat');
  });

  it('orders attempts chronologically regardless of session array order', () => {
    // Provide out-of-order sessions; latest (by completedAt) is the high score.
    const sessions: SessionSummary[] = [
      summaryWith('s2', { topicA: { correct: 2, total: 2 } }, '2026-01-02T00:00:00.000Z'), // later, 100%
      summaryWith('s1', { topicA: { correct: 0, total: 2 } }, '2026-01-01T00:00:00.000Z'), // earlier, 0%
    ];

    const { topicPerformance } = recomputePerformance(sessions);

    expect(topicPerformance.topicA.trend).toBe('up');
  });

  it('aggregates subtopic performance independently', () => {
    const sessions: SessionSummary[] = [
      {
        ...summaryWith('s1', {}, '2026-01-01T00:00:00.000Z'),
        subtopicBreakdown: { subA: { correct: 1, total: 2 } },
      },
    ];

    const { subtopicPerformance } = recomputePerformance(sessions);

    expect(subtopicPerformance.subA.attempted).toBe(2);
    expect(subtopicPerformance.subA.correct).toBe(1);
    expect(subtopicPerformance.subA.averageScore).toBe(50);
  });

  it('returns empty maps for no sessions', () => {
    const { topicPerformance, subtopicPerformance } = recomputePerformance([]);
    expect(topicPerformance).toEqual({});
    expect(subtopicPerformance).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// rankWeakTopics
// ---------------------------------------------------------------------------

describe('rankWeakTopics', () => {
  function perf(
    topicId: string,
    averageScore: number,
    attempted: number
  ): TopicPerformance {
    return {
      topicId,
      attempted,
      correct: Math.round((averageScore / 100) * attempted),
      averageScore,
      lastPracticed: '2026-01-01T00:00:00.000Z',
      trend: 'flat',
    };
  }

  it('ranks topics ascending by averageScore', () => {
    const map = {
      a: perf('a', 80, WEAK_TOPIC_MIN_ATTEMPTS + 5),
      b: perf('b', 40, WEAK_TOPIC_MIN_ATTEMPTS + 5),
      c: perf('c', 60, WEAK_TOPIC_MIN_ATTEMPTS + 5),
    };

    const ranked = rankWeakTopics(map);

    expect(ranked.map((t) => t.topicId)).toEqual(['b', 'c', 'a']);
  });

  it('excludes topics below the minimum-attempts floor', () => {
    const map = {
      a: perf('a', 10, WEAK_TOPIC_MIN_ATTEMPTS - 1), // too few attempts -> excluded
      b: perf('b', 90, WEAK_TOPIC_MIN_ATTEMPTS), // enough attempts -> included
    };

    const ranked = rankWeakTopics(map);

    expect(ranked.map((t) => t.topicId)).toEqual(['b']);
  });

  it('returns an empty array when no topics meet the floor', () => {
    const map = {
      a: perf('a', 10, WEAK_TOPIC_MIN_ATTEMPTS - 1),
    };
    expect(rankWeakTopics(map)).toEqual([]);
  });
});

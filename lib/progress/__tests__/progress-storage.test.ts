import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressStorage } from '../progress-storage';
import type { SummarizableResult } from '../aggregate';
import type { UserProgress } from '../types';
import type { Question } from '@/lib/types/certification';

const AI_SETTINGS_KEY = 'certflow_ai_settings';

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
    ],
    correctAnswer,
    explanation: { correct: 'because', whyOthersWrong: {} },
    metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'test' },
  };
}

function buildResult(
  sessionId: string,
  certificationId: string,
  questions: Question[],
  answers: Record<string, string | string[]>,
  completedAt = '2026-01-01T00:00:00.000Z'
): SummarizableResult {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined) unanswered++;
    else if (a === q.correctAnswer) correct++;
    else incorrect++;
  }
  const total = questions.length;
  return {
    sessionId,
    certificationId,
    totalQuestions: total,
    correctAnswers: correct,
    incorrectAnswers: incorrect,
    unanswered,
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    timeSpent: 60,
    answers,
    questions,
    completedAt,
  };
}

describe('ProgressStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getProgress', () => {
    it('returns an empty UserProgress for an unknown cert', () => {
      const progress = ProgressStorage.getProgress('aws-ml');
      expect(progress.certificationId).toBe('aws-ml');
      expect(progress.sessions).toEqual([]);
      expect(progress.topicPerformance).toEqual({});
      expect(progress.subtopicPerformance).toEqual({});
    });

    it('falls back to empty progress for a corrupt stored entry', () => {
      localStorage.setItem('certflow_progress_aws-ml', '{ not valid json');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const progress = ProgressStorage.getProgress('aws-ml');

      expect(progress.sessions).toEqual([]);
      expect(progress.topicPerformance).toEqual({});
      spy.mockRestore();
    });
  });

  describe('recordSession', () => {
    it('persists a session and recomputes topic performance', () => {
      const questions = [
        mcQuestion('q1', 'topicA', 'subA'),
        mcQuestion('q2', 'topicA', 'subA'),
      ];
      const result = buildResult('s1', 'aws-ml', questions, { q1: 'a', q2: 'b' });

      ProgressStorage.recordSession(result);

      const progress = ProgressStorage.getProgress('aws-ml');
      expect(progress.sessions).toHaveLength(1);
      expect(progress.sessions[0].sessionId).toBe('s1');
      expect(progress.topicPerformance.topicA.attempted).toBe(2);
      expect(progress.topicPerformance.topicA.correct).toBe(1);
      expect(progress.topicPerformance.topicA.averageScore).toBe(50);
      expect(progress.subtopicPerformance.subA.attempted).toBe(2);
      expect(progress.lastActivity).toBeTruthy();
    });

    it('aggregates across multiple recorded sessions', () => {
      const questions = [mcQuestion('q1', 'topicA', 'subA')];
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', questions, { q1: 'b' }, '2026-01-01T00:00:00.000Z')
      );
      ProgressStorage.recordSession(
        buildResult('s2', 'aws-ml', questions, { q1: 'a' }, '2026-01-02T00:00:00.000Z')
      );

      const progress = ProgressStorage.getProgress('aws-ml');
      expect(progress.sessions).toHaveLength(2);
      expect(progress.topicPerformance.topicA.attempted).toBe(2);
      expect(progress.topicPerformance.topicA.correct).toBe(1);
      expect(progress.topicPerformance.topicA.trend).toBe('up');
    });

    it('does not retain full questions/answers arrays in stored sessions', () => {
      const questions = [mcQuestion('q1', 'topicA', 'subA')];
      ProgressStorage.recordSession(buildResult('s1', 'aws-ml', questions, { q1: 'a' }));

      const raw = JSON.parse(localStorage.getItem('certflow_progress_aws-ml')!);
      expect(raw.sessions[0].questions).toBeUndefined();
      expect(raw.sessions[0].answers).toBeUndefined();
    });

    it('keeps progress isolated per certification', () => {
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', [mcQuestion('q1', 'topicA', 'subA')], { q1: 'a' })
      );
      ProgressStorage.recordSession(
        buildResult('s2', 'other-cert', [mcQuestion('q1', 'topicX', 'subX')], { q1: 'b' })
      );

      const aws = ProgressStorage.getProgress('aws-ml');
      const other = ProgressStorage.getProgress('other-cert');

      expect(aws.topicPerformance.topicA).toBeDefined();
      expect(aws.topicPerformance.topicX).toBeUndefined();
      expect(other.topicPerformance.topicX).toBeDefined();
      expect(other.topicPerformance.topicA).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('clears progress for the cert without touching AI settings', () => {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ provider: 'mock' }));
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', [mcQuestion('q1', 'topicA', 'subA')], { q1: 'a' })
      );

      ProgressStorage.reset('aws-ml');

      expect(localStorage.getItem('certflow_progress_aws-ml')).toBeNull();
      expect(localStorage.getItem(AI_SETTINGS_KEY)).toBe(
        JSON.stringify({ provider: 'mock' })
      );
      // getProgress still returns a valid empty object after reset.
      expect(ProgressStorage.getProgress('aws-ml').sessions).toEqual([]);
    });
  });

  describe('export / import', () => {
    it('round-trips progress for a cert', () => {
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', [mcQuestion('q1', 'topicA', 'subA')], { q1: 'a' })
      );

      const exported = ProgressStorage.export('aws-ml');
      expect(exported.success).toBe(true);
      const json = exported.data!;

      localStorage.clear();
      const imported = ProgressStorage.import(json);
      expect(imported.success).toBe(true);

      const progress = ProgressStorage.getProgress('aws-ml');
      expect(progress.sessions).toHaveLength(1);
      expect(progress.topicPerformance.topicA).toBeDefined();
    });

    it('rejects malformed import JSON without clobbering existing data', () => {
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', [mcQuestion('q1', 'topicA', 'subA')], { q1: 'a' })
      );
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = ProgressStorage.import('{ not valid json');

      expect(result.success).toBe(false);
      // Existing good progress is untouched.
      expect(ProgressStorage.getProgress('aws-ml').sessions).toHaveLength(1);
      spy.mockRestore();
    });

    it('rejects structurally invalid import without clobbering existing data', () => {
      ProgressStorage.recordSession(
        buildResult('s1', 'aws-ml', [mcQuestion('q1', 'topicA', 'subA')], { q1: 'a' })
      );

      const result = ProgressStorage.import(JSON.stringify({ foo: 'bar' }));

      expect(result.success).toBe(false);
      expect(ProgressStorage.getProgress('aws-ml').sessions).toHaveLength(1);
    });

    it('imports a valid UserProgress object', () => {
      const progress: UserProgress = {
        certificationId: 'imported-cert',
        sessions: [],
        topicPerformance: {},
        subtopicPerformance: {},
        lastActivity: '2026-01-01T00:00:00.000Z',
      };

      const result = ProgressStorage.import(JSON.stringify(progress));

      expect(result.success).toBe(true);
      expect(ProgressStorage.getProgress('imported-cert').certificationId).toBe(
        'imported-cert'
      );
    });
  });
});

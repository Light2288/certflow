/**
 * CertFlow - Quiz Session Manager Tests
 * 
 * Tests for quiz session management functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuizSessionManager } from '../quiz-session-manager';
import type { Question } from '@/lib/types/certification';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockQuestions: Question[] = [
  {
    id: 'q1',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multiple-choice',
    difficulty: 'easy',
    question: 'What is 2 + 2?',
    options: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
      { id: 'c', text: '5' },
    ],
    correctAnswer: 'b',
    explanation: {
      correct: '2 + 2 equals 4',
      whyOthersWrong: {
        a: '3 is incorrect',
        c: '5 is incorrect',
      },
    },
    metadata: {
      createdAt: '2024-01-01',
      lastReviewed: '2024-01-01',
      source: 'test',
    },
  },
  {
    id: 'q2',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multi-select',
    difficulty: 'medium',
    question: 'Select all prime numbers',
    options: [
      { id: 'a', text: '2' },
      { id: 'b', text: '3' },
      { id: 'c', text: '4' },
      { id: 'd', text: '5' },
    ],
    correctAnswer: ['a', 'b', 'd'],
    explanation: {
      correct: '2, 3, and 5 are prime numbers',
      whyOthersWrong: {
        c: '4 is not prime',
      },
    },
    metadata: {
      createdAt: '2024-01-01',
      lastReviewed: '2024-01-01',
      source: 'test',
    },
  },
  {
    id: 'q3',
    topicId: 't2',
    subtopicId: 'st2',
    type: 'multiple-choice',
    difficulty: 'hard',
    question: 'What is the capital of France?',
    options: [
      { id: 'a', text: 'London' },
      { id: 'b', text: 'Paris' },
      { id: 'c', text: 'Berlin' },
    ],
    correctAnswer: 'b',
    explanation: {
      correct: 'Paris is the capital of France',
      whyOthersWrong: {
        a: 'London is the capital of UK',
        c: 'Berlin is the capital of Germany',
      },
    },
    metadata: {
      createdAt: '2024-01-01',
      lastReviewed: '2024-01-01',
      source: 'test',
    },
  },
];

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

describe('QuizSessionManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  // ==========================================================================
  // SESSION CREATION
  // ==========================================================================

  describe('createSession', () => {
    it('should create a new session with correct structure', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      expect(session).toMatchObject({
        certificationId: 'aws-ml',
        questions: mockQuestions,
        currentQuestionIndex: 0,
        answers: {},
      });
      expect(session.sessionId).toBeDefined();
      expect(session.startedAt).toBeDefined();
      expect(session.completedAt).toBeUndefined();
    });

    it('should generate unique session IDs', () => {
      const session1 = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const session2 = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it('should save session to localStorage', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const key = `certflow_quiz_session_${session.sessionId}`;
      const stored = localStorage.getItem(key);

      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toMatchObject(session);
    });

    it('should set as active session', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const activeId = QuizSessionManager.getActiveSessionId();
      expect(activeId).toBe(session.sessionId);
    });
  });

  // ==========================================================================
  // SESSION LOADING
  // ==========================================================================

  describe('loadSession', () => {
    it('should load existing session', () => {
      const created = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const loaded = QuizSessionManager.loadSession(created.sessionId);

      expect(loaded).toMatchObject(created);
    });

    it('should return null for non-existent session', () => {
      const loaded = QuizSessionManager.loadSession('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle corrupted data gracefully', () => {
      const sessionId = 'corrupted-session';
      localStorage.setItem(
        `certflow_quiz_session_${sessionId}`,
        'invalid json'
      );

      const loaded = QuizSessionManager.loadSession(sessionId);
      expect(loaded).toBeNull();
    });
  });

  describe('loadActiveSession', () => {
    it('should load the active session', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const active = QuizSessionManager.loadActiveSession();
      expect(active).toMatchObject(session);
    });

    it('should return null when no active session', () => {
      const active = QuizSessionManager.loadActiveSession();
      expect(active).toBeNull();
    });
  });

  // ==========================================================================
  // ANSWER MANAGEMENT
  // ==========================================================================

  describe('updateAnswer', () => {
    it('should update answer for multiple-choice question', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const updated = QuizSessionManager.updateAnswer(session, 'q1', 'b');

      expect(updated.answers['q1']).toBe('b');
    });

    it('should update answer for multi-select question', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const updated = QuizSessionManager.updateAnswer(session, 'q2', [
        'a',
        'b',
        'd',
      ]);

      expect(updated.answers['q2']).toEqual(['a', 'b', 'd']);
    });

    it('should overwrite existing answer', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      session = QuizSessionManager.updateAnswer(session, 'q1', 'a');
      expect(session.answers['q1']).toBe('a');

      session = QuizSessionManager.updateAnswer(session, 'q1', 'b');
      expect(session.answers['q1']).toBe('b');
    });

    it('should persist answer to localStorage', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      QuizSessionManager.updateAnswer(session, 'q1', 'b');

      const loaded = QuizSessionManager.loadSession(session.sessionId);
      expect(loaded?.answers['q1']).toBe('b');
    });
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  describe('nextQuestion', () => {
    it('should move to next question', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const updated = QuizSessionManager.nextQuestion(session);
      expect(updated.currentQuestionIndex).toBe(1);
    });

    it('should not go beyond last question', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      // Move to last question
      session = QuizSessionManager.goToQuestion(session, 2);
      expect(session.currentQuestionIndex).toBe(2);

      // Try to go beyond
      session = QuizSessionManager.nextQuestion(session);
      expect(session.currentQuestionIndex).toBe(2);
    });
  });

  describe('previousQuestion', () => {
    it('should move to previous question', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      session = QuizSessionManager.nextQuestion(session);
      session = QuizSessionManager.previousQuestion(session);

      expect(session.currentQuestionIndex).toBe(0);
    });

    it('should not go below first question', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const updated = QuizSessionManager.previousQuestion(session);
      expect(updated.currentQuestionIndex).toBe(0);
    });
  });

  describe('goToQuestion', () => {
    it('should jump to specific question', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const updated = QuizSessionManager.goToQuestion(session, 2);
      expect(updated.currentQuestionIndex).toBe(2);
    });

    it('should clamp to valid range', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const tooHigh = QuizSessionManager.goToQuestion(session, 999);
      expect(tooHigh.currentQuestionIndex).toBe(2);

      const tooLow = QuizSessionManager.goToQuestion(session, -1);
      expect(tooLow.currentQuestionIndex).toBe(0);
    });
  });

  // ==========================================================================
  // SESSION COMPLETION
  // ==========================================================================

  describe('completeSession', () => {
    it('should mark session as completed', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const completed = QuizSessionManager.completeSession(session);

      expect(completed.completedAt).toBeDefined();
      expect(completed.timeSpent).toBeGreaterThanOrEqual(0);
    });

    it('should clear active session', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      QuizSessionManager.completeSession(session);

      const activeId = QuizSessionManager.getActiveSessionId();
      expect(activeId).toBeNull();
    });

    it('should calculate time spent', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      // Wait a bit
      const startTime = new Date(session.startedAt).getTime();
      const completed = QuizSessionManager.completeSession(session);
      const endTime = new Date(completed.completedAt!).getTime();

      expect(completed.timeSpent).toBeGreaterThanOrEqual(0);
      expect(endTime).toBeGreaterThanOrEqual(startTime);
    });
  });

  // ==========================================================================
  // RESULTS CALCULATION
  // ==========================================================================

  describe('calculateResults', () => {
    it('should calculate correct results for all correct answers', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      session = QuizSessionManager.updateAnswer(session, 'q1', 'b');
      session = QuizSessionManager.updateAnswer(session, 'q2', ['a', 'b', 'd']);
      session = QuizSessionManager.updateAnswer(session, 'q3', 'b');

      const results = QuizSessionManager.calculateResults(session);

      expect(results.totalQuestions).toBe(3);
      expect(results.correctAnswers).toBe(3);
      expect(results.incorrectAnswers).toBe(0);
      expect(results.unanswered).toBe(0);
      expect(results.score).toBe(100);
    });

    it('should calculate correct results for mixed answers', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      session = QuizSessionManager.updateAnswer(session, 'q1', 'b'); // correct
      session = QuizSessionManager.updateAnswer(session, 'q2', ['a', 'b']); // incorrect (missing 'd')
      // q3 not answered

      const results = QuizSessionManager.calculateResults(session);

      expect(results.totalQuestions).toBe(3);
      expect(results.correctAnswers).toBe(1);
      expect(results.incorrectAnswers).toBe(1);
      expect(results.unanswered).toBe(1);
      expect(results.score).toBe(33); // 1/3 = 33.33% rounded to 33
    });

    it('should handle all incorrect answers', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      session = QuizSessionManager.updateAnswer(session, 'q1', 'a');
      session = QuizSessionManager.updateAnswer(session, 'q2', ['c']);
      session = QuizSessionManager.updateAnswer(session, 'q3', 'a');

      const results = QuizSessionManager.calculateResults(session);

      expect(results.correctAnswers).toBe(0);
      expect(results.incorrectAnswers).toBe(3);
      expect(results.score).toBe(0);
    });
  });

  describe('checkAnswer', () => {
    it('should check multiple-choice answer correctly', () => {
      const question = mockQuestions[0];

      expect(QuizSessionManager.checkAnswer(question, 'b')).toBe(true);
      expect(QuizSessionManager.checkAnswer(question, 'a')).toBe(false);
    });

    it('should check multi-select answer correctly', () => {
      const question = mockQuestions[1];

      expect(
        QuizSessionManager.checkAnswer(question, ['a', 'b', 'd'])
      ).toBe(true);
      expect(
        QuizSessionManager.checkAnswer(question, ['d', 'b', 'a'])
      ).toBe(true); // order doesn't matter
      expect(QuizSessionManager.checkAnswer(question, ['a', 'b'])).toBe(false);
      expect(
        QuizSessionManager.checkAnswer(question, ['a', 'b', 'c', 'd'])
      ).toBe(false);
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  describe('deleteSession', () => {
    it('should delete session from localStorage', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      QuizSessionManager.deleteSession(session.sessionId);

      const loaded = QuizSessionManager.loadSession(session.sessionId);
      expect(loaded).toBeNull();
    });

    it('should clear active session if deleted', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      QuizSessionManager.deleteSession(session.sessionId);

      const activeId = QuizSessionManager.getActiveSessionId();
      expect(activeId).toBeNull();
    });
  });

  describe('getAllSessionIds', () => {
    it('should return all session IDs', () => {
      const session1 = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const session2 = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const ids = QuizSessionManager.getAllSessionIds();

      expect(ids).toContain(session1.sessionId);
      expect(ids).toContain(session2.sessionId);
      expect(ids.length).toBe(2);
    });

    it('should return empty array when no sessions', () => {
      const ids = QuizSessionManager.getAllSessionIds();
      expect(ids).toEqual([]);
    });
  });

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  describe('getProgress', () => {
    it('should calculate progress percentage', () => {
      let session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      expect(QuizSessionManager.getProgress(session)).toBe(0);

      session = QuizSessionManager.updateAnswer(session, 'q1', 'b');
      expect(QuizSessionManager.getProgress(session)).toBe(33); // 1/3

      session = QuizSessionManager.updateAnswer(session, 'q2', ['a', 'b']);
      expect(QuizSessionManager.getProgress(session)).toBe(67); // 2/3

      session = QuizSessionManager.updateAnswer(session, 'q3', 'b');
      expect(QuizSessionManager.getProgress(session)).toBe(100); // 3/3
    });
  });

  describe('isComplete', () => {
    it('should return false for incomplete session', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      expect(QuizSessionManager.isComplete(session)).toBe(false);
    });

    it('should return true for completed session', () => {
      const session = QuizSessionManager.createSession({
        certificationId: 'aws-ml',
        questions: mockQuestions,
      });

      const completed = QuizSessionManager.completeSession(session);
      expect(QuizSessionManager.isComplete(completed)).toBe(true);
    });
  });
});

// Made with Bob

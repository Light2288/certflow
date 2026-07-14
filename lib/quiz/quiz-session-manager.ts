/**
 * CertFlow - Quiz Session Manager
 * 
 * Manages quiz sessions including creation, state management, and persistence.
 * Handles localStorage operations for session data.
 */

import type { Question } from '@/lib/types/certification';

// ============================================================================
// TYPES
// ============================================================================

export interface QuizSessionState {
  sessionId: string;
  certificationId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>; // questionId -> answer(s)
  visited: number[]; // 0-based indices of questions the user has visited
  startedAt: string; // ISO string for serialization
  completedAt?: string; // ISO string for serialization
  timeSpent?: number; // in seconds
}

export interface QuizSessionOptions {
  certificationId: string;
  questions: Question[];
}

export interface QuizSessionResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  score: number; // percentage
  timeSpent: number; // in seconds
  answers: Record<string, string | string[]>;
  questions: Question[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY_PREFIX = 'certflow_quiz_session_';
const ACTIVE_SESSION_KEY = 'certflow_active_session';

// ============================================================================
// SESSION MANAGER CLASS
// ============================================================================

export class QuizSessionManager {
  /**
   * Create a new quiz session
   */
  static createSession(options: QuizSessionOptions): QuizSessionState {
    const sessionId = this.generateSessionId();
    
    const session: QuizSessionState = {
      sessionId,
      certificationId: options.certificationId,
      questions: options.questions,
      currentQuestionIndex: 0,
      answers: {},
      visited: [0],
      startedAt: new Date().toISOString(),
    };

    // Save to localStorage
    this.saveSession(session);
    this.setActiveSession(sessionId);

    return session;
  }

  /**
   * Load a session by ID
   */
  static loadSession(sessionId: string): QuizSessionState | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const data = localStorage.getItem(key);
      
      if (!data) return null;

      const session = JSON.parse(data) as QuizSessionState;

      // Older persisted sessions may lack the `visited` field; normalize it to
      // an empty array so downstream consumers can rely on its presence.
      if (!Array.isArray(session.visited)) {
        session.visited = [];
      }

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Save session to localStorage
   */
  static saveSession(session: QuizSessionState): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `${STORAGE_KEY_PREFIX}${session.sessionId}`;
      localStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Get the active session ID
   */
  static getActiveSessionId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }

  /**
   * Set the active session ID
   */
  static setActiveSession(sessionId: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    } catch (error) {
      console.error('Failed to set active session:', error);
    }
  }

  /**
   * Load the active session
   */
  static loadActiveSession(): QuizSessionState | null {
    const sessionId = this.getActiveSessionId();
    if (!sessionId) return null;

    return this.loadSession(sessionId);
  }

  /**
   * Update session answer
   */
  static updateAnswer(
    session: QuizSessionState,
    questionId: string,
    answer: string | string[]
  ): QuizSessionState {
    const updatedSession = {
      ...session,
      answers: {
        ...session.answers,
        [questionId]: answer,
      },
    };

    this.saveSession(updatedSession);
    return updatedSession;
  }

  /**
   * Return a visited list with `index` added, deduplicated and clamped to the
   * valid question range. Out-of-range indices are ignored.
   */
  private static addVisited(
    session: QuizSessionState,
    index: number
  ): number[] {
    const existing = Array.isArray(session.visited) ? session.visited : [];

    if (index < 0 || index >= session.questions.length) {
      return existing;
    }

    if (existing.includes(index)) {
      return existing;
    }

    return [...existing, index];
  }

  /**
   * Navigate to next question
   */
  static nextQuestion(session: QuizSessionState): QuizSessionState {
    const nextIndex = Math.min(
      session.currentQuestionIndex + 1,
      session.questions.length - 1
    );

    const updatedSession = {
      ...session,
      currentQuestionIndex: nextIndex,
      visited: this.addVisited(session, nextIndex),
    };

    this.saveSession(updatedSession);
    return updatedSession;
  }

  /**
   * Navigate to previous question
   */
  static previousQuestion(session: QuizSessionState): QuizSessionState {
    const prevIndex = Math.max(session.currentQuestionIndex - 1, 0);

    const updatedSession = {
      ...session,
      currentQuestionIndex: prevIndex,
      visited: this.addVisited(session, prevIndex),
    };

    this.saveSession(updatedSession);
    return updatedSession;
  }

  /**
   * Jump to specific question
   */
  static goToQuestion(
    session: QuizSessionState,
    index: number
  ): QuizSessionState {
    const validIndex = Math.max(
      0,
      Math.min(index, session.questions.length - 1)
    );

    const updatedSession = {
      ...session,
      currentQuestionIndex: validIndex,
      visited: this.addVisited(session, validIndex),
    };

    this.saveSession(updatedSession);
    return updatedSession;
  }

  /**
   * Complete the session
   */
  static completeSession(session: QuizSessionState): QuizSessionState {
    const completedAt = new Date().toISOString();
    const startedAt = new Date(session.startedAt);
    const timeSpent = Math.floor(
      (new Date(completedAt).getTime() - startedAt.getTime()) / 1000
    );

    const updatedSession = {
      ...session,
      completedAt,
      timeSpent,
    };

    this.saveSession(updatedSession);
    this.clearActiveSession();

    return updatedSession;
  }

  /**
   * Calculate session results
   */
  static calculateResults(session: QuizSessionState): QuizSessionResult {
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;

    session.questions.forEach((question) => {
      const userAnswer = session.answers[question.id];

      if (!userAnswer) {
        unanswered++;
        return;
      }

      const isCorrect = this.checkAnswer(question, userAnswer);
      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }
    });

    const totalQuestions = session.questions.length;
    const score = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

    return {
      sessionId: session.sessionId,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      score,
      timeSpent: session.timeSpent || 0,
      answers: session.answers,
      questions: session.questions,
    };
  }

  /**
   * Check if an answer is correct
   */
  static checkAnswer(
    question: Question,
    userAnswer: string | string[]
  ): boolean {
    if (question.type === 'multiple-choice') {
      return userAnswer === question.correctAnswer;
    } else if (question.type === 'multi-select') {
      const correctAnswers = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      const userAnswers = Array.isArray(userAnswer)
        ? userAnswer
        : [userAnswer];

      // Check if arrays have same length and same elements
      if (correctAnswers.length !== userAnswers.length) return false;

      const sortedCorrect = [...correctAnswers].sort();
      const sortedUser = [...userAnswers].sort();

      return sortedCorrect.every(
        (answer, index) => answer === sortedUser[index]
      );
    }

    return false;
  }

  /**
   * Clear active session
   */
  static clearActiveSession(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear active session:', error);
    }
  }

  /**
   * Delete a session
   */
  static deleteSession(sessionId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      localStorage.removeItem(key);

      // If this was the active session, clear it
      const activeSessionId = this.getActiveSessionId();
      if (activeSessionId === sessionId) {
        this.clearActiveSession();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  /**
   * Get all session IDs
   */
  static getAllSessionIds(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
        .map((key) => key.replace(STORAGE_KEY_PREFIX, ''));
    } catch (error) {
      console.error('Failed to get session IDs:', error);
      return [];
    }
  }

  /**
   * Get session progress percentage
   */
  static getProgress(session: QuizSessionState): number {
    const answeredCount = Object.keys(session.answers).length;
    const totalQuestions = session.questions.length;

    return totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;
  }

  /**
   * Check if session is complete
   */
  static isComplete(session: QuizSessionState): boolean {
    return !!session.completedAt;
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Made with Bob

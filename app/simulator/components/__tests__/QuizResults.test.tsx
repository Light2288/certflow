/**
 * QuizResults Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizResults from '../QuizResults';
import type { QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import type { Question } from '@/lib/types/certification';

// Mock questions
const mockQuestions: Question[] = [
  {
    id: 'q1',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multiple-choice',
    difficulty: 'easy',
    question: 'Question 1',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'a',
    explanation: {
      correct: 'A is correct',
      whyOthersWrong: { b: 'B is wrong' },
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
    type: 'multiple-choice',
    difficulty: 'medium',
    question: 'Question 2',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'b',
    explanation: {
      correct: 'B is correct',
      whyOthersWrong: { a: 'A is wrong' },
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
    type: 'multi-select',
    difficulty: 'hard',
    question: 'Question 3',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
      { id: 'c', text: 'Option C' },
    ],
    correctAnswer: ['a', 'b'],
    explanation: {
      correct: 'A and B are correct',
      whyOthersWrong: { c: 'C is wrong' },
    },
    metadata: {
      createdAt: '2024-01-01',
      lastReviewed: '2024-01-01',
      source: 'test',
    },
  },
];

describe('QuizResults', () => {
  const mockOnReviewAnswers = vi.fn();
  const mockOnStartNew = vi.fn();

  beforeEach(() => {
    mockOnReviewAnswers.mockClear();
    mockOnStartNew.mockClear();
  });

  // ==========================================================================
  // PASSING SCORE TESTS
  // ==========================================================================

  describe('Passing Score', () => {
    it('shows pass status when score is 100%', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {
          q1: 'a',
          q2: 'b',
          q3: ['a', 'b'],
        },
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText(/You passed/i)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows pass status when score is exactly 70%', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 10,
        correctAnswers: 7,
        incorrectAnswers: 3,
        unanswered: 0,
        score: 70,
        timeSpent: 600,
        answers: {},
        questions: mockQuestions.slice(0, 10),
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('shows pass status when score is above 70%', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 2,
        incorrectAnswers: 1,
        unanswered: 0,
        score: 85,
        timeSpent: 400,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Congratulations!')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // FAILING SCORE TESTS
  // ==========================================================================

  describe('Failing Score', () => {
    it('shows fail status when score is below 70%', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 0,
        incorrectAnswers: 3,
        unanswered: 0,
        score: 0,
        timeSpent: 200,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Keep Practicing!')).toBeInTheDocument();
      expect(screen.getByText(/You need 70% or higher to pass/i)).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows fail status when score is 69%', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 2,
        incorrectAnswers: 1,
        unanswered: 0,
        score: 69,
        timeSpent: 250,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Keep Practicing!')).toBeInTheDocument();
      expect(screen.getByText('69%')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // STATISTICS TESTS
  // ==========================================================================

  describe('Statistics', () => {
    it('displays correct statistics for perfect score', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Total Questions')).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
      
      // Check statistics values more specifically
      const stats = screen.getAllByText('3');
      expect(stats.length).toBeGreaterThan(0); // Total and Correct both show 3
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays correct statistics for mixed results', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 1,
        incorrectAnswers: 2,
        unanswered: 0,
        score: 33,
        timeSpent: 180,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('displays correct statistics when all answers are wrong', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 0,
        incorrectAnswers: 3,
        unanswered: 0,
        score: 0,
        timeSpent: 150,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      // Check statistics values
      const stats = screen.getAllByText('3');
      expect(stats.length).toBeGreaterThan(0); // Total and Incorrect both show 3
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles unanswered questions correctly', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 1,
        incorrectAnswers: 0,
        unanswered: 2,
        score: 33,
        timeSpent: 120,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/2 questions left unanswered/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // DURATION TESTS
  // ==========================================================================

  describe('Duration Display', () => {
    it('displays duration in minutes and seconds', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 330, // 5m 30s
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('Time Spent')).toBeInTheDocument();
      expect(screen.getByText('5m 30s')).toBeInTheDocument();
    });

    it('displays duration for less than a minute', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 45,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('0m 45s')).toBeInTheDocument();
    });

    it('displays duration for exactly one minute', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 60,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('1m 0s')).toBeInTheDocument();
    });

    it('displays duration for long quiz', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 5025, // 83m 45s
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('83m 45s')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // BUTTON INTERACTION TESTS
  // ==========================================================================

  describe('Button Interactions', () => {
    it('calls onReviewAnswers when Review Answers button is clicked', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      const reviewButton = screen.getByRole('button', { name: /Review Answers/i });
      fireEvent.click(reviewButton);

      expect(mockOnReviewAnswers).toHaveBeenCalledTimes(1);
    });

    it('calls onStartNew when Start New Quiz button is clicked', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      const newQuizButton = screen.getByRole('button', { name: /Start New Quiz/i });
      fireEvent.click(newQuizButton);

      expect(mockOnStartNew).toHaveBeenCalledTimes(1);
    });

    it('renders both buttons', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByRole('button', { name: /Review Answers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start New Quiz/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // VISUAL FEEDBACK TESTS
  // ==========================================================================

  describe('Visual Feedback', () => {
    it('shows green checkmark for passing score', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 300,
        answers: {},
        questions: mockQuestions,
      };

      const { container } = render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      const checkmark = container.querySelector('.text-green-600');
      expect(checkmark).toBeInTheDocument();
    });

    it('shows red X for failing score', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 0,
        incorrectAnswers: 3,
        unanswered: 0,
        score: 0,
        timeSpent: 200,
        answers: {},
        questions: mockQuestions,
      };

      const { container } = render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      const xMark = container.querySelector('.text-red-600');
      expect(xMark).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles single question quiz', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 60,
        answers: {},
        questions: [mockQuestions[0]],
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      // Check for unique identifiers
      expect(screen.getByText('Total Questions')).toBeInTheDocument();
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThan(0); // Total and Correct both show 1
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles large number of questions', () => {
      const manyQuestions = Array.from({ length: 100 }, (_, i) => ({
        ...mockQuestions[0],
        id: `q${i + 1}`,
      }));

      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 100,
        correctAnswers: 100,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 3600,
        answers: {},
        questions: manyQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      // Check for unique identifiers
      expect(screen.getByText('Total Questions')).toBeInTheDocument();
      const hundreds = screen.getAllByText('100');
      expect(hundreds.length).toBeGreaterThan(0); // Total and Correct both show 100
    });

    it('handles zero duration', () => {
      const results: QuizSessionResult = {
        sessionId: 'session-1',
        totalQuestions: 3,
        correctAnswers: 3,
        incorrectAnswers: 0,
        unanswered: 0,
        score: 100,
        timeSpent: 0,
        answers: {},
        questions: mockQuestions,
      };

      render(
        <QuizResults
          results={results}
          onReviewAnswers={mockOnReviewAnswers}
          onStartNew={mockOnStartNew}
        />
      );

      expect(screen.getByText('0m 0s')).toBeInTheDocument();
    });
  });
});

// Made with Bob

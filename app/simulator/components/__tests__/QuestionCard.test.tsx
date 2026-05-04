/**
 * QuestionCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionCard from '../QuestionCard';
import type { Question } from '@/lib/types/certification';

// Mock questions
const mockMultipleChoiceQuestion: Question = {
  id: 'q1',
  topicId: 't1',
  subtopicId: 'st1',
  type: 'multiple-choice',
  difficulty: 'medium',
  question: 'What is the capital of France?',
  options: [
    { id: 'a', text: 'London' },
    { id: 'b', text: 'Paris' },
    { id: 'c', text: 'Berlin' },
    { id: 'd', text: 'Madrid' },
  ],
  correctAnswer: 'b',
  explanation: {
    correct: 'Paris is the capital of France',
    whyOthersWrong: {
      a: 'London is the capital of UK',
      c: 'Berlin is the capital of Germany',
      d: 'Madrid is the capital of Spain',
    },
  },
  metadata: {
    createdAt: '2024-01-01',
    lastReviewed: '2024-01-01',
    source: 'test',
  },
};

const mockMultiSelectQuestion: Question = {
  id: 'q2',
  topicId: 't1',
  subtopicId: 'st1',
  type: 'multi-select',
  difficulty: 'hard',
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
      c: '4 is not prime (divisible by 2)',
    },
  },
  metadata: {
    createdAt: '2024-01-01',
    lastReviewed: '2024-01-01',
    source: 'test',
  },
};

describe('QuestionCard', () => {
  const mockOnAnswerChange = vi.fn();
  const mockOnPrevious = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnAnswerChange.mockClear();
    mockOnPrevious.mockClear();
    mockOnNext.mockClear();
    mockOnSubmit.mockClear();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('renders question with all metadata', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={5}
          totalQuestions={20}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Question 5 of 20')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Single Answer')).toBeInTheDocument();
    });

    it('renders all options for multiple-choice', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Madrid')).toBeInTheDocument();
    });

    it('shows multi-select instruction for multi-select questions', () => {
      render(
        <QuestionCard
          question={mockMultiSelectQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('Multiple Answers')).toBeInTheDocument();
      expect(screen.getByText('Select all answers that apply')).toBeInTheDocument();
    });

    it('displays difficulty badge with correct color', () => {
      const { rerender } = render(
        <QuestionCard
          question={{ ...mockMultipleChoiceQuestion, difficulty: 'easy' }}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('Easy')).toBeInTheDocument();

      rerender(
        <QuestionCard
          question={{ ...mockMultipleChoiceQuestion, difficulty: 'hard' }}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('Hard')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MULTIPLE-CHOICE TESTS
  // ==========================================================================

  describe('Multiple-Choice Questions', () => {
    it('renders radio buttons for multiple-choice', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(4);
    });

    it('calls onAnswerChange when option is selected', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const parisOption = screen.getByLabelText(/Paris/i);
      fireEvent.click(parisOption);

      expect(mockOnAnswerChange).toHaveBeenCalledWith('b');
    });

    it('shows selected answer when currentAnswer is provided', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer="b"
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const parisRadio = screen.getByRole('radio', { name: /Paris/i });
      expect(parisRadio).toBeChecked();
    });

    it('allows changing answer', () => {
      const { rerender } = render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer="a"
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const parisOption = screen.getByLabelText(/Paris/i);
      fireEvent.click(parisOption);

      expect(mockOnAnswerChange).toHaveBeenCalledWith('b');
    });
  });

  // ==========================================================================
  // MULTI-SELECT TESTS
  // ==========================================================================

  describe('Multi-Select Questions', () => {
    it('renders checkboxes for multi-select', () => {
      render(
        <QuestionCard
          question={mockMultiSelectQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });

    it('calls onAnswerChange with array when options are selected', () => {
      render(
        <QuestionCard
          question={mockMultiSelectQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const option2 = screen.getByLabelText('2');
      fireEvent.click(option2);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(['a']);

      const option3 = screen.getByLabelText('3');
      fireEvent.click(option3);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('allows deselecting options', () => {
      render(
        <QuestionCard
          question={mockMultiSelectQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer={['a', 'b']}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const option2 = screen.getByLabelText('2');
      fireEvent.click(option2);

      expect(mockOnAnswerChange).toHaveBeenCalledWith(['b']);
    });

    it('shows selected answers when currentAnswer is provided', () => {
      render(
        <QuestionCard
          question={mockMultiSelectQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer={['a', 'b', 'd']}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByRole('checkbox', { name: /2/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /3/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /4/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /5/i })).toBeChecked();
    });
  });

  // ==========================================================================
  // NAVIGATION TESTS
  // ==========================================================================

  describe('Navigation', () => {
    it('calls onPrevious when Previous button is clicked', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={5}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const prevButton = screen.getByRole('button', { name: /Previous/i });
      fireEvent.click(prevButton);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when Next button is clicked', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={5}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('disables Previous button when canGoPrevious is false', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const prevButton = screen.getByRole('button', { name: /Previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables Next button when canGoNext is false', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={10}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={false}
          isLastQuestion={true}
        />
      );

      const nextButton = screen.queryByRole('button', { name: /Next/i });
      expect(nextButton).not.toBeInTheDocument();
    });

    it('shows Submit button on last question', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={10}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={false}
          isLastQuestion={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Quiz/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('calls onSubmit when Submit button is clicked', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={10}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={true}
          canGoNext={false}
          isLastQuestion={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Submit Quiz/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // ANSWER STATUS TESTS
  // ==========================================================================

  describe('Answer Status', () => {
    it('shows "Select an answer" when no answer is provided', () => {
      render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('Select an answer')).toBeInTheDocument();
    });

    it('shows checkmark when answer is provided', () => {
      const { container } = render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer="b"
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      const checkmark = container.querySelector('.text-green-500');
      expect(checkmark).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles question with single option', () => {
      const singleOptionQuestion: Question = {
        ...mockMultipleChoiceQuestion,
        options: [{ id: 'a', text: 'Only option' }],
        correctAnswer: 'a',
      };

      render(
        <QuestionCard
          question={singleOptionQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText('Only option')).toBeInTheDocument();
    });

    it('handles very long question text', () => {
      const longQuestion: Question = {
        ...mockMultipleChoiceQuestion,
        question: 'This is a very long question that contains a lot of text and should still be displayed properly without breaking the layout or causing any issues with the component rendering. '.repeat(3),
      };

      render(
        <QuestionCard
          question={longQuestion}
          questionNumber={1}
          totalQuestions={10}
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByText(/This is a very long question/i)).toBeInTheDocument();
    });

    it('updates when currentAnswer prop changes', () => {
      const { rerender } = render(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer="a"
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByRole('radio', { name: /London/i })).toBeChecked();

      rerender(
        <QuestionCard
          question={mockMultipleChoiceQuestion}
          questionNumber={1}
          totalQuestions={10}
          currentAnswer="b"
          onAnswerChange={mockOnAnswerChange}
          onPrevious={mockOnPrevious}
          onNext={mockOnNext}
          onSubmit={mockOnSubmit}
          canGoPrevious={false}
          canGoNext={true}
          isLastQuestion={false}
        />
      );

      expect(screen.getByRole('radio', { name: /Paris/i })).toBeChecked();
    });
  });
});

// Made with Bob

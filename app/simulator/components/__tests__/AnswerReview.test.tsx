/**
 * AnswerReview Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AnswerReview from '../AnswerReview';
import type { Question } from '@/lib/types/certification';

// Mock questions
const mockQuestions: Question[] = [
  {
    id: 'q1',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multiple-choice',
    difficulty: 'easy',
    question: 'What is the capital of France?',
    options: [
      { id: 'a', text: 'London' },
      { id: 'b', text: 'Paris' },
      { id: 'c', text: 'Berlin' },
      { id: 'd', text: 'Madrid' },
    ],
    correctAnswer: 'b',
    explanation: {
      correct: 'Paris is the capital and largest city of France.',
      whyOthersWrong: {
        a: 'London is the capital of the United Kingdom.',
        c: 'Berlin is the capital of Germany.',
        d: 'Madrid is the capital of Spain.',
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
      correct: '2, 3, and 5 are prime numbers (only divisible by 1 and themselves).',
      whyOthersWrong: {
        c: '4 is not prime because it is divisible by 2.',
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
    question: 'What is 2 + 2?',
    options: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
      { id: 'c', text: '5' },
    ],
    correctAnswer: 'b',
    explanation: {
      correct: '2 + 2 equals 4.',
      whyOthersWrong: {
        a: '3 is incorrect.',
        c: '5 is incorrect.',
      },
    },
    metadata: {
      createdAt: '2024-01-01',
      lastReviewed: '2024-01-01',
      source: 'test',
    },
  },
];

describe('AnswerReview', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('renders header with title and description', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Answer Review')).toBeInTheDocument();
      expect(screen.getByText('Review your answers and see detailed explanations')).toBeInTheDocument();
    });

    it('renders all questions', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Select all prime numbers')).toBeInTheDocument();
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    });

    it('renders question numbers', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
      expect(screen.getByText('Question 3')).toBeInTheDocument();
    });

    it('renders all options for each question', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      // Question 1 options
      expect(screen.getByText('London')).toBeInTheDocument();
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('Madrid')).toBeInTheDocument();

      // Question 2 options (numbers appear in multiple places, use getAllByText)
      const twos = screen.getAllByText('2');
      const threes = screen.getAllByText('3');
      const fours = screen.getAllByText('4');
      const fives = screen.getAllByText('5');
      expect(twos.length).toBeGreaterThan(0);
      expect(threes.length).toBeGreaterThan(0);
      expect(fours.length).toBeGreaterThan(0);
      expect(fives.length).toBeGreaterThan(0);
    });

    it('renders close button in header', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('renders back to results button', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /Back to Results/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // CORRECT ANSWER TESTS
  // ==========================================================================

  describe('Correct Answers', () => {
    it('shows correct status for correct single answer', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('✓ Correct')).toBeInTheDocument();
    });

    it('highlights correct option in green', () => {
      const { container } = render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      const greenBorders = container.querySelectorAll('.border-green-500');
      expect(greenBorders.length).toBeGreaterThan(0);
    });

    it('shows "Correct answer" label on correct option', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      const correctLabels = screen.getAllByText('Correct answer');
      expect(correctLabels.length).toBeGreaterThan(0);
    });

    it('shows correct status for correct multi-select answer', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q2: ['a', 'b', 'd'] }}
          onClose={mockOnClose}
        />
      );

      const correctBadges = screen.getAllByText('✓ Correct');
      expect(correctBadges.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // INCORRECT ANSWER TESTS
  // ==========================================================================

  describe('Incorrect Answers', () => {
    it('shows incorrect status for wrong single answer', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
    });

    it('highlights wrong option in red', () => {
      const { container } = render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      const redBorders = container.querySelectorAll('.border-red-500');
      expect(redBorders.length).toBeGreaterThan(0);
    });

    it('shows "Your answer" label on incorrect option', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Your answer')).toBeInTheDocument();
    });

    it('shows both correct and incorrect options for wrong answer', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Your answer')).toBeInTheDocument();
      const correctLabels = screen.getAllByText('Correct answer');
      expect(correctLabels.length).toBeGreaterThan(0);
    });

    it('shows incorrect status for partially correct multi-select', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q2: ['a', 'b'] }} // Missing 'd'
          onClose={mockOnClose}
        />
      );

      const incorrectBadges = screen.getAllByText('✗ Incorrect');
      expect(incorrectBadges.length).toBeGreaterThan(0);
    });

    it('shows incorrect status for wrong multi-select', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q2: ['a', 'c'] }} // 'c' is wrong
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // UNANSWERED TESTS
  // ==========================================================================

  describe('Unanswered Questions', () => {
    it('shows unanswered status for questions without answers', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const unansweredBadges = screen.getAllByText('− Unanswered');
      expect(unansweredBadges).toHaveLength(3);
    });

    it('shows unanswered status for specific question', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{ q1: 'b', q2: ['a', 'b', 'd'] }}
          onClose={mockOnClose}
        />
      );

      const unansweredBadges = screen.getAllByText('− Unanswered');
      expect(unansweredBadges).toHaveLength(1);
    });

    it('still shows correct answer for unanswered questions', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Correct answer')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EXPLANATION TESTS
  // ==========================================================================

  describe('Explanations', () => {
    it('shows explanation for correct answer', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Why this is correct:')).toBeInTheDocument();
      expect(screen.getByText('Paris is the capital and largest city of France.')).toBeInTheDocument();
    });

    it('shows explanations for why other options are wrong', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Why others are wrong:')).toBeInTheDocument();
      expect(screen.getByText(/London is the capital of the United Kingdom/i)).toBeInTheDocument();
      expect(screen.getByText(/Berlin is the capital of Germany/i)).toBeInTheDocument();
      expect(screen.getByText(/Madrid is the capital of Spain/i)).toBeInTheDocument();
    });

    it('shows explanation section for all questions', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const explanationHeaders = screen.getAllByText('Explanation');
      expect(explanationHeaders).toHaveLength(3);
    });

    it('displays option labels in wrong answer explanations', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/London:/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // BUTTON INTERACTION TESTS
  // ==========================================================================

  describe('Button Interactions', () => {
    it('calls onClose when header close button is clicked', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const closeButtons = screen.getAllByRole('button');
      const headerCloseButton = closeButtons[0]; // First button is the X in header
      fireEvent.click(headerCloseButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Back to Results button is clicked', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const backButton = screen.getByRole('button', { name: /Back to Results/i });
      fireEvent.click(backButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // VISUAL STYLING TESTS
  // ==========================================================================

  describe('Visual Styling', () => {
    it('applies green border to correct answer card', () => {
      const { container } = render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      const greenBorder = container.querySelector('.border-green-200');
      expect(greenBorder).toBeInTheDocument();
    });

    it('applies red border to incorrect answer card', () => {
      const { container } = render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      const redBorder = container.querySelector('.border-red-200');
      expect(redBorder).toBeInTheDocument();
    });

    it('applies yellow border to unanswered card', () => {
      const { container } = render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const yellowBorder = container.querySelector('.border-yellow-200');
      expect(yellowBorder).toBeInTheDocument();
    });

    it('shows green checkmark icon for correct options', () => {
      const { container } = render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      const greenIcons = container.querySelectorAll('.text-green-600');
      expect(greenIcons.length).toBeGreaterThan(0);
    });

    it('shows red X icon for incorrect user selections', () => {
      const { container } = render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'a' }}
          onClose={mockOnClose}
        />
      );

      const redIcons = container.querySelectorAll('.text-red-600');
      expect(redIcons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // MIXED RESULTS TESTS
  // ==========================================================================

  describe('Mixed Results', () => {
    it('handles mix of correct, incorrect, and unanswered', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{
            q1: 'b', // correct
            q2: ['a', 'c'], // incorrect
            // q3 unanswered
          }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('✓ Correct')).toBeInTheDocument();
      expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
      expect(screen.getByText('− Unanswered')).toBeInTheDocument();
    });

    it('shows all correct answers regardless of user answers', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{
            q1: 'a', // wrong
            q2: ['a', 'b'], // partially wrong
            q3: 'c', // wrong
          }}
          onClose={mockOnClose}
        />
      );

      const correctAnswerLabels = screen.getAllByText('Correct answer');
      expect(correctAnswerLabels.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles single question', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[0]]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.queryByText('Question 2')).not.toBeInTheDocument();
    });

    it('handles empty answers object', () => {
      render(
        <AnswerReview
          questions={mockQuestions}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      const unansweredBadges = screen.getAllByText('− Unanswered');
      expect(unansweredBadges).toHaveLength(3);
    });

    it('handles question with no wrong answer explanations', () => {
      const questionWithoutWrongExplanations: Question = {
        ...mockQuestions[0],
        explanation: {
          correct: 'This is correct.',
          whyOthersWrong: {},
        },
      };

      render(
        <AnswerReview
          questions={[questionWithoutWrongExplanations]}
          answers={{ q1: 'b' }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Why this is correct:')).toBeInTheDocument();
      expect(screen.queryByText('Why others are wrong:')).not.toBeInTheDocument();
    });

    it('handles very long question text', () => {
      const longQuestion: Question = {
        ...mockQuestions[0],
        question: 'This is a very long question that contains a lot of text and should still be displayed properly without breaking the layout. '.repeat(5),
      };

      render(
        <AnswerReview
          questions={[longQuestion]}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/This is a very long question/i)).toBeInTheDocument();
    });

    it('handles question with many options', () => {
      const manyOptionsQuestion: Question = {
        ...mockQuestions[0],
        options: Array.from({ length: 10 }, (_, i) => ({
          id: String.fromCharCode(97 + i),
          text: `Option ${i + 1}`,
        })),
      };

      render(
        <AnswerReview
          questions={[manyOptionsQuestion]}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 10')).toBeInTheDocument();
    });

    it('handles multi-select with all options selected', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[1]]}
          answers={{ q2: ['a', 'b', 'c', 'd'] }}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
    });

    it('handles multi-select with no options selected', () => {
      render(
        <AnswerReview
          questions={[mockQuestions[1]]}
          answers={{}}
          onClose={mockOnClose}
        />
      );

      // Empty array or no answer both result in unanswered status
      const unansweredBadges = screen.getAllByText('− Unanswered');
      expect(unansweredBadges.length).toBeGreaterThan(0);
    });
  });
});

// Made with Bob

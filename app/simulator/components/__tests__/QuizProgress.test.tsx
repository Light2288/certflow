/**
 * QuizProgress Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizProgress from '../QuizProgress';

type QuizProgressProps = React.ComponentProps<typeof QuizProgress>;

function renderProgress(overrides: Partial<QuizProgressProps> = {}) {
  const props: QuizProgressProps = {
    currentQuestion: 5,
    totalQuestions: 20,
    answeredCount: 4,
    answeredIndices: [0, 1, 2, 3],
    visitedIndices: [0, 1, 2, 3, 4],
    ...overrides,
  };

  return render(<QuizProgress {...props} />);
}

describe('QuizProgress', () => {
  it('renders with correct question counter', () => {
    renderProgress();

    expect(screen.getByText('Question 5 of 20')).toBeInTheDocument();
  });

  it('displays answered count', () => {
    renderProgress();

    expect(screen.getByText('4 answered')).toBeInTheDocument();
  });

  it('calculates and displays completion percentage', () => {
    renderProgress();

    // 4 answered out of 20 = 20%
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('displays 0% when no questions answered', () => {
    renderProgress({
      currentQuestion: 1,
      answeredCount: 0,
      answeredIndices: [],
      visitedIndices: [0],
    });

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays 100% when all questions answered', () => {
    renderProgress({
      currentQuestion: 20,
      answeredCount: 20,
      answeredIndices: Array.from({ length: 20 }, (_, i) => i),
      visitedIndices: Array.from({ length: 20 }, (_, i) => i),
    });

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = renderProgress();

    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders question status grid with correct number of items', () => {
    const { container } = renderProgress({
      totalQuestions: 10,
    });

    const gridItems = container.querySelectorAll('.aspect-square');
    expect(gridItems).toHaveLength(10);
  });

  it('highlights current question in grid', () => {
    const { container } = renderProgress({
      totalQuestions: 10,
    });

    const gridItems = container.querySelectorAll('.aspect-square');
    const currentItem = gridItems[4]; // 0-indexed, so question 5 is at index 4

    expect(currentItem.className).toContain('bg-blue-600');
    expect(currentItem.className).toContain('ring-2');
  });

  it('colors boxes by the actual answered set, not a raw count', () => {
    // Skip Q1, answer Q2: only index 1 is answered.
    const { container } = renderProgress({
      currentQuestion: 3,
      totalQuestions: 10,
      answeredCount: 1,
      answeredIndices: [1],
      visitedIndices: [0, 1, 2],
    });

    const gridItems = container.querySelectorAll('.aspect-square');

    // Box 1 (index 0) must NOT be green — it was skipped.
    expect(gridItems[0].className).not.toContain('bg-green-500');
    // Box 2 (index 1) must be green — it was answered.
    expect(gridItems[1].className).toContain('bg-green-500');
  });

  it('applies the answered style only to indices in answeredIndices', () => {
    const { container } = renderProgress({
      currentQuestion: 10,
      totalQuestions: 10,
      answeredCount: 3,
      answeredIndices: [0, 4, 8],
      visitedIndices: [0, 4, 8, 9],
    });

    const gridItems = container.querySelectorAll('.aspect-square');

    expect(gridItems[0].className).toContain('bg-green-500');
    expect(gridItems[4].className).toContain('bg-green-500');
    expect(gridItems[8].className).toContain('bg-green-500');
    // Not answered:
    expect(gridItems[1].className).not.toContain('bg-green-500');
    expect(gridItems[5].className).not.toContain('bg-green-500');
  });

  it('gives current question precedence over answered', () => {
    const { container } = renderProgress({
      currentQuestion: 2,
      totalQuestions: 10,
      answeredCount: 1,
      answeredIndices: [1], // index 1 is both answered and current
      visitedIndices: [0, 1],
    });

    const gridItems = container.querySelectorAll('.aspect-square');
    // Current styling wins.
    expect(gridItems[1].className).toContain('bg-blue-600');
    expect(gridItems[1].className).toContain('ring-2');
    expect(gridItems[1].className).not.toContain('bg-green-500');
  });

  it('renders a distinct visited-but-unanswered style', () => {
    const { container } = renderProgress({
      currentQuestion: 5,
      totalQuestions: 10,
      answeredCount: 0,
      answeredIndices: [],
      visitedIndices: [0, 1, 4],
    });

    const gridItems = container.querySelectorAll('.aspect-square');

    // Index 0 is visited but not answered and not current: distinct from both
    // the answered (green) and default (gray-200) styles.
    expect(gridItems[0].className).not.toContain('bg-green-500');
    expect(gridItems[0].className).not.toContain('bg-blue-600');
    expect(gridItems[0].className).toContain('bg-yellow-100');
  });

  it('shows unvisited/unanswered questions in gray', () => {
    const { container } = renderProgress({
      currentQuestion: 5,
      totalQuestions: 10,
      answeredCount: 4,
      answeredIndices: [0, 1, 2, 3],
      visitedIndices: [0, 1, 2, 3, 4],
    });

    const gridItems = container.querySelectorAll('.aspect-square');

    // Index 6 is neither answered, visited, nor current.
    expect(gridItems[6].className).toContain('bg-gray-200');
  });

  it('calls onQuestionSelect with the 0-based index when a box is clicked', async () => {
    const onQuestionSelect = vi.fn();
    const { container } = renderProgress({
      currentQuestion: 5,
      totalQuestions: 10,
      onQuestionSelect,
    });

    const gridItems = container.querySelectorAll('.aspect-square');
    await userEvent.click(gridItems[7] as HTMLElement);

    expect(onQuestionSelect).toHaveBeenCalledWith(7);
  });

  it('displays legend with all status types', () => {
    renderProgress();

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText('Visited')).toBeInTheDocument();
    expect(screen.getByText('Unanswered')).toBeInTheDocument();
  });

  it('handles single question quiz', () => {
    renderProgress({
      currentQuestion: 1,
      totalQuestions: 1,
      answeredCount: 0,
      answeredIndices: [],
      visitedIndices: [0],
    });

    expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('0 answered')).toBeInTheDocument();
  });

  it('handles large number of questions', () => {
    const { container } = renderProgress({
      currentQuestion: 50,
      totalQuestions: 100,
      answeredCount: 49,
      answeredIndices: Array.from({ length: 49 }, (_, i) => i),
      visitedIndices: Array.from({ length: 50 }, (_, i) => i),
    });

    expect(screen.getByText('Question 50 of 100')).toBeInTheDocument();
    expect(screen.getByText('49 answered')).toBeInTheDocument();

    const gridItems = container.querySelectorAll('.aspect-square');
    expect(gridItems).toHaveLength(100);
  });
});

// Made with Bob

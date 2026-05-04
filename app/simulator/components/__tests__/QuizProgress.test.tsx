/**
 * QuizProgress Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuizProgress from '../QuizProgress';

describe('QuizProgress', () => {
  it('renders with correct question counter', () => {
    render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={20}
        answeredCount={4}
      />
    );

    expect(screen.getByText('Question 5 of 20')).toBeInTheDocument();
  });

  it('displays answered count', () => {
    render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={20}
        answeredCount={4}
      />
    );

    expect(screen.getByText('4 answered')).toBeInTheDocument();
  });

  it('calculates and displays completion percentage', () => {
    render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={20}
        answeredCount={4}
      />
    );

    // 4 answered out of 20 = 20%
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('displays 0% when no questions answered', () => {
    render(
      <QuizProgress
        currentQuestion={1}
        totalQuestions={20}
        answeredCount={0}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays 100% when all questions answered', () => {
    render(
      <QuizProgress
        currentQuestion={20}
        totalQuestions={20}
        answeredCount={20}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={20}
        answeredCount={4}
      />
    );

    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders question status grid with correct number of items', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={10}
        answeredCount={4}
      />
    );

    const gridItems = container.querySelectorAll('.aspect-square');
    expect(gridItems).toHaveLength(10);
  });

  it('highlights current question in grid', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={10}
        answeredCount={4}
      />
    );

    const gridItems = container.querySelectorAll('.aspect-square');
    const currentItem = gridItems[4]; // 0-indexed, so question 5 is at index 4

    expect(currentItem.className).toContain('bg-blue-600');
    expect(currentItem.className).toContain('ring-2');
  });

  it('shows answered questions in green', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={10}
        answeredCount={3}
      />
    );

    const gridItems = container.querySelectorAll('.aspect-square');
    
    // First 3 questions should be green (answered)
    expect(gridItems[0].className).toContain('bg-green-500');
    expect(gridItems[1].className).toContain('bg-green-500');
    expect(gridItems[2].className).toContain('bg-green-500');
  });

  it('shows unanswered questions in gray', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={10}
        answeredCount={4}
      />
    );

    const gridItems = container.querySelectorAll('.aspect-square');
    
    // Questions after answered count (excluding current) should be gray
    expect(gridItems[5].className).toContain('bg-gray-200');
  });

  it('displays legend with all status types', () => {
    render(
      <QuizProgress
        currentQuestion={5}
        totalQuestions={20}
        answeredCount={4}
      />
    );

    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText('Unanswered')).toBeInTheDocument();
  });

  it('handles single question quiz', () => {
    render(
      <QuizProgress
        currentQuestion={1}
        totalQuestions={1}
        answeredCount={0}
      />
    );

    expect(screen.getByText('Question 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('0 answered')).toBeInTheDocument();
  });

  it('handles large number of questions', () => {
    const { container } = render(
      <QuizProgress
        currentQuestion={50}
        totalQuestions={100}
        answeredCount={49}
      />
    );

    expect(screen.getByText('Question 50 of 100')).toBeInTheDocument();
    expect(screen.getByText('49 answered')).toBeInTheDocument();
    
    const gridItems = container.querySelectorAll('.aspect-square');
    expect(gridItems).toHaveLength(100);
  });
});

// Made with Bob

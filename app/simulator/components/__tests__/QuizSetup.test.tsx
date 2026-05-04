/**
 * QuizSetup Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizSetup from '../QuizSetup';
import type { Question, Topic } from '@/lib/types/certification';

// Mock data
const mockQuestions: Question[] = [
  {
    id: 'q1',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multiple-choice',
    difficulty: 'easy',
    question: 'Easy question?',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'a',
    explanation: { correct: 'A is correct', whyOthersWrong: {} },
    metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'test' },
  },
  {
    id: 'q2',
    topicId: 't1',
    subtopicId: 'st1',
    type: 'multiple-choice',
    difficulty: 'medium',
    question: 'Medium question?',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'b',
    explanation: { correct: 'B is correct', whyOthersWrong: {} },
    metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'test' },
  },
  {
    id: 'q3',
    topicId: 't2',
    subtopicId: 'st2',
    type: 'multiple-choice',
    difficulty: 'hard',
    question: 'Hard question?',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'a',
    explanation: { correct: 'A is correct', whyOthersWrong: {} },
    metadata: { createdAt: '2024-01-01', lastReviewed: '2024-01-01', source: 'test' },
  },
];

const mockTopics: Topic[] = [
  {
    id: 't1',
    name: 'Topic 1',
    description: 'First topic',
    weight: 50,
    order: 1,
    subtopics: [{ id: 'st1', name: 'Subtopic 1', description: 'First subtopic', keyPoints: [] }],
  },
  {
    id: 't2',
    name: 'Topic 2',
    description: 'Second topic',
    weight: 50,
    order: 2,
    subtopics: [{ id: 'st2', name: 'Subtopic 2', description: 'Second subtopic', keyPoints: [] }],
  },
];

describe('QuizSetup', () => {
  const mockOnStartQuiz = vi.fn();

  beforeEach(() => {
    mockOnStartQuiz.mockClear();
  });

  it('renders the component with all elements', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    expect(screen.getByText('Configure Your Quiz')).toBeInTheDocument();
    expect(screen.getByLabelText(/Number of Questions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Difficulty Level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topic/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
  });

  it('displays the correct initial question count', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    expect(screen.getByText(/Number of Questions: 10/i)).toBeInTheDocument();
  });

  it('updates question count when slider changes', () => {
    // Create more questions so we can test slider properly
    const manyQuestions = Array.from({ length: 50 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const slider = screen.getByLabelText(/Number of Questions/i);
    fireEvent.change(slider, { target: { value: '15' } });

    expect(screen.getByText(/Number of Questions: 15/i)).toBeInTheDocument();
  });

  it('displays all difficulty options', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const difficultySelect = screen.getByLabelText(/Difficulty Level/i);
    expect(difficultySelect).toBeInTheDocument();

    const options = difficultySelect.querySelectorAll('option');
    expect(options).toHaveLength(4); // All, Easy, Medium, Hard
    expect(options[0]).toHaveTextContent('All Difficulties');
    expect(options[1]).toHaveTextContent('Easy');
    expect(options[2]).toHaveTextContent('Medium');
    expect(options[3]).toHaveTextContent('Hard');
  });

  it('displays all topic options', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const topicSelect = screen.getByLabelText(/Topic/i);
    const options = topicSelect.querySelectorAll('option');

    expect(options).toHaveLength(3); // All + 2 topics
    expect(options[0]).toHaveTextContent('All Topics');
    expect(options[1]).toHaveTextContent('Topic 1');
    expect(options[2]).toHaveTextContent('Topic 2');
  });

  it('shows correct available questions count for all filters', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    expect(screen.getByText(/3 questions available/i)).toBeInTheDocument();
  });

  it('filters questions by difficulty', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const difficultySelect = screen.getByLabelText(/Difficulty Level/i);
    fireEvent.change(difficultySelect, { target: { value: 'easy' } });

    expect(screen.getByText(/1 question available/i)).toBeInTheDocument();
  });

  it('filters questions by topic', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const topicSelect = screen.getByLabelText(/Topic/i);
    fireEvent.change(topicSelect, { target: { value: 't1' } });

    expect(screen.getByText(/2 questions available/i)).toBeInTheDocument();
  });

  it('filters questions by both difficulty and topic', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const difficultySelect = screen.getByLabelText(/Difficulty Level/i);
    const topicSelect = screen.getByLabelText(/Topic/i);

    fireEvent.change(difficultySelect, { target: { value: 'easy' } });
    fireEvent.change(topicSelect, { target: { value: 't1' } });

    expect(screen.getByText(/1 question available/i)).toBeInTheDocument();
  });

  it('calls onStartQuiz with filtered questions when Start Quiz is clicked', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const startButton = screen.getByRole('button', { name: /Start Quiz/i });
    fireEvent.click(startButton);

    expect(mockOnStartQuiz).toHaveBeenCalledTimes(1);
    expect(mockOnStartQuiz).toHaveBeenCalledWith(expect.any(Array));
    
    const calledQuestions = mockOnStartQuiz.mock.calls[0][0];
    expect(calledQuestions.length).toBeGreaterThan(0);
    expect(calledQuestions.length).toBeLessThanOrEqual(10);
  });

  it('disables Start Quiz button when no questions available', () => {
    render(
      <QuizSetup
        questions={[]}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const startButton = screen.getByRole('button', { name: /No Questions Available/i });
    expect(startButton).toBeDisabled();
  });

  it('shows warning when filters result in fewer questions than requested', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const slider = screen.getByLabelText(/Number of Questions/i);
    fireEvent.change(slider, { target: { value: '50' } });

    expect(
      screen.getByText(/Only 3 questions match your filters/i)
    ).toBeInTheDocument();
  });

  it('randomizes question selection', () => {
    const manyQuestions = Array.from({ length: 20 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
      />
    );

    const startButton = screen.getByRole('button', { name: /Start Quiz/i });
    fireEvent.click(startButton);

    const firstCall = mockOnStartQuiz.mock.calls[0][0];
    
    mockOnStartQuiz.mockClear();
    fireEvent.click(startButton);
    
    const secondCall = mockOnStartQuiz.mock.calls[0][0];

    // Questions should be different (randomized)
    const firstIds = firstCall.map((q: Question) => q.id).join(',');
    const secondIds = secondCall.map((q: Question) => q.id).join(',');
    
    // With 20 questions and selecting 10, it's very unlikely they'd be the same
    expect(firstIds).not.toBe(secondIds);
  });
});

// Made with Bob

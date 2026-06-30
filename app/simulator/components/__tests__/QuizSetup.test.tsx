/**
 * QuizSetup Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizSetup from '../QuizSetup';
import type { Question, Topic } from '@/lib/types/certification';
import type { AISettings } from '@/lib/types/ai-settings';

// Mock useSettings so we can control the configured provider.
const mockSettings: { current: AISettings } = {
  current: { provider: 'mock', temperature: 0.7, maxTokens: 2000 },
};

vi.mock('@/lib/contexts/settings-context', () => ({
  useSettings: () => ({
    settings: mockSettings.current,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    isLoading: false,
  }),
}));

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
    mockSettings.current = { provider: 'mock', temperature: 0.7, maxTokens: 2000 };
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
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
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

    const topicSelect = screen.getByLabelText('Topic');
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

    const topicSelect = screen.getByLabelText('Topic');
    fireEvent.change(topicSelect, { target: { value: 't1' } });

    expect(screen.getByText(/2 questions available/i)).toBeInTheDocument();
  });

  it('calls onStartQuiz with a config object when Start Quiz is clicked', () => {
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
    const config = mockOnStartQuiz.mock.calls[0][0];
    expect(config).toMatchObject({
      count: 10,
      difficulty: 'all',
      topicId: 'all',
    });
    expect(typeof config.augment).toBe('boolean');
    expect(Array.isArray(config.questions)).toBe(true);
  });

  it('disables Start Quiz button when no questions available and augment is off', () => {
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

  describe('AI augmentation toggle', () => {
    it('defaults the toggle OFF for the mock provider', () => {
      mockSettings.current = { provider: 'mock' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const toggle = screen.getByLabelText(/Augment with AI-generated questions/i) as HTMLInputElement;
      expect(toggle.checked).toBe(false);
    });

    it('defaults the toggle ON for a non-mock provider', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const toggle = screen.getByLabelText(/Augment with AI-generated questions/i) as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });

    it('uncaps the question count when augmentation is on', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const slider = screen.getByLabelText(/Number of Questions/i) as HTMLInputElement;
      // Only 3 curated questions, but augmentation allows up to 50.
      expect(Number(slider.max)).toBe(50);
    });

    it('caps the question count to the curated pool when augmentation is off', () => {
      mockSettings.current = { provider: 'mock' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const slider = screen.getByLabelText(/Number of Questions/i) as HTMLInputElement;
      expect(Number(slider.max)).toBe(3);
    });

    it('passes augment=true in the start config when toggle is on', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].augment).toBe(true);
    });

    it('allows starting when augment is on even with no curated matches', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={[]}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const startButton = screen.getByRole('button', { name: /Start Quiz/i });
      expect(startButton).not.toBeDisabled();
    });
  });
});

// Made with Bob

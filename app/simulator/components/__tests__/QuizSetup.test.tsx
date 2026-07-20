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
    expect(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i })).toBeInTheDocument();
  });

  it('displays the correct initial question count', () => {
    mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
    const manyQuestions = Array.from({ length: 60 }, (_, i) => ({
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

    // No exam count -> fallback default of 100.
    expect(screen.getByText(/Number of Questions: 100/i)).toBeInTheDocument();
  });

  it('defaults the question count to the cert exam question count', () => {
    const manyQuestions = Array.from({ length: 40 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        examQuestionCount={25}
      />
    );

    expect(screen.getByText(/Number of Questions: 25/i)).toBeInTheDocument();
  });

  it('clamps and snaps the exam count into the slider range (step 5)', () => {
    // An exam count of 65 with 80 curated questions clamps/snaps within range.
    const manyQuestions = Array.from({ length: 80 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        examQuestionCount={65}
      />
    );

    const slider = screen.getByLabelText(/Number of Questions/i) as HTMLInputElement;
    const value = Number(slider.value);
    expect(value).toBeGreaterThanOrEqual(Number(slider.min));
    expect(value).toBeLessThanOrEqual(Number(slider.max));
    expect(value % 5).toBe(0);
  });

  it('falls back to a default count of 100 when exam count is 0 or undefined', () => {
    mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
    const manyQuestions = Array.from({ length: 40 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        examQuestionCount={0}
      />
    );

    // No exam count -> fallback default of 100 (augment on so the pool size
    // doesn't cap the slider below 100).
    expect(screen.getByText(/Number of Questions: 100/i)).toBeInTheDocument();
  });

  it('emits the defaulted exam count in the start config', () => {
    const manyQuestions = Array.from({ length: 40 }, (_, i) => ({
      ...mockQuestions[0],
      id: `q${i}`,
    }));

    render(
      <QuizSetup
        questions={manyQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        examQuestionCount={25}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
    expect(mockOnStartQuiz.mock.calls[0][0].count).toBe(25);
  });

  it('pre-selects a topic from a valid initialTopicId', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        initialTopicId="t2"
      />
    );

    const topicSelect = screen.getByLabelText('Topic') as HTMLSelectElement;
    expect(topicSelect.value).toBe('t2');
  });

  it('falls back to "all" when initialTopicId does not match any topic', () => {
    render(
      <QuizSetup
        questions={mockQuestions}
        topics={mockTopics}
        onStartQuiz={mockOnStartQuiz}
        initialTopicId="does-not-exist"
      />
    );

    const topicSelect = screen.getByLabelText('Topic') as HTMLSelectElement;
    expect(topicSelect.value).toBe('all');
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

    const startButton = screen.getByRole('button', { name: /Start Quiz|Create Quiz/i });
    fireEvent.click(startButton);

    expect(mockOnStartQuiz).toHaveBeenCalledTimes(1);
    const config = mockOnStartQuiz.mock.calls[0][0];
    expect(config).toMatchObject({
      difficulty: 'all',
      topicId: 'all',
    });
    expect(typeof config.count).toBe('number');
    expect(config.count).toBeGreaterThan(0);
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

    it('uncaps the question count to the fallback max (200) when augmentation is on and no exam count', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const slider = screen.getByLabelText(/Number of Questions/i) as HTMLInputElement;
      // No exam count -> fallback default 100, so the max is 2x = 200.
      expect(Number(slider.max)).toBe(200);
    });

    it('sets the augmented max to twice the exam question count', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
          examQuestionCount={40}
        />
      );

      const slider = screen.getByLabelText(/Number of Questions/i) as HTMLInputElement;
      expect(Number(slider.max)).toBe(80);
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

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
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

      const startButton = screen.getByRole('button', { name: /Start Quiz|Create Quiz/i });
      expect(startButton).not.toBeDisabled();
    });
  });

  describe('Target % AI-generated control', () => {
    it('is hidden when augmentation is off (mock provider)', () => {
      mockSettings.current = { provider: 'mock' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      expect(screen.queryByLabelText(/Target % AI-generated/i)).not.toBeInTheDocument();
    });

    it('is visible with a default of 30 when augmentation is on', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const control = screen.getByLabelText(/Target % AI-generated/i) as HTMLInputElement;
      expect(control).toBeInTheDocument();
      expect(Number(control.value)).toBe(30);
    });

    it('emits targetAiPercent in the start config', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const control = screen.getByLabelText(/Target % AI-generated/i);
      fireEvent.change(control, { target: { value: '60' } });

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].targetAiPercent).toBe(60);
    });

    it('shows a disclaimer about keeping AI-generated questions low when augmentation is on', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      expect(
        screen.getByText(/generating AI questions can be slow/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/20.*30%|fewer than 20/i)).toBeInTheDocument();
    });

    it('hides the AI disclaimer when augmentation is off', () => {
      mockSettings.current = { provider: 'mock' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      expect(
        screen.queryByText(/generating AI questions can be slow/i)
      ).not.toBeInTheDocument();
    });

    it('shows a validate-questions toggle (default on) and emits validate=true', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const toggle = screen.getByLabelText(/Validate AI questions/i) as HTMLInputElement;
      expect(toggle.checked).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].validate).toBe(true);
    });

    it('emits validate=false when the validate toggle is turned off', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      fireEvent.click(screen.getByLabelText(/Validate AI questions/i));
      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].validate).toBe(false);
    });

    it('hides the validate toggle when augmentation is off', () => {
      mockSettings.current = { provider: 'mock' };
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      expect(screen.queryByLabelText(/Validate AI questions/i)).not.toBeInTheDocument();
    });

    it('shows the expected curated vs AI-generated split in the info text', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      const manyQuestions = Array.from({ length: 80 }, (_, i) => ({
        ...mockQuestions[0],
        id: `q${i}`,
      }));
      render(
        <QuizSetup
          questions={manyQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
          examQuestionCount={50}
        />
      );

      // Default target is 30% of 50 = 15 AI, 35 curated.
      const info = screen.getByText(/randomly selected questions from the existing ones/i);
      expect(info.textContent).toMatch(/about 35/i);
      expect(info.textContent).toMatch(/15 AI-generated/i);
    });

    it('labels the button "Create Quiz" when AI generation is involved', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      const manyQuestions = Array.from({ length: 80 }, (_, i) => ({
        ...mockQuestions[0],
        id: `q${i}`,
      }));
      render(
        <QuizSetup
          questions={manyQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
          examQuestionCount={50}
        />
      );

      expect(screen.getByRole('button', { name: /Create Quiz/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Start Quiz$/i })).not.toBeInTheDocument();
    });

    it('labels the button "Create Quiz" only while a non-zero AI target is set', () => {
      mockSettings.current = { provider: 'openai', apiKey: 'sk-test' };
      const manyQuestions = Array.from({ length: 80 }, (_, i) => ({
        ...mockQuestions[0],
        id: `q${i}`,
      }));
      render(
        <QuizSetup
          questions={manyQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
          examQuestionCount={50}
        />
      );

      // Drop the AI target to 0% with a sufficient curated pool: pure curated.
      fireEvent.change(screen.getByLabelText(/Target % AI-generated/i), {
        target: { value: '0' },
      });
      expect(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i })).toBeInTheDocument();
    });
  });

  describe('Exam modality', () => {
    it('defaults modality to answer-all in the start config', () => {
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].modality).toBe('answer-all');
    });

    it('emits immediate modality when the user selects it', () => {
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const modality = screen.getByLabelText(/Exam Mode/i);
      fireEvent.change(modality, { target: { value: 'immediate' } });

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].modality).toBe('immediate');
    });
  });

  describe('Timed exam toggle', () => {
    it('defaults the timed toggle ON and emits timed=true', () => {
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const toggle = screen.getByLabelText(/Timed exam/i) as HTMLInputElement;
      expect(toggle.checked).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].timed).toBe(true);
    });

    it('emits timed=false when the toggle is turned off', () => {
      render(
        <QuizSetup
          questions={mockQuestions}
          topics={mockTopics}
          onStartQuiz={mockOnStartQuiz}
        />
      );

      const toggle = screen.getByLabelText(/Timed exam/i);
      fireEvent.click(toggle);

      fireEvent.click(screen.getByRole('button', { name: /Start Quiz|Create Quiz/i }));
      expect(mockOnStartQuiz.mock.calls[0][0].timed).toBe(false);
    });
  });
});

// Made with Bob

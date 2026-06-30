/**
 * E2E-lite flow test for the AI-Enhanced Simulator page (Phase 10).
 *
 * Drives the page through setup -> generating -> quiz -> results using a mock
 * AI provider path. Never hits a real network: the certification loader and the
 * QuestionGenerator are mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { AISettings } from '@/lib/types/ai-settings';
import type { CertificationData, Question } from '@/lib/types/certification';
import type { GenerationResult } from '@/lib/ai/generator';

// ---------------------------------------------------------------------------
// Settings mock (controls the configured provider).
// ---------------------------------------------------------------------------
const mockSettings: { current: AISettings } = {
  current: { provider: 'mock', temperature: 0.7, maxTokens: 2000 },
};

const mockCert: { id: string; set: ReturnType<typeof vi.fn> } = {
  id: 'aws-ml',
  set: vi.fn(),
};

vi.mock('@/lib/contexts/settings-context', () => ({
  useSettings: () => ({
    settings: mockSettings.current,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    isLoading: false,
    currentCertificationId: mockCert.id,
    setCurrentCertification: mockCert.set,
  }),
}));

// ---------------------------------------------------------------------------
// Loader mock (no network).
// ---------------------------------------------------------------------------
function curatedQuestion(id: string): Question {
  return {
    id,
    topicId: 'data-eng',
    subtopicId: 'ingestion',
    type: 'multiple-choice',
    difficulty: 'medium',
    question: `Curated question ${id}?`,
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
    correctAnswer: 'a',
    explanation: { correct: 'A', whyOthersWrong: { b: 'no' } },
    metadata: { createdAt: '2026-01-01', lastReviewed: '2026-01-01', source: 'curated' },
  };
}

const certData: CertificationData = {
  config: {
    id: 'aws-ml',
    name: 'AWS Certified Machine Learning',
    code: 'MLS-C01',
    version: '1.0',
    description: 'x',
    provider: 'AWS',
    examDetails: { duration: 180, questionCount: 65, passingScore: 750, scoreRange: { min: 100, max: 1000 } },
    metadata: { lastUpdated: '2026-01-01', difficulty: 'advanced' },
  },
  topics: {
    topics: [
      {
        id: 'data-eng',
        name: 'Data Engineering',
        description: 'x',
        weight: 20,
        order: 1,
        subtopics: [{ id: 'ingestion', name: 'Ingestion', description: 'x', keyPoints: ['Kinesis'] }],
      },
    ],
  },
  // Only 15 curated questions exist.
  questions: { questions: Array.from({ length: 15 }, (_, i) => curatedQuestion(`q${i}`)) },
};

const loadCertificationMock = vi.fn();

vi.mock('@/lib/loaders/certification-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/loaders/certification-loader')>();
  return {
    ...actual,
    loadCertification: (...args: unknown[]) => loadCertificationMock(...args),
  };
});

// ---------------------------------------------------------------------------
// Generator mock (canned generated questions, no network).
// ---------------------------------------------------------------------------
function generatedQuestion(id: string): Question {
  return {
    ...curatedQuestion(id),
    question: `Generated question ${id}?`,
    metadata: { createdAt: '2026-01-02', lastReviewed: '2026-01-02', source: 'ai-generated' },
  };
}

const generateMock = vi.fn();

vi.mock('@/lib/ai/generator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/generator')>();
  return {
    ...actual,
    QuestionGenerator: class {
      generate = generateMock;
      // Real-ish mix: curated first then generated.
      mix = (seed: Question[], generated: Question[]) => [...seed, ...generated];
    },
  };
});

import SimulatorPage from '../page';
import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';
import { ProgressStorage as ProgressStorageRef } from '@/lib/progress/progress-storage';

describe('SimulatorPage (AI-enhanced flow)', () => {
  beforeEach(() => {
    localStorage.clear();
    generateMock.mockReset();
    loadCertificationMock.mockReset();
    loadCertificationMock.mockResolvedValue(certData);
    mockSettings.current = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4' };
    mockCert.id = 'aws-ml';
    mockCert.set.mockReset();
  });

  it('loads the certification from the current certification setting', async () => {
    mockCert.id = 'snowpro-core';
    render(<SimulatorPage />);
    await waitFor(() => {
      expect(loadCertificationMock).toHaveBeenCalledWith('snowpro-core');
    });
  });

  it('runs a 50-question quiz on aws-ml despite only 15 curated questions', async () => {
    // Provide 35 generated questions to fill the gap to 50.
    const generated = Array.from({ length: 35 }, (_, i) => generatedQuestion(`g${i}`));
    const result: GenerationResult = {
      generated,
      rejected: [],
      stats: { requested: 35, produced: 35, approved: 35, flagged: 0, rejected: 0 },
    };
    generateMock.mockResolvedValue(result);

    render(<SimulatorPage />);

    // Setup view appears after the certification loads.
    await screen.findByText('Configure Your Quiz');

    // Request 50 questions with augmentation (ON by default for non-mock).
    const slider = screen.getByLabelText(/Number of Questions/i);
    fireEvent.change(slider, { target: { value: '50' } });

    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Generating view appears.
    await screen.findByText(/Preparing your questions/i);

    // Then the quiz view: progress shows 50 total questions (header + sidebar).
    await waitFor(
      () => expect(screen.getAllByText(/Question 1 of 50/i).length).toBeGreaterThan(0),
      { timeout: 3000 }
    );
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('drives the full flow to results with the mock provider (network-free)', async () => {
    mockSettings.current = { provider: 'mock' };
    // Mock provider, augment OFF by default: curated-only path, no generation.
    render(<SimulatorPage />);

    await screen.findByText('Configure Your Quiz');

    // Keep default count 10 (curated has 15). Start.
    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Should go straight to the quiz (no generating view for curated-only).
    await waitFor(() =>
      expect(screen.getAllByText(/Question 1 of 10/i).length).toBeGreaterThan(0)
    );
    expect(generateMock).not.toHaveBeenCalled();

    // Answer every question and advance to results.
    for (let i = 0; i < 10; i += 1) {
      // Select the first answer option (radio inside a label).
      const optionA = screen.getAllByText('Option A')[0];
      fireEvent.click(optionA);

      const next = screen.queryByRole('button', { name: /Next/i });
      if (next && !(next as HTMLButtonElement).disabled) {
        fireEvent.click(next);
      } else {
        fireEvent.click(screen.getByRole('button', { name: /Submit Quiz/i }));
      }
    }

    // Results view appears (pass or fail heading).
    await screen.findByText(/Congratulations!|Keep Practicing!/i, undefined, { timeout: 3000 });
  });

  it('records progress to localStorage on quiz completion (mock provider)', async () => {
    mockSettings.current = { provider: 'mock' };
    render(<SimulatorPage />);

    await screen.findByText('Configure Your Quiz');
    fireEvent.click(screen.getByRole('button', { name: /Start Quiz/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/Question 1 of 10/i).length).toBeGreaterThan(0)
    );

    for (let i = 0; i < 10; i += 1) {
      const optionA = screen.getAllByText('Option A')[0];
      fireEvent.click(optionA);

      const next = screen.queryByRole('button', { name: /Next/i });
      if (next && !(next as HTMLButtonElement).disabled) {
        fireEvent.click(next);
      } else {
        fireEvent.click(screen.getByRole('button', { name: /Submit Quiz/i }));
      }
    }

    await screen.findByText(/Congratulations!|Keep Practicing!/i, undefined, { timeout: 3000 });

    // Progress for the certification was persisted.
    const raw = localStorage.getItem('certflow_progress_aws-ml');
    expect(raw).toBeTruthy();
    const progress = JSON.parse(raw!);
    expect(progress.sessions).toHaveLength(1);
    expect(progress.topicPerformance['data-eng']).toBeDefined();
  });

  it('discards an active quiz and returns to setup when the certification changes', async () => {
    mockSettings.current = { provider: 'mock' };
    // Seed an active, in-progress session so the page mounts into the quiz view.
    QuizSessionManager.createSession({
      certificationId: 'aws-ml',
      questions: [curatedQuestion('q0'), curatedQuestion('q1')],
    });
    expect(QuizSessionManager.getActiveSessionId()).toBeTruthy();

    const confirmFn = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirmFn);

    const { rerender } = render(<SimulatorPage />);

    // Restored into the quiz view.
    await waitFor(() =>
      expect(screen.getAllByText(/Question 1 of 2/i).length).toBeGreaterThan(0)
    );

    // User switches certification.
    mockCert.id = 'snowpro-core';
    rerender(<SimulatorPage />);

    // Active session is discarded and the user is returned to setup.
    await waitFor(() =>
      expect(QuizSessionManager.getActiveSessionId()).toBeNull()
    );
    await screen.findByText('Configure Your Quiz');
    expect(loadCertificationMock).toHaveBeenCalledWith('snowpro-core');

    vi.unstubAllGlobals();
  });

  it('keeps another certification\'s progress intact when switching', () => {
    // Progress is keyed by cert id, so recording for one cert must not affect
    // another cert's stored progress.
    ProgressStorageRef.recordSession({
      sessionId: 's-aws',
      certificationId: 'aws-ml',
      completedAt: '2026-01-01T00:00:00.000Z',
      totalQuestions: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      unanswered: 0,
      score: 100,
      timeSpent: 10,
      answers: { q0: 'a' },
      questions: [curatedQuestion('q0')],
    });

    expect(localStorage.getItem('certflow_progress_aws-ml')).toBeTruthy();
    expect(localStorage.getItem('certflow_progress_snowpro-core')).toBeNull();
  });
});

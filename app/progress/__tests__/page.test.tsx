import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CertificationData } from '@/lib/types/certification';
import { ProgressStorage } from '@/lib/progress/progress-storage';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const certData: CertificationData = {
  config: {
    id: 'aws-ml',
    name: 'AWS Certified Machine Learning',
    code: 'MLS-C01',
    version: '1.0',
    description: 'x',
    provider: 'AWS',
    examDetails: {
      duration: 180,
      questionCount: 65,
      passingScore: 750,
      scoreRange: { min: 100, max: 1000 },
    },
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
        subtopics: [],
      },
      {
        id: 'modeling',
        name: 'Modeling',
        description: 'x',
        weight: 30,
        order: 2,
        subtopics: [],
      },
    ],
  },
  questions: { questions: [] },
};

const loadCertificationMock = vi.fn();

vi.mock('@/lib/loaders/certification-loader', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/loaders/certification-loader')>();
  return {
    ...actual,
    loadCertification: (...args: unknown[]) => loadCertificationMock(...args),
  };
});

import ProgressPage from '../page';

/** Seed progress for the cert by recording quiz sessions. */
function seedProgress(): void {
  // data-eng: weak (multiple attempts, low score). Use >= floor attempts.
  for (let i = 0; i < 4; i += 1) {
    ProgressStorage.recordSession({
      sessionId: `de-${i}`,
      certificationId: 'aws-ml',
      completedAt: `2026-01-0${i + 1}T00:00:00.000Z`,
      totalQuestions: 1,
      correctAnswers: 0,
      incorrectAnswers: 1,
      unanswered: 0,
      score: 0,
      timeSpent: 30,
      answers: { q: 'b' },
      questions: [
        {
          id: 'q',
          topicId: 'data-eng',
          subtopicId: 'sub',
          type: 'multiple-choice',
          difficulty: 'medium',
          question: 'Q?',
          options: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correctAnswer: 'a',
          explanation: { correct: 'a', whyOthersWrong: {} },
          metadata: { createdAt: '2026', lastReviewed: '2026', source: 'test' },
        },
      ],
    });
  }
}

describe('ProgressPage', () => {
  beforeEach(() => {
    localStorage.clear();
    loadCertificationMock.mockReset();
    loadCertificationMock.mockResolvedValue(certData);
  });

  it('renders weak topics and recent sessions when progress exists', async () => {
    seedProgress();

    render(<ProgressPage />);

    // Weak topic surfaces with its resolved name (in weak + all-topics sections).
    expect((await screen.findAllByText('Data Engineering')).length).toBeGreaterThan(0);
    // Recent sessions section is present.
    expect(screen.getByText(/Recent Sessions/i)).toBeInTheDocument();
  });

  it('renders an empty state when no progress exists', async () => {
    render(<ProgressPage />);

    expect(await screen.findByText(/no progress yet/i)).toBeInTheDocument();
    // Empty state links to the simulator.
    const link = screen.getByRole('link', { name: /start a quiz/i });
    expect(link).toHaveAttribute('href', '/simulator');
  });
});

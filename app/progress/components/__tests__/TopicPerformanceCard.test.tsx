import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopicPerformanceCard from '../TopicPerformanceCard';
import type { TopicPerformance } from '@/lib/progress/types';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function perf(overrides: Partial<TopicPerformance> = {}): TopicPerformance {
  return {
    topicId: 'data-engineering',
    attempted: 10,
    correct: 6,
    averageScore: 60,
    lastPracticed: '2026-01-01T00:00:00.000Z',
    trend: 'flat',
    ...overrides,
  };
}

describe('TopicPerformanceCard', () => {
  it('renders the topic name', () => {
    render(<TopicPerformanceCard performance={perf()} topicName="Data Engineering" />);
    expect(screen.getByText('Data Engineering')).toBeInTheDocument();
  });

  it('renders attempted, correct and average score', () => {
    render(<TopicPerformanceCard performance={perf()} topicName="Data Engineering" />);
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText(/6\s*\/\s*10/)).toBeInTheDocument();
  });

  it('renders an "up" trend badge with an accessible label', () => {
    render(
      <TopicPerformanceCard
        performance={perf({ trend: 'up' })}
        topicName="Data Engineering"
      />
    );
    expect(screen.getByLabelText(/trend: up/i)).toBeInTheDocument();
  });

  it('renders a "down" trend badge', () => {
    render(
      <TopicPerformanceCard
        performance={perf({ trend: 'down' })}
        topicName="Data Engineering"
      />
    );
    expect(screen.getByLabelText(/trend: down/i)).toBeInTheDocument();
  });

  it('renders a "flat" trend badge', () => {
    render(
      <TopicPerformanceCard
        performance={perf({ trend: 'flat' })}
        topicName="Data Engineering"
      />
    );
    expect(screen.getByLabelText(/trend: flat/i)).toBeInTheDocument();
  });

  it('links to the simulator filtered by this topic', () => {
    render(
      <TopicPerformanceCard
        performance={perf({ topicId: 'modeling' })}
        topicName="Modeling"
      />
    );
    const link = screen.getByRole('link', { name: /practice this topic/i });
    expect(link).toHaveAttribute('href', '/simulator?topic=modeling');
  });
});

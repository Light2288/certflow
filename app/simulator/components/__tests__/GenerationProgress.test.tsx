/**
 * GenerationProgress Component Tests (Phase 10).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GenerationProgress from '../GenerationProgress';
import type { GenerationStats } from '@/lib/ai/generator';

describe('GenerationProgress', () => {
  it('renders the three pipeline stages', () => {
    render(<GenerationProgress stage="drafting" onCancel={vi.fn()} />);
    expect(screen.getByTestId('stage-drafting')).toHaveTextContent(/drafting/i);
    expect(screen.getByTestId('stage-validating')).toHaveTextContent(/validating/i);
    expect(screen.getByTestId('stage-mixing')).toHaveTextContent(/mixing/i);
  });

  it('marks the active stage as current', () => {
    render(<GenerationProgress stage="validating" onCancel={vi.fn()} />);
    const active = screen.getByTestId('stage-validating');
    expect(active).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('stage-drafting')).toHaveAttribute('data-active', 'false');
  });

  it('shows optional generation stats when provided', () => {
    const stats: GenerationStats = {
      requested: 35,
      produced: 35,
      approved: 30,
      flagged: 3,
      rejected: 2,
    };
    render(<GenerationProgress stage="mixing" stats={stats} onCancel={vi.fn()} />);
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('fires onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<GenerationProgress stage="drafting" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows live cumulative progress (kept/target and produced breakdown)', () => {
    render(
      <GenerationProgress
        stage="validating"
        progress={{
          target: 40,
          kept: 12,
          produced: 18,
          approved: 10,
          flagged: 2,
          rejected: 6,
          batches: 2,
          tokensUsed: 1234,
        }}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Kept/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText(/10 approved/i)).toBeInTheDocument();
    expect(screen.getByText(/2 flagged/i)).toBeInTheDocument();
    expect(screen.getByText(/6 rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/Tokens used/i)).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('notes when token usage is not reported by the provider', () => {
    render(
      <GenerationProgress
        stage="validating"
        progress={{
          target: 5,
          kept: 2,
          produced: 2,
          approved: 2,
          flagged: 0,
          rejected: 0,
          batches: 1,
          tokensUsed: 0,
        }}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Token usage not reported/i)).toBeInTheDocument();
  });

  it('disables Start Quiz until ready, then enables it and fires onStart', () => {
    const onStart = vi.fn();
    const { rerender } = render(
      <GenerationProgress stage="validating" onStart={onStart} onCancel={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /Preparing|Start Quiz/i })).toBeDisabled();

    rerender(
      <GenerationProgress stage="mixing" ready onStart={onStart} onCancel={vi.fn()} />
    );
    const readyBtn = screen.getByRole('button', { name: /Start Quiz/i });
    expect(readyBtn).not.toBeDisabled();
    fireEvent.click(readyBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Your quiz is ready/i)).toBeInTheDocument();
  });
});

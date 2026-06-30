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
});

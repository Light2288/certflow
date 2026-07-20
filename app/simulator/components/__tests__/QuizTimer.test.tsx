/**
 * QuizTimer component tests.
 *
 * A live countdown that renders mm:ss and fires onExpire exactly once when the
 * remaining time reaches zero.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QuizTimer from '../QuizTimer';

describe('QuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the initial time as mm:ss', () => {
    render(<QuizTimer durationMinutes={2} onExpire={vi.fn()} />);
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('counts down as time passes', () => {
    render(<QuizTimer durationMinutes={1} onExpire={vi.fn()} />);
    expect(screen.getByText('01:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:55')).toBeInTheDocument();
  });

  it('fires onExpire exactly once when it reaches zero', () => {
    const onExpire = vi.fn();
    render(<QuizTimer durationMinutes={1} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Advancing further does not fire again.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('displays 00:00 at expiry, never negative', () => {
    render(<QuizTimer durationMinutes={1} onExpire={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});

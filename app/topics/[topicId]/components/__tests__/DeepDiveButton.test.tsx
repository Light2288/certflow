/**
 * Tests for the DeepDiveButton component.
 *
 * Verifies:
 * - Clicking the button fires the deep-dive call with topic context.
 * - A loading state appears while the call is in flight.
 * - Success renders the markdown response in an inline panel.
 * - An error path renders a friendly message (not an alert) with a Retry affordance.
 * - Re-opening the panel after a successful load does not trigger a second call (caching).
 *
 * Never hits the network — the deep-dive service is mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeepDiveButton from '../DeepDiveButton';
import { SettingsProvider } from '@/lib/contexts/settings-context';
import { AIServiceError } from '@/lib/ai';
import type { Topic } from '@/lib/types/certification';

// Mock the deep-dive service so no network/AI provider is exercised.
const mockGenerateDeepDive = vi.fn();
vi.mock('@/lib/ai/deep-dive', () => ({
  generateDeepDive: (...args: unknown[]) => mockGenerateDeepDive(...args),
}));

// Mock Next.js Link (error messages may link to /settings).
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const topic: Topic = {
  id: 'data-engineering',
  name: 'Data Engineering',
  description: 'Building and maintaining data pipelines for ML workloads.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'de-1',
      name: 'Data Repositories',
      description: 'Where data lives.',
      keyPoints: ['S3 data lakes'],
    },
  ],
};

function renderButton() {
  return render(
    <SettingsProvider>
      <DeepDiveButton topic={topic} />
    </SettingsProvider>
  );
}

describe('DeepDiveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the deep dive button', () => {
    renderButton();
    expect(screen.getByRole('button', { name: /deep dive/i })).toBeInTheDocument();
  });

  it('fires the deep-dive call with the topic when clicked', async () => {
    const user = userEvent.setup();
    mockGenerateDeepDive.mockResolvedValue('## Overview\n\nData Engineering explained.');

    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    await waitFor(() => {
      expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);
    });
    // First arg should be the topic object.
    expect(mockGenerateDeepDive.mock.calls[0][0]).toMatchObject({ id: 'data-engineering' });
  });

  it('shows a loading state while the call is in flight', async () => {
    const user = userEvent.setup();
    let resolveFn: (v: string) => void = () => {};
    mockGenerateDeepDive.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveFn = resolve;
      })
    );

    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    expect(await screen.findByText(/generating|loading/i)).toBeInTheDocument();

    // Resolve to avoid dangling promise.
    resolveFn('## Overview\n\nDone.');
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('renders the markdown response on success', async () => {
    const user = userEvent.setup();
    mockGenerateDeepDive.mockResolvedValue('## Overview\n\nData Engineering explained.');

    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    // The "## Overview" heading should render as an <h2>, not raw text.
    const heading = await screen.findByRole('heading', { name: 'Overview' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Data Engineering explained.')).toBeInTheDocument();
  });

  it('renders a friendly error message (not an alert) with a retry affordance', async () => {
    const user = userEvent.setup();
    const alertMock = vi.fn();
    window.alert = alertMock;
    mockGenerateDeepDive.mockRejectedValue(
      new AIServiceError('missing', 'MISSING_API_KEY', 'openai')
    );

    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    expect(await screen.findByText(/API Key Required/i)).toBeInTheDocument();
    expect(alertMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('does not re-call the service when re-opening after a successful load (caching)', async () => {
    const user = userEvent.setup();
    mockGenerateDeepDive.mockResolvedValue('## Overview\n\nCached content.');

    renderButton();
    const button = screen.getByRole('button', { name: /deep dive/i });

    // First open: triggers the call.
    await user.click(button);
    await screen.findByRole('heading', { name: 'Overview' });
    expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);

    // Collapse.
    await user.click(button);
    // Re-open: should use cached content, no new call.
    await user.click(button);
    await screen.findByRole('heading', { name: 'Overview' });
    expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);
  });
});

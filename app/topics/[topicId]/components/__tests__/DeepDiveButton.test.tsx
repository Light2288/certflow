/**
 * Tests for the reworked DeepDiveButton component.
 *
 * Verifies:
 * - A cached dive (from the store) renders without calling the provider.
 * - A cache miss triggers generation, renders the structured output, and
 *   persists the result.
 * - Regenerate clears the cache and re-generates.
 * - The structured dive renders sections, practice questions, and traps.
 * - An error path renders a friendly message (not an alert) with Retry.
 * - The custom provider routes through /api/chat instead of the client path.
 * - Missing certification data falls back gracefully (no hard error).
 *
 * Never hits the network — the deep-dive service, store, and loaders are
 * mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeepDiveButton from '../DeepDiveButton';
import { SettingsProvider } from '@/lib/contexts/settings-context';
import { AIServiceError } from '@/lib/ai';
import type { Topic } from '@/lib/types/certification';
import type { DeepDive } from '@/lib/ai/deep-dive';

// --- Mocks -----------------------------------------------------------------

const mockGenerateDeepDive = vi.fn();
const mockParseDeepDive = vi.fn();
const mockBuildDeepDiveSystemPrompt = vi.fn(() => 'CERT SYSTEM PROMPT');
const mockGetDeepDive = vi.fn();
const mockSetDeepDive = vi.fn();
const mockClearDeepDive = vi.fn();

vi.mock('@/lib/ai/deep-dive', () => ({
  generateDeepDive: (...args: unknown[]) => mockGenerateDeepDive(...args),
  parseDeepDive: (...args: unknown[]) => mockParseDeepDive(...args),
  buildDeepDivePrompt: () => 'deep dive prompt',
  buildDeepDiveSystemPrompt: (...args: unknown[]) =>
    mockBuildDeepDiveSystemPrompt(...args),
  getDeepDive: (...args: unknown[]) => mockGetDeepDive(...args),
  setDeepDive: (...args: unknown[]) => mockSetDeepDive(...args),
  clearDeepDive: (...args: unknown[]) => mockClearDeepDive(...args),
}));

const mockLoadConfig = vi.fn();
const mockLoadTopics = vi.fn();
const mockLoadQuestions = vi.fn();

vi.mock('@/lib/loaders/certification-loader', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/lib/loaders/certification-loader')
  >();
  return {
    ...actual,
    loadCertificationConfig: (...a: unknown[]) => mockLoadConfig(...a),
    loadCertificationTopics: (...a: unknown[]) => mockLoadTopics(...a),
    loadCertificationQuestions: (...a: unknown[]) => mockLoadQuestions(...a),
  };
});

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

const sampleDive: DeepDive = {
  topicId: 'data-engineering',
  sections: [{ heading: 'Overview', body: 'Data Engineering explained.' }],
  practiceQuestions: [
    {
      question: 'Which service ingests streams?',
      options: [
        { id: 'a', text: 'Kinesis' },
        { id: 'b', text: 'Glacier' },
      ],
      correctAnswer: 'a',
      explanation: 'Kinesis handles streaming.',
    },
  ],
  traps: [
    { trap: 'Confusing Glacier with Kinesis', why: 'They serve different needs.' },
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
    // Default: no cached dive; loaders succeed with minimal data.
    mockGetDeepDive.mockReturnValue(null);
    mockLoadConfig.mockResolvedValue({
      id: 'aws-ml',
      name: 'AWS ML',
      code: 'MLS-C01',
      version: '1',
      description: '',
      provider: 'AWS',
      examDetails: {
        duration: 180,
        questionCount: 65,
        passingScore: 750,
        scoreRange: { min: 100, max: 1000 },
      },
      metadata: { lastUpdated: '2026-01-01', difficulty: 'advanced' },
    });
    mockLoadTopics.mockResolvedValue({ topics: [topic] });
    mockLoadQuestions.mockResolvedValue({ questions: [] });
    mockGenerateDeepDive.mockResolvedValue(sampleDive);
  });

  it('renders the deep dive button', () => {
    renderButton();
    expect(
      screen.getByRole('button', { name: /deep dive/i })
    ).toBeInTheDocument();
  });

  it('renders a cached dive without calling the provider', async () => {
    mockGetDeepDive.mockReturnValue({
      certId: 'aws-ml',
      topicId: 'data-engineering',
      generatedAt: 1,
      dive: sampleDive,
    });

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    expect(await screen.findByText('Data Engineering explained.')).toBeInTheDocument();
    expect(mockGenerateDeepDive).not.toHaveBeenCalled();
  });

  it('generates on a cache miss, renders the structured dive, and persists it', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    // Section body renders.
    expect(
      await screen.findByText('Data Engineering explained.')
    ).toBeInTheDocument();
    // Practice question and trap render.
    expect(screen.getByText(/Which service ingests streams\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Confusing Glacier with Kinesis/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);
      expect(mockSetDeepDive).toHaveBeenCalledTimes(1);
    });
  });

  it('regenerate clears the cache and re-generates', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));
    await screen.findByText('Data Engineering explained.');
    expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => {
      expect(mockClearDeepDive).toHaveBeenCalledTimes(1);
      expect(mockGenerateDeepDive).toHaveBeenCalledTimes(2);
    });
  });

  it('renders a friendly error (not an alert) with a retry affordance', async () => {
    const alertMock = vi.fn();
    window.alert = alertMock;
    mockGenerateDeepDive.mockRejectedValue(
      new AIServiceError('missing', 'MISSING_API_KEY', 'openai')
    );

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    expect(await screen.findByText(/API Key Required/i)).toBeInTheDocument();
    expect(alertMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('routes the custom provider through /api/chat and parses the result', async () => {
    localStorage.setItem(
      'certflow_ai_settings',
      JSON.stringify({
        provider: 'custom',
        apiKey: 'ibm-key-123',
        baseUrl: 'https://api.example.com/v1',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
      })
    );

    mockParseDeepDive.mockReturnValue(sampleDive);

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: JSON.stringify(sampleDive),
          model: 'gpt-4o-mini',
          finishReason: 'stop',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/chat', expect.anything());
    });
    expect(mockGenerateDeepDive).not.toHaveBeenCalled();
    expect(await screen.findByText('Data Engineering explained.')).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('falls back gracefully when certification data fails to load', async () => {
    mockLoadQuestions.mockRejectedValue(new Error('network'));
    mockLoadConfig.mockRejectedValue(new Error('network'));
    mockLoadTopics.mockRejectedValue(new Error('network'));

    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /deep dive/i }));

    // Still generates a topic-only dive; no hard error surfaced.
    expect(
      await screen.findByText('Data Engineering explained.')
    ).toBeInTheDocument();
    expect(mockGenerateDeepDive).toHaveBeenCalledTimes(1);
  });
});

/**
 * Tests for the useTutorSystemPrompt hook.
 *
 * Verifies that the hook loads certification config + topics for the current
 * certification, builds a memoized system prompt, and falls back to null on
 * load failure or when no certification is selected.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTutorSystemPrompt } from '../use-tutor-system-prompt';
import { SettingsProvider } from '@/lib/contexts/settings-context';
import * as appSettingsStorage from '@/lib/settings/app-settings-storage';
import * as loader from '@/lib/loaders/certification-loader';
import type {
  CertificationConfig,
  TopicsData,
} from '@/lib/types/certification';

const config: CertificationConfig = {
  id: 'snowpro-core',
  name: 'SnowPro Core Certification',
  code: 'COF-C02',
  version: '2024',
  description: 'Snowflake core certification.',
  provider: 'Snowflake',
  examDetails: {
    duration: 115,
    questionCount: 100,
    passingScore: 750,
    scoreRange: { min: 0, max: 1000 },
  },
  metadata: { lastUpdated: '2024-01-01', difficulty: 'intermediate' },
};

const topics: TopicsData = {
  topics: [
    {
      id: 'architecture',
      name: 'Snowflake Architecture',
      description: 'Core architecture.',
      weight: 25,
      order: 1,
      subtopics: [
        {
          id: 'storage',
          name: 'Storage Layer',
          description: 'Storage.',
          keyPoints: ['Micro-partitions'],
        },
      ],
    },
  ],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

function mockCurrentCert(id: string) {
  vi.spyOn(appSettingsStorage, 'loadAppSettings').mockReturnValue({
    success: true,
    data: { currentCertificationId: id },
  });
}

describe('useTutorSystemPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a system prompt from loaded config and topics', async () => {
    mockCurrentCert('snowpro-core');
    vi.spyOn(loader, 'loadCertificationConfig').mockResolvedValue(config);
    vi.spyOn(loader, 'loadCertificationTopics').mockResolvedValue(topics);

    const { result } = renderHook(() => useTutorSystemPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current).toContain('SnowPro Core Certification');
    expect(result.current).toContain('Snowflake Architecture');
  });

  it('returns null when a loader rejects', async () => {
    mockCurrentCert('snowpro-core');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(loader, 'loadCertificationConfig').mockRejectedValue(
      new Error('not found')
    );
    vi.spyOn(loader, 'loadCertificationTopics').mockResolvedValue(topics);

    const { result } = renderHook(() => useTutorSystemPrompt(), { wrapper });

    await waitFor(() => {
      expect(warn).toHaveBeenCalled();
    });

    expect(result.current).toBeNull();
  });

  it('returns null when the current certification id is empty', async () => {
    // Provider hydrates its currentCertificationId from storage; an empty id
    // must resolve the prompt to null (no system prompt).
    mockCurrentCert('');
    vi.spyOn(loader, 'loadCertificationConfig').mockResolvedValue(config);
    vi.spyOn(loader, 'loadCertificationTopics').mockResolvedValue(topics);

    const { result } = renderHook(() => useTutorSystemPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('does not call the loaders when the current certification id is empty', async () => {
    // Drive an empty id directly (bypassing the provider's default-then-hydrate
    // sequence) to isolate the guard branch of the hook.
    const settings = await import('@/lib/contexts/settings-context');
    vi.spyOn(settings, 'useSettings').mockReturnValue({
      settings: {} as never,
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      isLoading: false,
      currentCertificationId: '',
      setCurrentCertification: vi.fn(),
    });
    const configSpy = vi.spyOn(loader, 'loadCertificationConfig');
    const topicsSpy = vi.spyOn(loader, 'loadCertificationTopics');

    const { result } = renderHook(() => useTutorSystemPrompt());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    expect(configSpy).not.toHaveBeenCalled();
    expect(topicsSpy).not.toHaveBeenCalled();
  });

  it('loads the certification only once (memoized) on stable id', async () => {
    mockCurrentCert('snowpro-core');
    const configSpy = vi
      .spyOn(loader, 'loadCertificationConfig')
      .mockResolvedValue(config);
    vi.spyOn(loader, 'loadCertificationTopics').mockResolvedValue(topics);

    const { result, rerender } = renderHook(() => useTutorSystemPrompt(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    rerender();
    rerender();

    expect(configSpy).toHaveBeenCalledTimes(1);
  });
});

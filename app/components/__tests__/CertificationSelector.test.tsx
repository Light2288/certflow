import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CertificationSelector from '../CertificationSelector';
import { SettingsProvider } from '@/lib/contexts/settings-context';
import * as loader from '@/lib/loaders/certification-loader';

vi.mock('@/lib/loaders/certification-loader', async () => {
  const actual = await vi.importActual<typeof loader>(
    '@/lib/loaders/certification-loader'
  );
  return {
    ...actual,
    loadCertificationList: vi.fn(),
  };
});

const mockedList = vi.mocked(loader.loadCertificationList);

const renderSelector = () =>
  render(
    <SettingsProvider>
      <CertificationSelector />
    </SettingsProvider>
  );

describe('CertificationSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('lists all certifications from the manifest', async () => {
    mockedList.mockResolvedValue([
      { id: 'aws-ml', name: 'AWS Certified Machine Learning', code: 'MLS-C01' },
      { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
    ]);

    renderSelector();

    await waitFor(() => {
      expect(
        screen.getByText('AWS Certified Machine Learning (MLS-C01)')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Snowflake SnowPro Core (COF-C03)')
    ).toBeInTheDocument();
  });

  it('updates the current certification setting when an option is chosen', async () => {
    mockedList.mockResolvedValue([
      { id: 'aws-ml', name: 'AWS Certified Machine Learning', code: 'MLS-C01' },
      { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
    ]);

    renderSelector();

    const select = await screen.findByRole('combobox', {
      name: /certification/i,
    });

    fireEvent.change(select, { target: { value: 'snowpro-core' } });

    await waitFor(() => {
      const stored = localStorage.getItem('certflow_app_settings');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).currentCertificationId).toBe('snowpro-core');
    });
  });

  it('renders gracefully when the list is empty', async () => {
    mockedList.mockResolvedValue([]);

    renderSelector();

    // Should not throw; the select (if rendered) has no certification options.
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });
    expect(
      screen.queryByText(/MLS-C01/)
    ).not.toBeInTheDocument();
  });

  it('does not crash when the manifest fails to load', async () => {
    mockedList.mockRejectedValue(new Error('network down'));

    renderSelector();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });
    // No crash; nothing certification-specific rendered.
    expect(screen.queryByText(/MLS-C01/)).not.toBeInTheDocument();
  });
});

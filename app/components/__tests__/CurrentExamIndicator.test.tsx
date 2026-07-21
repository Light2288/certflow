import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CurrentExamIndicator from '../CurrentExamIndicator';
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

const setSelected = (id: string) => {
  localStorage.setItem(
    'certflow_app_settings',
    JSON.stringify({ currentCertificationId: id })
  );
};

const renderIndicator = () =>
  render(
    <SettingsProvider>
      <CurrentExamIndicator />
    </SettingsProvider>
  );

describe('CurrentExamIndicator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows the selected certification name and code', async () => {
    setSelected('snowpro-core');
    mockedList.mockResolvedValue([
      { id: 'aws-ml', name: 'AWS Certified Machine Learning', code: 'MLS-C01' },
      { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
    ]);

    renderIndicator();

    await waitFor(() => {
      expect(
        screen.getByText('Snowflake SnowPro Core (COF-C03)')
      ).toBeInTheDocument();
    });
  });

  it('is not a form control (read-only, cannot change the exam)', async () => {
    setSelected('snowpro-core');
    mockedList.mockResolvedValue([
      { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
    ]);

    renderIndicator();

    await waitFor(() => {
      expect(
        screen.getByText('Snowflake SnowPro Core (COF-C03)')
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when the list is empty', async () => {
    setSelected('snowpro-core');
    mockedList.mockResolvedValue([]);

    const { container } = renderIndicator();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the selected id is not in the list', async () => {
    setSelected('unknown-cert');
    mockedList.mockResolvedValue([
      { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
    ]);

    const { container } = renderIndicator();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(/Snowflake SnowPro Core/)
    ).not.toBeInTheDocument();
  });

  it('does not crash when the manifest fails to load', async () => {
    setSelected('snowpro-core');
    mockedList.mockRejectedValue(new Error('network down'));

    const { container } = renderIndicator();

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});

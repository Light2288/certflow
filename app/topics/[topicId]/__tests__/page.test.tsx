import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TopicDetailPage from '../page';
import * as certificationLoader from '@/lib/loaders/certification-loader';
import type { Topic } from '@/lib/types/certification';

// Create a mock function for useParams
const mockUseParams = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

// Mock the certification loader
vi.mock('@/lib/loaders/certification-loader', () => ({
  loadCertificationTopics: vi.fn(),
  getTopicById: vi.fn(),
}));

const mockCert = { id: 'aws-ml' };

vi.mock('@/lib/contexts/settings-context', () => ({
  useSettings: () => ({
    settings: { provider: 'mock' },
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    isLoading: false,
    currentCertificationId: mockCert.id,
    setCurrentCertification: vi.fn(),
  }),
}));

// Mock the DeepDiveButton component
vi.mock('../components/DeepDiveButton', () => ({
  default: ({ topicId, topicName }: { topicId: string; topicName: string }) => (
    <button data-testid="deep-dive-button">
      Deep Dive: {topicName} ({topicId})
    </button>
  ),
}));

const mockTopics: Topic[] = [
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    description: 'Creating data repositories for ML',
    weight: 20,
    order: 1,
    subtopics: [
      {
        id: 'data-repositories',
        name: 'Data Repositories for ML',
        description: 'Understanding AWS storage services',
        keyPoints: [
          'S3 for large-scale data storage',
          'Data Lakes vs Data Warehouses',
        ],
      },
      {
        id: 'data-ingestion',
        name: 'Data Ingestion Solutions',
        description: 'Implementing data ingestion pipelines',
        keyPoints: [
          'Streaming vs Batch ingestion',
          'AWS Glue for ETL',
        ],
      },
    ],
  },
  {
    id: 'modeling',
    name: 'Modeling',
    description: 'Framing business problems as ML problems',
    weight: 36,
    order: 3,
    subtopics: [
      {
        id: 'model-selection',
        name: 'Model Selection',
        description: 'Choosing the right algorithm',
        keyPoints: [
          'Supervised vs unsupervised learning',
          'Classification vs regression',
        ],
      },
    ],
  },
];

describe('TopicDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCert.id = 'aws-ml';
  });

  it('loads topics for the current certification setting', async () => {
    mockCert.id = 'snowpro-core';
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });
    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(certificationLoader.loadCertificationTopics).toHaveBeenCalledWith(
        'snowpro-core'
      );
    });
  });

  it('renders loading state initially', () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TopicDetailPage />);

    expect(screen.getByText('Loading topic details...')).toBeInTheDocument();
  });

  it('renders topic details successfully', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Data Engineering')).toBeInTheDocument();
    });

    expect(screen.getByText('Creating data repositories for ML')).toBeInTheDocument();
    expect(screen.getByText('2 Subtopics')).toBeInTheDocument();
    expect(screen.getByText('20% of exam')).toBeInTheDocument();
  });

  it('renders all subtopics with key points', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Data Repositories for ML')).toBeInTheDocument();
    });

    expect(screen.getByText('Data Ingestion Solutions')).toBeInTheDocument();
    expect(screen.getByText('S3 for large-scale data storage')).toBeInTheDocument();
    expect(screen.getByText('Streaming vs Batch ingestion')).toBeInTheDocument();
  });

  it('renders Deep Dive button', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('deep-dive-button')).toBeInTheDocument();
    });

    expect(screen.getByText(/Deep Dive: Data Engineering/)).toBeInTheDocument();
  });

  it('handles topic not found', async () => {
    mockUseParams.mockReturnValue({ topicId: 'non-existent' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(undefined);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Topic not found')).toBeInTheDocument();
    });

    expect(screen.getByText("The topic you're looking for doesn't exist or couldn't be loaded.")).toBeInTheDocument();
  });

  it('handles loading error', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockRejectedValue(
      new Error('Network error')
    );

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load topic details')).toBeInTheDocument();
    });
  });

  it('renders back to topics link', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      const backLink = screen.getByText('Back to Topics');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/topics');
    });
  });

  it('displays correct statistics', async () => {
    mockUseParams.mockReturnValue({ topicId: 'modeling' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[1]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('1 Subtopic')).toBeInTheDocument();
    });

    expect(screen.getByText('36% of exam')).toBeInTheDocument();
  });

  it('renders subtopic descriptions', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Understanding AWS storage services')).toBeInTheDocument();
    });

    expect(screen.getByText('Implementing data ingestion pipelines')).toBeInTheDocument();
  });

  it('renders all key points for each subtopic', async () => {
    mockUseParams.mockReturnValue({ topicId: 'data-engineering' });

    vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue({
      topics: mockTopics,
    });
    vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopics[0]);

    render(<TopicDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Data Lakes vs Data Warehouses')).toBeInTheDocument();
    });

    expect(screen.getByText('AWS Glue for ETL')).toBeInTheDocument();
  });
});

// Made with Bob

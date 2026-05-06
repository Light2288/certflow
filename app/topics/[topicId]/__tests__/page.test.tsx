import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as certificationLoader from '@/lib/loaders/certification-loader';
import type { TopicsData, Topic } from '@/lib/types/certification';

// Mock certification loader
vi.mock('@/lib/loaders/certification-loader', () => ({
  loadCertificationTopics: vi.fn(),
  getTopicById: vi.fn(),
}));

describe('TopicDetailPage Data Loading', () => {
  const mockTopicsData: TopicsData = {
    topics: [
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
              'Amazon SageMaker Feature Store',
            ],
          },
          {
            id: 'data-ingestion',
            name: 'Data Ingestion Solutions',
            description: 'Implementing data ingestion pipelines',
            keyPoints: [
              'Streaming vs Batch ingestion',
              'AWS Glue for ETL',
              'Amazon Kinesis for real-time streaming',
            ],
          },
        ],
      },
      {
        id: 'modeling',
        name: 'Modeling',
        description: 'Training and tuning ML models',
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
    ],
  };

  const mockTopic: Topic = mockTopicsData.topics[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Loading Logic', () => {
    it('should call loadCertificationTopics with correct certification ID', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopic);

      // Import and call the page component
      const TopicDetailPage = (await import('../page')).default;
      await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(certificationLoader.loadCertificationTopics).toHaveBeenCalledWith('aws-ml');
    });

    it('should call getTopicById with correct parameters', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopic);

      const TopicDetailPage = (await import('../page')).default;
      await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(certificationLoader.getTopicById).toHaveBeenCalledWith(
        'data-engineering',
        mockTopicsData
      );
    });

    it('should handle different topic IDs', async () => {
      const modelingTopic = mockTopicsData.topics[1];
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(modelingTopic);

      const TopicDetailPage = (await import('../page')).default;
      await TopicDetailPage({ params: Promise.resolve({ topicId: 'modeling' }) });

      expect(certificationLoader.getTopicById).toHaveBeenCalledWith('modeling', mockTopicsData);
    });

    it('should handle topic not found', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(undefined);

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'non-existent' }) });

      // Component should render without throwing
      expect(result).toBeDefined();
    });

    it('should handle loading errors', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockRejectedValue(
        new Error('Network error')
      );

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      // Component should render error state without throwing
      expect(result).toBeDefined();
    });
  });

  describe('Topic Data Structure', () => {
    it('should work with topic containing subtopics', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopic);

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(result).toBeDefined();
      expect(mockTopic.subtopics.length).toBe(2);
    });

    it('should work with topic with no subtopics', async () => {
      const topicWithNoSubtopics: Topic = {
        id: 'empty-topic',
        name: 'Empty Topic',
        description: 'A topic with no subtopics',
        weight: 10,
        order: 4,
        subtopics: [],
      };

      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(topicWithNoSubtopics);

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'empty-topic' }) });

      expect(result).toBeDefined();
    });

    it('should work with subtopic with empty key points', async () => {
      const topicWithEmptyKeyPoints: Topic = {
        ...mockTopic,
        subtopics: [
          {
            id: 'test-subtopic',
            name: 'Test Subtopic',
            description: 'Test description',
            keyPoints: [],
          },
        ],
      };

      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(topicWithEmptyKeyPoints);

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(result).toBeDefined();
    });

    it('should work with very long topic names', async () => {
      const longNameTopic: Topic = {
        ...mockTopic,
        name: 'This is a very long topic name that should still render correctly without breaking the layout or causing any visual issues',
      };

      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(longNameTopic);

      const TopicDetailPage = (await import('../page')).default;
      const result = await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(result).toBeDefined();
    });
  });

  describe('Params Handling', () => {
    it('should await params promise correctly', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopic);

      const TopicDetailPage = (await import('../page')).default;
      
      // Create a promise that resolves to params
      const paramsPromise = Promise.resolve({ topicId: 'data-engineering' });
      
      const result = await TopicDetailPage({ params: paramsPromise });

      expect(result).toBeDefined();
      expect(certificationLoader.getTopicById).toHaveBeenCalledWith('data-engineering', mockTopicsData);
    });

    it('should handle params with different topic IDs', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(mockTopicsData.topics[1]);

      const TopicDetailPage = (await import('../page')).default;
      await TopicDetailPage({ params: Promise.resolve({ topicId: 'modeling' }) });

      expect(certificationLoader.getTopicById).toHaveBeenCalledWith('modeling', mockTopicsData);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when topic is not found', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockResolvedValue(mockTopicsData);
      vi.mocked(certificationLoader.getTopicById).mockReturnValue(undefined);

      const TopicDetailPage = (await import('../page')).default;
      
      await expect(
        TopicDetailPage({ params: Promise.resolve({ topicId: 'non-existent' }) })
      ).resolves.toBeDefined();
    });

    it('should not throw when loading fails', async () => {
      vi.mocked(certificationLoader.loadCertificationTopics).mockRejectedValue(
        new Error('Network error')
      );

      const TopicDetailPage = (await import('../page')).default;
      
      await expect(
        TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) })
      ).resolves.toBeDefined();
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(certificationLoader.loadCertificationTopics).mockRejectedValue(
        new Error('Network error')
      );

      const TopicDetailPage = (await import('../page')).default;
      await TopicDetailPage({ params: Promise.resolve({ topicId: 'data-engineering' }) });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load topic:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

// Made with Bob

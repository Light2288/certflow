import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCertification,
  loadCertificationConfig,
  loadCertificationTopics,
  loadCertificationQuestions,
} from '../certification-loader';

// Mock fetch for integration tests
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Certification Loader Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('loadCertificationConfig', () => {
    it('should successfully load valid config', async () => {
      const mockConfig = {
        id: 'test-cert',
        name: 'Test Cert',
        code: 'TEST-001',
        version: '1.0',
        description: 'Test',
        provider: 'Test Provider',
        examDetails: {
          duration: 120,
          questionCount: 50,
          passingScore: 700,
          scoreRange: { min: 100, max: 1000 },
        },
        metadata: {
          lastUpdated: '2024-01-01',
          difficulty: 'intermediate' as const,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const result = await loadCertificationConfig('test-cert');
      
      expect(result).toEqual(mockConfig);
      expect(mockFetch).toHaveBeenCalledWith('/data/certifications/test-cert/config.json');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(loadCertificationConfig('invalid-cert')).rejects.toThrow(
        'Failed to load certification config'
      );
    });

    it('should throw error when config is invalid', async () => {
      const invalidConfig = {
        // Missing required fields
        version: '1.0',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidConfig,
      });

      await expect(loadCertificationConfig('invalid-cert')).rejects.toThrow(
        'Invalid certification config'
      );
    });
  });

  describe('loadCertificationTopics', () => {
    it('should successfully load valid topics', async () => {
      const mockTopics = {
        topics: [
          {
            id: 'topic-1',
            name: 'Topic One',
            description: 'Description',
            weight: 100,
            order: 1,
            subtopics: [
              {
                id: 'sub-1',
                name: 'Subtopic',
                description: 'Description',
                keyPoints: ['Point 1'],
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTopics,
      });

      const result = await loadCertificationTopics('test-cert');
      
      expect(result).toEqual(mockTopics);
    });

    it('should throw error for invalid topics data', async () => {
      const invalidTopics = {
        topics: 'not-an-array',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidTopics,
      });

      await expect(loadCertificationTopics('test-cert')).rejects.toThrow(
        'Invalid topics data'
      );
    });
  });

  describe('loadCertificationQuestions', () => {
    it('should successfully load valid questions', async () => {
      const mockQuestions = {
        questions: [
          {
            id: 'q1',
            topicId: 'topic-1',
            subtopicId: 'sub-1',
            type: 'multiple-choice' as const,
            difficulty: 'medium' as const,
            question: 'Test question?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correctAnswer: 'a',
            explanation: {
              correct: 'Correct explanation',
              whyOthersWrong: { b: 'Wrong because...' },
            },
            metadata: {
              createdAt: '2024-01-01',
              lastReviewed: '2024-01-01',
              source: 'test',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuestions,
      });

      const result = await loadCertificationQuestions('test-cert');
      
      expect(result).toEqual(mockQuestions);
    });

    it('should throw error for invalid questions data', async () => {
      const invalidQuestions = {
        questions: [
          {
            // Missing required fields
            type: 'multiple-choice',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidQuestions,
      });

      await expect(loadCertificationQuestions('test-cert')).rejects.toThrow(
        'Invalid questions'
      );
    });
  });

  describe('loadCertification', () => {
    it('should load complete certification data', async () => {
      const mockConfig = {
        id: 'test-cert',
        name: 'Test Cert',
        code: 'TEST-001',
        version: '1.0',
        description: 'Test',
        provider: 'Test Provider',
        examDetails: {
          duration: 120,
          questionCount: 50,
          passingScore: 700,
          scoreRange: { min: 100, max: 1000 },
        },
        metadata: {
          lastUpdated: '2024-01-01',
          difficulty: 'intermediate' as const,
        },
      };

      const mockTopics = {
        topics: [
          {
            id: 'topic-1',
            name: 'Topic One',
            description: 'Description',
            weight: 100,
            order: 1,
            subtopics: [
              {
                id: 'sub-1',
                name: 'Subtopic',
                description: 'Description',
                keyPoints: ['Point 1'],
              },
            ],
          },
        ],
      };

      const mockQuestions = {
        questions: [
          {
            id: 'q1',
            topicId: 'topic-1',
            subtopicId: 'sub-1',
            type: 'multiple-choice' as const,
            difficulty: 'medium' as const,
            question: 'Test question?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correctAnswer: 'a',
            explanation: {
              correct: 'Correct explanation',
              whyOthersWrong: { b: 'Wrong because...' },
            },
            metadata: {
              createdAt: '2024-01-01',
              lastReviewed: '2024-01-01',
              source: 'test',
            },
          },
        ],
      };

      // Mock all three fetch calls
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockConfig })
        .mockResolvedValueOnce({ ok: true, json: async () => mockTopics })
        .mockResolvedValueOnce({ ok: true, json: async () => mockQuestions });

      const result = await loadCertification('test-cert');
      
      expect(result).toEqual({
        config: mockConfig,
        topics: mockTopics,
        questions: mockQuestions,
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should fail if any part fails to load', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, statusText: 'Not Found' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await expect(loadCertification('test-cert')).rejects.toThrow();
    });
  });
});

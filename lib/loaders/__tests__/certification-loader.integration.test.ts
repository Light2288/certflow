import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCertification,
  loadCertificationConfig,
  loadCertificationTopics,
  loadCertificationQuestions,
  loadCertificationList,
  validateCertificationConfig,
  validateTopics,
  validateQuestions,
} from '../certification-loader';
import snowproConfig from '@/public/data/certifications/snowpro-core/config.json';
import snowproTopics from '@/public/data/certifications/snowpro-core/topics.json';
import snowproQuestions from '@/public/data/certifications/snowpro-core/questions.json';
import type {
  CertificationConfig,
  TopicsData,
  QuestionsData,
} from '@/lib/types/certification';

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
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/data/certifications/test-cert/config.json',
        { cache: 'no-store' }
      );
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

  describe('loadCertificationList', () => {
    it('should load and return the certification summaries from the manifest', async () => {
      const manifest = {
        certifications: [
          { id: 'aws-ml', name: 'AWS Certified Machine Learning', code: 'MLS-C01' },
          { id: 'snowpro-core', name: 'Snowflake SnowPro Core', code: 'COF-C03' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => manifest,
      });

      const result = await loadCertificationList();

      expect(result).toEqual(manifest.certifications);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/data/certifications/index.json',
        { cache: 'no-store' }
      );
    });

    it('should throw when the manifest fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(loadCertificationList()).rejects.toThrow(
        'Failed to load certification list'
      );
    });
  });

  describe('Snowflake SnowPro Core (COF-C03) certification data', () => {
    it('has a valid config', () => {
      const result = validateCertificationConfig(
        snowproConfig as CertificationConfig
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect((snowproConfig as CertificationConfig).id).toBe('snowpro-core');
      expect((snowproConfig as CertificationConfig).code).toBe('COF-C03');
    });

    it('has valid topics with weights summing to 100', () => {
      const result = validateTopics(snowproTopics as TopicsData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect((snowproTopics as TopicsData).topics.length).toBeGreaterThanOrEqual(3);
    });

    it('has valid questions referencing existing topics/subtopics', () => {
      const result = validateQuestions(snowproQuestions as QuestionsData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const topicIds = new Set(
        (snowproTopics as TopicsData).topics.map((t) => t.id)
      );
      for (const q of (snowproQuestions as QuestionsData).questions) {
        expect(topicIds.has(q.topicId)).toBe(true);
      }
    });

    it('loads end-to-end through loadCertification with mocked fetch', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => snowproConfig })
        .mockResolvedValueOnce({ ok: true, json: async () => snowproTopics })
        .mockResolvedValueOnce({ ok: true, json: async () => snowproQuestions });

      const result = await loadCertification('snowpro-core');

      expect(result.config.id).toBe('snowpro-core');
      expect(result.topics.topics.length).toBeGreaterThanOrEqual(3);
      expect(result.questions.questions.length).toBeGreaterThan(0);
    });
  });
});

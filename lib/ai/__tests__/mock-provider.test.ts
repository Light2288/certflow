/**
 * Tests for MockAIProvider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAIProvider } from '../providers/mock-provider';
import type { ChatMessage } from '../types';

describe('MockAIProvider', () => {
  let provider: MockAIProvider;

  beforeEach(() => {
    provider = new MockAIProvider();
  });

  describe('Basic Properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('mock');
    });
  });

  describe('chat()', () => {
    it('should return a response for a simple message', async () => {
      const response = await provider.chat('Hello');
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.model).toBe('mock-model');
      expect(response.finishReason).toBe('stop');
    });

    it('should return data engineering response for relevant keywords', async () => {
      const response = await provider.chat('Tell me about data engineering');
      
      expect(response.content).toContain('Data Engineering');
      expect(response.content).toContain('Data Repositories');
      expect(response.content).toContain('20%');
    });

    it('should return feature engineering response for relevant keywords', async () => {
      const response = await provider.chat('What is feature engineering?');
      
      expect(response.content).toContain('Feature Engineering');
      expect(response.content).toContain('Data Preparation');
      expect(response.content).toContain('24%');
    });

    it('should return modeling response for relevant keywords', async () => {
      const response = await provider.chat('Explain modeling');
      
      expect(response.content).toContain('Modeling');
      expect(response.content).toContain('Model Selection');
      expect(response.content).toContain('36%');
    });

    it('should return help response for help keywords', async () => {
      const response = await provider.chat('How can you help me?');
      
      expect(response.content).toContain('help you prepare');
      expect(response.content).toContain('Explain Topics');
    });

    it('should return study tips for study keywords', async () => {
      const response = await provider.chat('Give me study tips');
      
      expect(response.content).toContain('study strategies');
      expect(response.content).toContain('Focus on High-Weight Topics');
    });

    it('should return SageMaker info for SageMaker keywords', async () => {
      const response = await provider.chat('What is SageMaker?');
      
      expect(response.content).toContain('SageMaker');
      expect(response.content).toContain('SageMaker Studio');
    });

    it('should return default response for unrecognized input', async () => {
      const response = await provider.chat('random unrelated question');
      
      expect(response.content).toContain('demo mode');
      expect(response.content).toContain('Data Engineering');
    });

    it('should include usage statistics', async () => {
      const message = 'Test message';
      const response = await provider.chat(message);
      
      expect(response.usage).toBeDefined();
      expect(response.usage?.promptTokens).toBe(message.length);
      expect(response.usage?.completionTokens).toBe(response.content.length);
      expect(response.usage?.totalTokens).toBe(message.length + response.content.length);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await provider.chat('Test');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(1000); // At least 1 second
      expect(duration).toBeLessThan(3000); // Less than 3 seconds
    });

    it('should handle conversation history (even if not used)', async () => {
      const history: ChatMessage[] = [
        { role: 'user', content: 'Previous message', timestamp: new Date() },
        { role: 'assistant', content: 'Previous response', timestamp: new Date() },
      ];
      
      const response = await provider.chat('New message', history);
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });

    it('should handle options parameter (even if not used)', async () => {
      const response = await provider.chat('Test', undefined, {
        temperature: 0.5,
        maxTokens: 100,
        model: 'custom-model',
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    });
  });

  describe('validateConfig()', () => {
    it('should validate mock provider config', async () => {
      const isValid = await provider.validateConfig({ provider: 'mock' });
      expect(isValid).toBe(true);
    });

    it('should reject non-mock provider config', async () => {
      const isValid = await provider.validateConfig({ provider: 'openai' });
      expect(isValid).toBe(false);
    });
  });

  describe('testConnection()', () => {
    it('should always return true for mock provider', async () => {
      const result = await provider.testConnection();
      expect(result).toBe(true);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle uppercase keywords', async () => {
      const response = await provider.chat('DATA ENGINEERING');
      expect(response.content).toContain('Data Engineering');
    });

    it('should handle mixed case keywords', async () => {
      const response = await provider.chat('FeAtUrE EnGiNeErInG');
      expect(response.content).toContain('Feature Engineering');
    });
  });

  describe('Keyword Variations', () => {
    it('should recognize "exploratory" as feature engineering', async () => {
      const response = await provider.chat('Tell me about exploratory data analysis');
      expect(response.content).toContain('Feature Engineering');
    });

    it('should recognize "prepare" as study tips', async () => {
      const response = await provider.chat('Give me preparation tips');
      expect(response.content).toContain('study strategies');
    });

    it('should recognize "start" as help', async () => {
      const response = await provider.chat('How do I start?');
      expect(response.content).toContain('help you prepare');
    });
  });

  describe('Question generation prompts', () => {
    const generatorSystem: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert certification exam-question author.',
        timestamp: new Date(),
      },
    ];

    it('returns a JSON array of the requested number of questions', async () => {
      const prompt = [
        'TOPIC ID: data-eng',
        'TOPIC: Data Engineering',
        'SUBTOPIC ID: ingestion',
        'REQUESTED DIFFICULTY: medium',
        'NUMBER OF QUESTIONS TO GENERATE: 3',
        'Respond with the required JSON array only.',
      ].join('\n\n');

      const response = await provider.chat(prompt, generatorSystem);
      const parsed = JSON.parse(response.content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
    });

    it('emits questions matching the generator schema with the requested topic/difficulty', async () => {
      const prompt = [
        'TOPIC ID: data-eng',
        'REQUESTED DIFFICULTY: hard',
        'NUMBER OF QUESTIONS TO GENERATE: 1',
      ].join('\n\n');

      const response = await provider.chat(prompt, generatorSystem);
      const [q] = JSON.parse(response.content);

      expect(q.topicId).toBe('data-eng');
      expect(q.difficulty).toBe('hard');
      expect(['multiple-choice', 'multi-select']).toContain(q.type);
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      // correctAnswer must reference an existing option id.
      const ids = q.options.map((o: { id: string }) => o.id);
      expect(ids).toContain(q.correctAnswer);
      expect(q.explanation.correct).toBeTruthy();
      // The application stamps id/metadata, so the mock must omit them.
      expect(q.id).toBeUndefined();
      expect(q.metadata).toBeUndefined();
    });

    it('emits textually distinct question stems for a large count (survives near-dup dedup)', async () => {
      const prompt = [
        'TOPIC ID: data-eng',
        'REQUESTED DIFFICULTY: medium',
        'NUMBER OF QUESTIONS TO GENERATE: 80',
      ].join('\n\n');

      const response = await provider.chat(prompt, generatorSystem);
      const parsed = JSON.parse(response.content) as Array<{ question: string }>;
      expect(parsed).toHaveLength(80);

      // Every stem must be unique so the generator's near-duplicate guard keeps
      // them all (the guard drops pairs with Jaccard similarity >= 0.85).
      const stems = parsed.map((q) => q.question);
      expect(new Set(stems).size).toBe(80);

      const norm = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const jaccard = (a: string, b: string) => {
        const sa = new Set(a.split(' '));
        const sb = new Set(b.split(' '));
        let inter = 0;
        for (const t of sa) if (sb.has(t)) inter += 1;
        const union = sa.size + sb.size - inter;
        return union === 0 ? 0 : inter / union;
      };
      const normed = stems.map(norm);
      let maxSim = 0;
      for (let i = 0; i < normed.length; i += 1) {
        for (let j = i + 1; j < normed.length; j += 1) {
          maxSim = Math.max(maxSim, jaccard(normed[i], normed[j]));
        }
      }
      expect(maxSim).toBeLessThan(0.85);
    });
  });

  describe('Question validation prompts', () => {
    const validatorSystem: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a strict certification exam-question reviewer.',
        timestamp: new Date(),
      },
    ];

    it('returns a JSON object that scores the question as approvable', async () => {
      const prompt = [
        'TOPIC: Data Engineering',
        'QUESTION: What is S3?',
        'CORRECT ANSWER: b',
        'Review the question above and respond with the required JSON object only.',
      ].join('\n\n');

      const response = await provider.chat(prompt, validatorSystem);
      const parsed = JSON.parse(response.content);

      expect(typeof parsed).toBe('object');
      expect(Array.isArray(parsed)).toBe(false);
      // High sub-scores + confidence so the validator approves.
      expect(parsed.overall).toBeGreaterThanOrEqual(8);
      expect(parsed.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});

// Made with Bob

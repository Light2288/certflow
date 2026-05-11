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
});

// Made with Bob

/**
 * OpenAI Provider Tests
 * 
 * Comprehensive test suite for the OpenAI provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../openai-provider';
import type { AIConfig } from '../../types';
import { AIServiceError } from '../../types';

// Mock the OpenAI SDK
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockConfig: AIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      provider: 'openai',
      apiKey: 'sk-test-key-123',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    provider = new OpenAIProvider(mockConfig);
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('openai');
    });

    it('should create provider without API key', () => {
      const configWithoutKey: AIConfig = {
        provider: 'openai',
      };
      const providerWithoutKey = new OpenAIProvider(configWithoutKey);
      expect(providerWithoutKey).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test response',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        model: 'gpt-3.5-turbo',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.chat('Hello, AI!');

      expect(response).toEqual({
        content: 'This is a test response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        model: 'gpt-3.5-turbo',
        finishReason: 'stop',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, AI!' }],
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    it('should include conversation history', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Response with history' },
          finish_reason: 'stop',
        }],
        model: 'gpt-3.5-turbo',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const history = [
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Previous message' },
            { role: 'assistant', content: 'Previous response' },
            { role: 'user', content: 'New message' },
          ],
        })
      );
    });

    it('should use custom options', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Response' },
          finish_reason: 'stop',
        }],
        model: 'gpt-4',
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.chat('Test', undefined, {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.5,
        max_tokens: 1000,
      });
    });

    it('should throw error when API key is missing', async () => {
      const providerWithoutKey = new OpenAIProvider({
        provider: 'openai',
      });

      await expect(providerWithoutKey.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(providerWithoutKey.chat('Test')).rejects.toThrow('OpenAI API key not configured');
    });

    it('should throw error when response is empty', async () => {
      mockCreate.mockResolvedValue({
        choices: [],
        model: 'gpt-3.5-turbo',
      });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('No response from OpenAI');
    });

    it('should handle invalid API key error (401)', async () => {
      const error = {
        status: 401,
        message: 'Invalid API key',
      };
      mockCreate.mockRejectedValue(error);

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('Invalid API key');
    });

    it('should handle rate limit error (429)', async () => {
      const error = {
        status: 429,
        message: 'Rate limit exceeded',
      };
      mockCreate.mockRejectedValue(error);

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle service unavailable error (503)', async () => {
      const error = {
        status: 503,
        message: 'Service unavailable',
      };
      mockCreate.mockRejectedValue(error);

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('temporarily unavailable');
    });

    it('should handle generic errors', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('OpenAI request failed');
    });

    it('should map finish reasons correctly', async () => {
      const testCases = [
        { finish_reason: 'stop', expected: 'stop' },
        { finish_reason: 'length', expected: 'length' },
        { finish_reason: 'content_filter', expected: 'error' },
        { finish_reason: null, expected: 'error' },
      ];

      for (const testCase of testCases) {
        mockCreate.mockResolvedValue({
          choices: [{
            message: { content: 'Test' },
            finish_reason: testCase.finish_reason,
          }],
          model: 'gpt-3.5-turbo',
        });

        const response = await provider.chat('Test');
        expect(response.finishReason).toBe(testCase.expected);
      }
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', async () => {
      const result = await provider.validateConfig(mockConfig);
      expect(result).toBe(true);
    });

    it('should reject wrong provider type', async () => {
      const wrongConfig: AIConfig = {
        ...mockConfig,
        provider: 'anthropic',
      };
      const result = await provider.validateConfig(wrongConfig);
      expect(result).toBe(false);
    });

    it('should reject missing API key', async () => {
      const noKeyConfig: AIConfig = {
        provider: 'openai',
      };
      const result = await provider.validateConfig(noKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject empty API key', async () => {
      const emptyKeyConfig: AIConfig = {
        provider: 'openai',
        apiKey: '   ',
      };
      const result = await provider.validateConfig(emptyKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject invalid API key format', async () => {
      const invalidKeyConfig: AIConfig = {
        provider: 'openai',
        apiKey: 'invalid-key-format',
      };
      const result = await provider.validateConfig(invalidKeyConfig);
      expect(result).toBe(false);
    });

    it('should accept valid API key format', async () => {
      const validKeyConfig: AIConfig = {
        provider: 'openai',
        apiKey: 'sk-proj-1234567890',
      };
      const result = await provider.validateConfig(validKeyConfig);
      expect(result).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: { content: 'test' },
          finish_reason: 'stop',
        }],
        model: 'gpt-3.5-turbo',
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
      
      // Verify minimal API call was made
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        })
      );
    });

    it('should return false for failed connection', async () => {
      mockCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when no API key', async () => {
      const providerWithoutKey = new OpenAIProvider({
        provider: 'openai',
      });

      const result = await providerWithoutKey.testConnection();
      expect(result).toBe(false);
    });
  });
});

// Made with Bob
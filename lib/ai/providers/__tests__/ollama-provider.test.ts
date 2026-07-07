/**
 * Ollama Provider Tests
 * 
 * Comprehensive test suite for the Ollama provider implementation.
 * Tests chat functionality, error handling, configuration validation,
 * and connection testing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../ollama-provider';
import type { AIConfig } from '../../types';
import { AIServiceError } from '../../types';

// Create mock functions that will be shared
const mockChat = vi.fn();
const mockList = vi.fn();

// Mock the Ollama SDK
vi.mock('ollama', () => {
  return {
    Ollama: vi.fn(function(this: { chat: typeof mockChat; list: typeof mockList }) {
      this.chat = mockChat;
      this.list = mockList;
      return this;
    }),
  };
});

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create provider with default config', () => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };

      provider = new OllamaProvider(config);

      expect(provider.name).toBe('ollama');
    });

    it('should create provider with custom base URL', () => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
        baseUrl: 'http://custom-host:8080',
      };

      provider = new OllamaProvider(config);

      expect(provider.name).toBe('ollama');
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };
      provider = new OllamaProvider(config);
    });

    it('should send chat message successfully', async () => {
      const mockResponse = {
        message: {
          content: 'This is a test response',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const response = await provider.chat('Hello, world!');

      expect(response).toEqual({
        content: 'This is a test response',
        model: 'llama2',
        finishReason: 'stop',
      });

      expect(mockChat).toHaveBeenCalledWith({
        model: 'llama2',
        messages: [
          {
            role: 'user',
            content: 'Hello, world!',
          },
        ],
        options: {
          temperature: 0.7,
          num_predict: undefined,
        },
      });
    });

    it('should include conversation history', async () => {
      const mockResponse = {
        message: {
          content: 'Response with history',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const history = [
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      expect(mockChat).toHaveBeenCalledWith({
        model: 'llama2',
        messages: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'New message' },
        ],
        options: {
          temperature: 0.7,
          num_predict: undefined,
        },
      });
    });

    it('should use custom options', async () => {
      const mockResponse = {
        message: {
          content: 'Response with custom options',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      await provider.chat('Test message', [], {
        temperature: 0.5,
        maxTokens: 1000,
        model: 'mistral',
      });

      expect(mockChat).toHaveBeenCalledWith({
        model: 'mistral',
        messages: [
          { role: 'user', content: 'Test message' },
        ],
        options: {
          temperature: 0.5,
          num_predict: 1000,
        },
      });
    });

    it('should handle system messages in history', async () => {
      const mockResponse = {
        message: {
          content: 'Response',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const history = [
        { role: 'system' as const, content: 'You are a helpful assistant', timestamp: new Date() },
        { role: 'user' as const, content: 'Hello', timestamp: new Date() },
      ];

      await provider.chat('Test', history);

      expect(mockChat).toHaveBeenCalledWith({
        model: 'llama2',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
          { role: 'user', content: 'Test' },
        ],
        options: {
          temperature: 0.7,
          num_predict: undefined,
        },
      });
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        message: {
          content: '',
        },
      };

      mockChat.mockResolvedValue(mockResponse);

      const response = await provider.chat('Test');

      expect(response.content).toBe('');
    });

    it('should handle missing message in response', async () => {
      const mockResponse = {};

      mockChat.mockResolvedValue(mockResponse);

      const response = await provider.chat('Test');

      expect(response.content).toBe('');
    });

    it('should throw AIServiceError on connection error', async () => {
      mockChat.mockRejectedValue(
        new Error('fetch failed')
      );

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Cannot connect to Ollama'
      );
    });

    it('should throw AIServiceError on ECONNREFUSED', async () => {
      mockChat.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Cannot connect to Ollama'
      );
    });

    it('should throw AIServiceError on model not found', async () => {
      mockChat.mockRejectedValue(
        new Error('model "nonexistent" not found')
      );

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Model not found'
      );
    });

    it('should throw AIServiceError on generic error', async () => {
      mockChat.mockRejectedValue(
        new Error('Some other error')
      );

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Ollama error: Some other error'
      );
    });

    it('should throw AIServiceError on unknown error', async () => {
      mockChat.mockRejectedValue('Not an Error object');

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Unknown error occurred'
      );
    });
  });

  describe('validateConfig', () => {
    beforeEach(() => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };
      provider = new OllamaProvider(config);
    });

    it('should return true when connection is successful', async () => {
      mockList.mockResolvedValue({ models: [] });

      const isValid = await provider.validateConfig({
        provider: 'ollama',
        model: 'llama2',
      });

      expect(isValid).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockList.mockRejectedValue(new Error('Connection failed'));

      const isValid = await provider.validateConfig({
        provider: 'ollama',
        model: 'llama2',
      });

      expect(isValid).toBe(false);
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };
      provider = new OllamaProvider(config);
    });

    it('should return true when connection is successful', async () => {
      mockList.mockResolvedValue({ models: [] });

      const result = await provider.testConnection();

      expect(result).toBe(true);
      expect(mockList).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockList.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      const config: AIConfig = {
        provider: 'ollama',
        model: 'llama2',
      };
      provider = new OllamaProvider(config);
    });

    it('should return list of available models', async () => {
      const mockModels = {
        models: [
          { name: 'llama2' },
          { name: 'mistral' },
          { name: 'codellama' },
        ],
      };

      mockList.mockResolvedValue(mockModels);

      const models = await provider.listModels();

      expect(models).toEqual(['llama2', 'mistral', 'codellama']);
    });

    it('should return empty array when no models available', async () => {
      mockList.mockResolvedValue({ models: [] });

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should return empty array when models is undefined', async () => {
      mockList.mockResolvedValue({});

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockList.mockRejectedValue(new Error('Failed to list models'));

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });
});

// Made with Bob
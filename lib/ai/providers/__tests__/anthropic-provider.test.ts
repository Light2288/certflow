/**
 * Anthropic Provider Tests
 * 
 * Comprehensive test suite for the Anthropic provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../anthropic-provider';
import type { AIConfig } from '../../types';
import { AIServiceError } from '../../types';

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      };
    },
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockConfig: AIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      provider: 'anthropic',
      apiKey: 'sk-ant-test-key-123',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    provider = new AnthropicProvider(mockConfig);
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('anthropic');
    });

    it('should create provider without API key', () => {
      const configWithoutKey: AIConfig = {
        provider: 'anthropic',
      };
      const providerWithoutKey = new AnthropicProvider(configWithoutKey);
      expect(providerWithoutKey).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: 'This is a test response from Claude',
        }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.chat('Hello, Claude!');

      expect(response).toEqual({
        content: 'This is a test response from Claude',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        model: 'claude-3-sonnet-20240229',
        finishReason: 'stop',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Hello, Claude!' }],
        temperature: 0.7,
        max_tokens: 2000,
        system: undefined,
      });
    });

    it('should handle system message separately', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: 'Response with system context',
        }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const history = [
        { role: 'system' as const, content: 'You are a helpful assistant', timestamp: new Date() },
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant',
          messages: [
            { role: 'user', content: 'Previous message' },
            { role: 'assistant', content: 'Previous response' },
            { role: 'user', content: 'New message' },
          ],
        })
      );
    });

    it('should include conversation history without system message', async () => {
      const mockResponse = {
        content: [{
          type: 'text' as const,
          text: 'Response with history',
        }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const history = [
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: undefined,
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
        content: [{
          type: 'text' as const,
          text: 'Response',
        }],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.chat('Test', undefined, {
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.5,
        max_tokens: 1000,
        system: undefined,
      });
    });

    it('should handle multiple text blocks in response', async () => {
      const mockResponse = {
        content: [
          { type: 'text' as const, text: 'First part' },
          { type: 'text' as const, text: 'Second part' },
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      };

      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.chat('Test');

      expect(response.content).toBe('First part\nSecond part');
    });

    it('should throw error when API key is missing', async () => {
      const providerWithoutKey = new AnthropicProvider({
        provider: 'anthropic',
      });

      await expect(providerWithoutKey.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(providerWithoutKey.chat('Test')).rejects.toThrow('Anthropic API key not configured');
    });

    it('should throw error when response is empty', async () => {
      mockCreate.mockResolvedValue({
        content: [],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
      });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('No response from Anthropic');
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
      await expect(provider.chat('Test')).rejects.toThrow('Anthropic request failed');
    });

    it('should map stop reasons correctly', async () => {
      const testCases = [
        { stop_reason: 'end_turn', expected: 'stop' },
        { stop_reason: 'max_tokens', expected: 'length' },
        { stop_reason: 'stop_sequence', expected: 'stop' },
        { stop_reason: null, expected: 'error' },
      ];

      for (const testCase of testCases) {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text' as const, text: 'Test' }],
          model: 'claude-3-sonnet-20240229',
          stop_reason: testCase.stop_reason,
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
        provider: 'openai',
      };
      const result = await provider.validateConfig(wrongConfig);
      expect(result).toBe(false);
    });

    it('should reject missing API key', async () => {
      const noKeyConfig: AIConfig = {
        provider: 'anthropic',
      };
      const result = await provider.validateConfig(noKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject empty API key', async () => {
      const emptyKeyConfig: AIConfig = {
        provider: 'anthropic',
        apiKey: '   ',
      };
      const result = await provider.validateConfig(emptyKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject invalid API key format', async () => {
      const invalidKeyConfig: AIConfig = {
        provider: 'anthropic',
        apiKey: 'invalid-key-format',
      };
      const result = await provider.validateConfig(invalidKeyConfig);
      expect(result).toBe(false);
    });

    it('should accept valid API key format', async () => {
      const validKeyConfig: AIConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-api03-1234567890',
      };
      const result = await provider.validateConfig(validKeyConfig);
      expect(result).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text' as const, text: 'test' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
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
      const providerWithoutKey = new AnthropicProvider({
        provider: 'anthropic',
      });

      const result = await providerWithoutKey.testConnection();
      expect(result).toBe(false);
    });
  });
});

// Made with Bob
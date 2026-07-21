/**
 * Custom Provider Tests
 *
 * Test suite for the OpenAI-compatible Custom API provider. The provider
 * reuses the OpenAI SDK with a `baseURL` override, so the SDK is mocked the
 * same way as in the OpenAI provider tests (no real network).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomProvider } from '../custom-provider';
import type { AIConfig } from '../../types';
import { AIServiceError } from '../../types';

// Mock the OpenAI SDK. Capture the constructor options so we can assert the
// baseURL/apiKey override behaviour.
const mockCreate = vi.fn();
const constructorSpy = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      constructor(opts: unknown) {
        constructorSpy(opts);
      }
    },
  };
});

describe('CustomProvider', () => {
  let provider: CustomProvider;
  let mockConfig: AIConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      provider: 'custom',
      apiKey: 'ibm-key-123',
      baseUrl: 'https://api.nextgen-beta.ica.ibm.com/ica/v1/chat-models',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000,
    };

    provider = new CustomProvider(mockConfig);
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('custom');
    });

    it('should pass baseURL and apiKey to the OpenAI SDK', () => {
      expect(constructorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'ibm-key-123',
          baseURL: 'https://api.nextgen-beta.ica.ibm.com/ica/v1/chat-models',
          dangerouslyAllowBrowser: true,
        })
      );
    });

    it('should strip trailing slashes from the base URL', () => {
      vi.clearAllMocks();
      new CustomProvider({
        provider: 'custom',
        apiKey: 'k',
        baseUrl: 'https://example.com/v1/chat-models///',
        model: 'm',
      });
      expect(constructorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.com/v1/chat-models',
        })
      );
    });

    it('should not construct a client when base URL is missing', () => {
      vi.clearAllMocks();
      new CustomProvider({ provider: 'custom', apiKey: 'k', model: 'm' });
      expect(constructorSpy).not.toHaveBeenCalled();
    });

    it('should not construct a client when API key is missing', () => {
      vi.clearAllMocks();
      new CustomProvider({
        provider: 'custom',
        baseUrl: 'https://example.com',
        model: 'm',
      });
      expect(constructorSpy).not.toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'A custom response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20,
        },
        model: 'gpt-4o-mini',
      };
      mockCreate.mockResolvedValue(mockResponse);

      const response = await provider.chat('Hello, custom!');

      expect(response).toEqual({
        content: 'A custom response',
        usage: {
          promptTokens: 12,
          completionTokens: 8,
          totalTokens: 20,
        },
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello, custom!' }],
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    it('should forward system messages in history to the endpoint', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        model: 'gpt-4o-mini',
      });

      const history = [
        {
          role: 'system' as const,
          content: 'You are grounded in the AWS ML exam.',
          timestamp: new Date(),
        },
        {
          role: 'user' as const,
          content: 'Previous question',
          timestamp: new Date(),
        },
        {
          role: 'assistant' as const,
          content: 'Previous answer',
          timestamp: new Date(),
        },
      ];

      await provider.chat('New question', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are grounded in the AWS ML exam.' },
            { role: 'user', content: 'Previous question' },
            { role: 'assistant', content: 'Previous answer' },
            { role: 'user', content: 'New question' },
          ],
        })
      );
    });

    it('should use custom options over config defaults', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'r' }, finish_reason: 'stop' }],
        model: 'other-model',
      });

      await provider.chat('Test', undefined, {
        model: 'other-model',
        temperature: 0.3,
        maxTokens: 500,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'other-model',
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.3,
        max_tokens: 500,
      });
    });

    it('should return response without usage when the endpoint omits it', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'no usage' }, finish_reason: 'stop' }],
        model: 'gpt-4o-mini',
      });

      const response = await provider.chat('Test');
      expect(response.content).toBe('no usage');
      expect(response.usage).toBeUndefined();
    });

    it('should throw when base URL is missing (before any network call)', async () => {
      const noBaseUrl = new CustomProvider({
        provider: 'custom',
        apiKey: 'k',
        model: 'm',
      });

      await expect(noBaseUrl.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(noBaseUrl.chat('Test')).rejects.toThrow(
        'Custom API base URL not configured'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw when API key is missing (before any network call)', async () => {
      const noKey = new CustomProvider({
        provider: 'custom',
        baseUrl: 'https://example.com',
        model: 'm',
      });

      await expect(noKey.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(noKey.chat('Test')).rejects.toThrow(
        'Custom API key not configured'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw when model is missing (no silent default)', async () => {
      const noModel = new CustomProvider({
        provider: 'custom',
        baseUrl: 'https://example.com',
        apiKey: 'k',
      });

      await expect(noModel.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(noModel.chat('Test')).rejects.toThrow(
        'Custom API model not configured'
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw a specific error code when model is missing', async () => {
      const noModel = new CustomProvider({
        provider: 'custom',
        baseUrl: 'https://example.com',
        apiKey: 'k',
      });

      await expect(noModel.chat('Test')).rejects.toMatchObject({
        code: 'MISSING_MODEL',
      });
    });

    it('should throw when the response is empty', async () => {
      mockCreate.mockResolvedValue({ choices: [], model: 'gpt-4o-mini' });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'No response from custom API'
      );
    });

    it('should handle invalid API key error (401)', async () => {
      mockCreate.mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toMatchObject({
        code: 'INVALID_API_KEY',
      });
    });

    it('should handle forbidden error (403)', async () => {
      mockCreate.mockRejectedValue({ status: 403, message: 'Forbidden' });

      await expect(provider.chat('Test')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('should handle not found error (404) for a wrong path', async () => {
      mockCreate.mockRejectedValue({ status: 404, message: 'Not Found' });

      await expect(provider.chat('Test')).rejects.toMatchObject({
        code: 'ENDPOINT_NOT_FOUND',
      });
    });

    it('should handle rate limit error (429)', async () => {
      mockCreate.mockRejectedValue({ status: 429, message: 'Too Many' });

      await expect(provider.chat('Test')).rejects.toMatchObject({
        code: 'RATE_LIMIT',
      });
    });

    it('should handle service unavailable error (503)', async () => {
      mockCreate.mockRejectedValue({ status: 503, message: 'Unavailable' });

      await expect(provider.chat('Test')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
      });
      await expect(provider.chat('Test')).rejects.toThrow(
        'temporarily unavailable'
      );
    });

    it('should handle generic errors', async () => {
      mockCreate.mockRejectedValue(new Error('Network boom'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow(
        'Custom API request failed'
      );
    });

    it('should map finish reasons correctly', async () => {
      const cases = [
        { finish_reason: 'stop', expected: 'stop' },
        { finish_reason: 'length', expected: 'length' },
        { finish_reason: 'content_filter', expected: 'error' },
        { finish_reason: null, expected: 'error' },
      ];

      for (const c of cases) {
        mockCreate.mockResolvedValue({
          choices: [{ message: { content: 'x' }, finish_reason: c.finish_reason }],
          model: 'gpt-4o-mini',
        });
        const response = await provider.chat('Test');
        expect(response.finishReason).toBe(c.expected);
      }
    });

    it('retries without sampling params when the endpoint rejects temperature (400)', async () => {
      // First call: endpoint rejects temperature (LiteLLM-style message).
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message:
          "litellm.UnsupportedParamsError: gpt-5 models don't support temperature=0.7. Only temperature=1 is supported.",
      });
      // Retry: succeeds.
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'ok after retry' }, finish_reason: 'stop' }],
        model: 'gpt-4o',
      });

      const response = await provider.chat('Test');
      expect(response.content).toBe('ok after retry');

      // Two calls total.
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // First call included temperature + max_tokens.
      const firstArgs = mockCreate.mock.calls[0][0];
      expect(firstArgs).toHaveProperty('temperature');
      expect(firstArgs).toHaveProperty('max_tokens');

      // Retry dropped the unsupported sampling params.
      const retryArgs = mockCreate.mock.calls[1][0];
      expect(retryArgs).not.toHaveProperty('temperature');
      expect(retryArgs).not.toHaveProperty('max_tokens');
      expect(retryArgs).toMatchObject({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
      });
    });

    it('retries on an opaque 400 with no readable body (SDK "no body" case)', async () => {
      // The OpenAI SDK reports param rejections it cannot parse as
      // "400 status code (no body)" with no useful message. We must still
      // retry without sampling params rather than giving up.
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message: '400 status code (no body)',
      });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'recovered' }, finish_reason: 'stop' }],
        model: 'claude-opus-4-8',
      });

      const response = await provider.chat('Test');
      expect(response.content).toBe('recovered');
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate.mock.calls[1][0]).not.toHaveProperty('temperature');
      expect(mockCreate.mock.calls[1][0]).not.toHaveProperty('max_tokens');
    });

    it('detects an unsupported-param rejection carried in the SDK error body', async () => {
      // The SDK exposes the parsed JSON body on `error`.
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message: '400 status code (no body)',
        error: { detail: 'Only temperature=1 is supported.' },
      });
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'recovered' }, finish_reason: 'stop' }],
        model: 'claude-opus-4-8',
      });

      const response = await provider.chat('Test');
      expect(response.content).toBe('recovered');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('retries once and surfaces the error if the retry also fails', async () => {
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message: "Only temperature=1 is supported.",
      });
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message: 'Model not found',
      });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('does not retry on a 400 that clearly indicates the model is not found', async () => {
      mockCreate.mockRejectedValueOnce({
        status: 400,
        message: 'Model not found',
      });

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      // A bad model id will never succeed on retry, so don't waste a call.
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct custom config', async () => {
      expect(await provider.validateConfig(mockConfig)).toBe(true);
    });

    it('should reject a wrong provider type', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, provider: 'openai' })
      ).toBe(false);
    });

    it('should reject a missing base URL', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, baseUrl: undefined })
      ).toBe(false);
    });

    it('should reject an empty base URL', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, baseUrl: '   ' })
      ).toBe(false);
    });

    it('should reject a missing API key', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, apiKey: undefined })
      ).toBe(false);
    });

    it('should reject an empty API key', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, apiKey: '  ' })
      ).toBe(false);
    });

    it('should reject a missing model', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, model: undefined })
      ).toBe(false);
    });

    it('should reject an empty model', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, model: '' })
      ).toBe(false);
    });

    it('should accept an arbitrary (non sk-) API key', async () => {
      expect(
        await provider.validateConfig({ ...mockConfig, apiKey: 'ibm-anything' })
      ).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true for a successful connection', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        model: 'gpt-4o-mini',
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        })
      );
    });

    it('should return false for a failed connection', async () => {
      mockCreate.mockRejectedValue(new Error('down'));
      expect(await provider.testConnection()).toBe(false);
    });

    it('should return false when no client is configured', async () => {
      const noClient = new CustomProvider({
        provider: 'custom',
        model: 'm',
      });
      expect(await noClient.testConnection()).toBe(false);
    });
  });
});

// Made with Bob

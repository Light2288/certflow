/**
 * Google AI Provider Tests
 * 
 * Comprehensive test suite for the Google AI (Gemini) provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleAIProvider } from '../google-provider';
import type { AIConfig } from '../../types';
import { AIServiceError } from '../../types';

// Mock the Google Generative AI SDK
const mockGenerateContent = vi.fn();
const mockSendMessage = vi.fn();
const mockStartChat = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel = mockGetGenerativeModel;
    },
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  };
});

describe('GoogleAIProvider', () => {
  let provider: GoogleAIProvider;
  let mockConfig: AIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      provider: 'google',
      apiKey: 'AIzaTest-Key-123',
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    // Setup default mock behavior
    mockGetGenerativeModel.mockReturnValue({
      startChat: mockStartChat,
      generateContent: mockGenerateContent,
    });
    
    mockStartChat.mockReturnValue({
      sendMessage: mockSendMessage,
    });
    
    provider = new GoogleAIProvider(mockConfig);
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe('google');
    });

    it('should create provider without API key', () => {
      const configWithoutKey: AIConfig = {
        provider: 'google',
      };
      const providerWithoutKey = new GoogleAIProvider(configWithoutKey);
      expect(providerWithoutKey).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        response: {
          text: () => 'This is a test response from Gemini',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
          candidates: [{
            finishReason: 'STOP',
          }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const response = await provider.chat('Hello, Gemini!');

      expect(response).toEqual({
        content: 'This is a test response from Gemini',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        model: 'gemini-pro',
        finishReason: 'stop',
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-pro',
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        })
      );

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [],
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Hello, Gemini!');
    });

    it('should convert conversation history to Google format', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response with history',
          candidates: [{ finishReason: 'STOP' }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const history = [
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'Previous message' }] },
          { role: 'model', parts: [{ text: 'Previous response' }] },
        ],
      });
    });

    it('passes system messages as systemInstruction, not as chat history', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const history = [
        { role: 'system' as const, content: 'You are grounded in the AWS ML exam.', timestamp: new Date() },
        { role: 'user' as const, content: 'User message', timestamp: new Date() },
      ];

      await provider.chat('New message', history);

      // The system message is provided to the model as systemInstruction.
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'You are grounded in the AWS ML exam.',
        })
      );

      // And it is NOT included as a chat turn.
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'User message' }] },
        ],
      });
    });

    it('combines multiple system messages into one systemInstruction', async () => {
      mockSendMessage.mockResolvedValue({
        response: { text: () => 'ok', candidates: [{ finishReason: 'STOP' }] },
      });

      const history = [
        { role: 'system' as const, content: 'Rule one.', timestamp: new Date() },
        { role: 'system' as const, content: 'Rule two.', timestamp: new Date() },
        { role: 'user' as const, content: 'hi', timestamp: new Date() },
      ];

      await provider.chat('go', history);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'Rule one.\n\nRule two.',
        })
      );
    });

    it('should use custom options', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response',
          candidates: [{ finishReason: 'STOP' }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      await provider.chat('Test', undefined, {
        model: 'gemini-1.5-pro',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-pro',
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1000,
          },
        })
      );
    });

    it('should handle response without usage metadata', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response without metadata',
          candidates: [{ finishReason: 'STOP' }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      const response = await provider.chat('Test');

      expect(response.usage).toBeUndefined();
    });

    it('should throw error when API key is missing', async () => {
      const providerWithoutKey = new GoogleAIProvider({
        provider: 'google',
      });

      await expect(providerWithoutKey.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(providerWithoutKey.chat('Test')).rejects.toThrow('Google AI API key not configured');
    });

    it('should throw error when response is empty', async () => {
      const mockResponse = {
        response: {
          text: () => '',
          candidates: [{ finishReason: 'STOP' }],
        },
      };

      mockSendMessage.mockResolvedValue(mockResponse);

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('No response from Google AI');
    });

    it('should handle API key error', async () => {
      mockSendMessage.mockRejectedValue(new Error('API key not valid'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('Invalid API key');
    });

    it('should handle rate limit error', async () => {
      mockSendMessage.mockRejectedValue(new Error('quota exceeded'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle safety filter error', async () => {
      mockSendMessage.mockRejectedValue(new Error('safety filters blocked'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('blocked by safety filters');
    });

    it('should handle generic errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      await expect(provider.chat('Test')).rejects.toThrow(AIServiceError);
      await expect(provider.chat('Test')).rejects.toThrow('Network error');
    });

    it('should map finish reasons correctly', async () => {
      const testCases = [
        { finishReason: 'STOP', expected: 'stop' },
        { finishReason: 'MAX_TOKENS', expected: 'length' },
        { finishReason: 'SAFETY', expected: 'error' },
        { finishReason: 'RECITATION', expected: 'error' },
        { finishReason: 'OTHER', expected: 'error' },
        { finishReason: undefined, expected: 'stop' },
      ];

      for (const testCase of testCases) {
        mockSendMessage.mockResolvedValue({
          response: {
            text: () => 'Test',
            candidates: [{ finishReason: testCase.finishReason }],
          },
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
        provider: 'google',
      };
      const result = await provider.validateConfig(noKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject empty API key', async () => {
      const emptyKeyConfig: AIConfig = {
        provider: 'google',
        apiKey: '   ',
      };
      const result = await provider.validateConfig(emptyKeyConfig);
      expect(result).toBe(false);
    });

    it('should reject invalid API key format', async () => {
      const invalidKeyConfig: AIConfig = {
        provider: 'google',
        apiKey: 'invalid-key-format',
      };
      const result = await provider.validateConfig(invalidKeyConfig);
      expect(result).toBe(false);
    });

    it('should accept valid API key format', async () => {
      const validKeyConfig: AIConfig = {
        provider: 'google',
        apiKey: 'AIzaSyDTest1234567890',
      };
      const result = await provider.validateConfig(validKeyConfig);
      expect(result).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'test response',
        },
      });

      const result = await provider.testConnection();
      expect(result).toBe(true);
      
      // Verify minimal API call was made
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-pro',
      });
      
      expect(mockGenerateContent).toHaveBeenCalledWith('test');
    });

    it('should return false for failed connection', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when no API key', async () => {
      const providerWithoutKey = new GoogleAIProvider({
        provider: 'google',
      });

      const result = await providerWithoutKey.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when response is empty', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });
});

// Made with Bob
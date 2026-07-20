/**
 * Google AI Provider
 * 
 * Implementation of the AIProvider interface for Google's Gemini models.
 * Supports Gemini Pro, Gemini Pro Vision, and Gemini 1.5 models.
 * Requires a Google AI API key.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';

/**
 * Google AI Provider for Gemini models
 * 
 * This provider uses the official Google Generative AI SDK to interact with Gemini models.
 * It handles API authentication, message formatting (roles: 'user' and 'model'), and error handling.
 */
export class GoogleAIProvider implements AIProvider {
  readonly name = 'google';
  private client: GoogleGenerativeAI | null = null;
  private config: AIConfig;

  /**
   * Create a new Google AI provider instance
   * 
   * @param config - AI configuration with API key
   */
  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.apiKey) {
      this.client = new GoogleGenerativeAI(config.apiKey);
    }
  }

  /**
   * Send a chat message and get a response from Gemini
   * 
   * @param message - The user's message
   * @param history - Optional conversation history for context
   * @param options - Optional chat configuration
   * @returns Promise resolving to the AI's response
   * @throws AIServiceError if the request fails
   */
  async chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new AIServiceError(
        'Google AI API key not configured',
        'MISSING_API_KEY',
        this.name
      );
    }

    try {
      const modelName = options?.model || this.config.model || 'gemini-pro';

      // Gemini has no 'system' role in chat history; system messages must be
      // passed as a dedicated systemInstruction. Collect all system messages
      // from the history (e.g. the certification-grounded exam context and the
      // generator/validator instructions) and combine them.
      const systemInstruction = history
        ? history
            .filter((msg) => msg.role === 'system')
            .map((msg) => msg.content)
            .join('\n\n')
        : '';

      const model = this.client.getGenerativeModel({
        model: modelName,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: {
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? this.config.maxTokens ?? 2000,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      // Convert chat history to Google format
      // Google uses 'user' and 'model' roles (not 'assistant')
      const chatHistory = history
        ? history
            .filter(msg => msg.role !== 'system') // Google doesn't support system messages in history
            .map(msg => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            }))
        : [];

      // Start chat with history
      const chat = model.startChat({
        history: chatHistory,
      });

      // Send message
      const result = await chat.sendMessage(message);
      const response = result.response;
      
      // Extract text from response
      const text = response.text();
      
      if (!text) {
        throw new AIServiceError(
          'No response from Google AI',
          'EMPTY_RESPONSE',
          this.name
        );
      }

      // Get usage metadata if available
      const usageMetadata = response.usageMetadata;

      return {
        content: text,
        usage: usageMetadata ? {
          promptTokens: usageMetadata.promptTokenCount || 0,
          completionTokens: usageMetadata.candidatesTokenCount || 0,
          totalTokens: usageMetadata.totalTokenCount || 0,
        } : undefined,
        model: modelName,
        finishReason: this.mapFinishReason(response.candidates?.[0]?.finishReason),
      };
    } catch (error) {
      // Handle Google AI-specific errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        
        // Check for specific error patterns
        if (errorMessage.includes('API key')) {
          throw new AIServiceError(
            'Invalid API key. Please check your Google AI API key in settings.',
            'INVALID_API_KEY',
            this.name
          );
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          throw new AIServiceError(
            'Rate limit exceeded. Please try again in a moment.',
            'RATE_LIMIT',
            this.name
          );
        }
        
        if (errorMessage.includes('safety')) {
          throw new AIServiceError(
            'Content was blocked by safety filters. Please rephrase your message.',
            'SAFETY_FILTER',
            this.name
          );
        }
        
        throw new AIServiceError(
          errorMessage || 'An error occurred while communicating with Google AI.',
          'API_ERROR',
          this.name
        );
      }
      
      // Handle other errors
      throw new AIServiceError(
        `Google AI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED',
        this.name
      );
    }
  }

  /**
   * Validate the Google AI configuration
   * 
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    // Check provider type
    if (config.provider !== 'google') {
      return false;
    }

    // Check API key
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false;
    }

    // Google AI API keys typically start with 'AIza'
    if (!config.apiKey.startsWith('AIza')) {
      return false;
    }

    return true;
  }

  /**
   * Test connection to Google AI API
   * 
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model || 'gemini-pro',
      });
      
      // Make a minimal API call to test connection
      const result = await model.generateContent('test');
      const response = result.response;
      
      // If we get a response, connection is successful
      return !!response.text();
    } catch (error) {
      console.error('Google AI connection test failed:', error);
      return false;
    }
  }

  /**
   * Map Google AI finish reason to our standard format
   * 
   * @param reason - Google AI finish reason
   * @returns Standard finish reason
   */
  private mapFinishReason(reason: string | undefined): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        return 'error';
      default:
        return 'stop';
    }
  }
}

// Made with Bob
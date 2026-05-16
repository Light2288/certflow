/**
 * OpenAI Provider
 * 
 * Implementation of the AIProvider interface for OpenAI's GPT models.
 * Supports GPT-4, GPT-4 Turbo, and GPT-3.5 Turbo models.
 * Requires an OpenAI API key.
 */

import OpenAI from 'openai';
import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';

/**
 * OpenAI Provider for GPT models
 * 
 * This provider uses the official OpenAI SDK to interact with GPT models.
 * It handles API authentication, message formatting, and error handling.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private config: AIConfig;

  /**
   * Create a new OpenAI provider instance
   * 
   * @param config - AI configuration with API key
   */
  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true, // Allow client-side usage
      });
    }
  }

  /**
   * Send a chat message and get a response from OpenAI
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
        'OpenAI API key not configured',
        'MISSING_API_KEY',
        this.name
      );
    }

    try {
      // Convert chat history to OpenAI format
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      // Add history if provided
      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: message,
      });

      // Make API call
      const completion = await this.client.chat.completions.create({
        model: options?.model || this.config.model || 'gpt-3.5-turbo',
        messages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2000,
      });

      // Extract response
      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new AIServiceError(
          'No response from OpenAI',
          'EMPTY_RESPONSE',
          this.name
        );
      }

      return {
        content: choice.message.content || '',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
        model: completion.model,
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error) {
      // Handle OpenAI-specific errors
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status?: number; message?: string };
        throw new AIServiceError(
          this.getErrorMessage(apiError),
          this.getErrorCode(apiError),
          this.name
        );
      }
      
      // Handle other errors
      throw new AIServiceError(
        `OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED',
        this.name
      );
    }
  }

  /**
   * Validate the OpenAI configuration
   * 
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    // Check provider type
    if (config.provider !== 'openai') {
      return false;
    }

    // Check API key
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false;
    }

    // API key should start with 'sk-'
    if (!config.apiKey.startsWith('sk-')) {
      return false;
    }

    return true;
  }

  /**
   * Test connection to OpenAI API
   * 
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Make a minimal API call to test connection
      await this.client.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Map OpenAI finish reason to our standard format
   * 
   * @param reason - OpenAI finish reason
   * @returns Standard finish reason
   */
  private mapFinishReason(reason: string | null | undefined): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'error';
    }
  }

  /**
   * Get user-friendly error message from OpenAI error
   *
   * @param error - OpenAI API error
   * @returns User-friendly error message
   */
  private getErrorMessage(error: { status?: number; message?: string }): string {
    switch (error.status) {
      case 401:
        return 'Invalid API key. Please check your OpenAI API key in settings.';
      case 429:
        return 'Rate limit exceeded. Please try again in a moment.';
      case 500:
      case 502:
      case 503:
        return 'OpenAI service is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An error occurred while communicating with OpenAI.';
    }
  }

  /**
   * Get error code from OpenAI error
   *
   * @param error - OpenAI API error
   * @returns Error code
   */
  private getErrorCode(error: { status?: number }): string {
    switch (error.status) {
      case 401:
        return 'INVALID_API_KEY';
      case 429:
        return 'RATE_LIMIT';
      case 500:
      case 502:
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'API_ERROR';
    }
  }
}

// Made with Bob
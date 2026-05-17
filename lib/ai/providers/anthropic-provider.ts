/**
 * Anthropic Provider
 * 
 * Implementation of the AIProvider interface for Anthropic's Claude models.
 * Supports Claude 3 Opus, Sonnet, and Haiku models.
 * Requires an Anthropic API key.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';

/**
 * Anthropic Provider for Claude models
 * 
 * This provider uses the official Anthropic SDK to interact with Claude models.
 * It handles API authentication, message formatting (system message separate), and error handling.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private config: AIConfig;

  /**
   * Create a new Anthropic provider instance
   * 
   * @param config - AI configuration with API key
   */
  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.apiKey) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true, // Allow client-side usage
      });
    }
  }

  /**
   * Send a chat message and get a response from Claude
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
        'Anthropic API key not configured',
        'MISSING_API_KEY',
        this.name
      );
    }

    try {
      // Anthropic uses a different format: system message is separate
      let systemMessage: string | undefined;
      const messages: Anthropic.MessageParam[] = [];
      
      // Extract system message and convert history
      if (history && history.length > 0) {
        for (const msg of history) {
          if (msg.role === 'system') {
            // Anthropic expects system message as a separate parameter
            systemMessage = msg.content;
          } else {
            messages.push({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content,
            });
          }
        }
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: message,
      });

      // Make API call
      const response = await this.client.messages.create({
        model: options?.model || this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2000,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        system: systemMessage,
        messages,
      });

      // Extract response content
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      if (!content) {
        throw new AIServiceError(
          'No response from Anthropic',
          'EMPTY_RESPONSE',
          this.name
        );
      }

      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
        model: response.model,
        finishReason: this.mapStopReason(response.stop_reason),
      };
    } catch (error) {
      // Handle Anthropic-specific errors
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
        `Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED',
        this.name
      );
    }
  }

  /**
   * Validate the Anthropic configuration
   * 
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    // Check provider type
    if (config.provider !== 'anthropic') {
      return false;
    }

    // Check API key
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false;
    }

    // Anthropic API keys should start with 'sk-ant-'
    if (!config.apiKey.startsWith('sk-ant-')) {
      return false;
    }

    return true;
  }

  /**
   * Test connection to Anthropic API
   * 
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Make a minimal API call to test connection
      await this.client.messages.create({
        model: this.config.model || 'claude-3-haiku-20240307', // Use cheapest model for testing
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      });
      
      return true;
    } catch (error) {
      console.error('Anthropic connection test failed:', error);
      return false;
    }
  }

  /**
   * Map Anthropic stop reason to our standard format
   * 
   * @param reason - Anthropic stop reason
   * @returns Standard finish reason
   */
  private mapStopReason(reason: string | null): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'error';
    }
  }

  /**
   * Get user-friendly error message from Anthropic error
   *
   * @param error - Anthropic API error
   * @returns User-friendly error message
   */
  private getErrorMessage(error: { status?: number; message?: string }): string {
    switch (error.status) {
      case 401:
        return 'Invalid API key. Please check your Anthropic API key in settings.';
      case 429:
        return 'Rate limit exceeded. Please try again in a moment.';
      case 500:
      case 502:
      case 503:
        return 'Anthropic service is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An error occurred while communicating with Anthropic.';
    }
  }

  /**
   * Get error code from Anthropic error
   *
   * @param error - Anthropic API error
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
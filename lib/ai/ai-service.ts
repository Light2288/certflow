/**
 * AI Service
 *
 * Main service layer for AI interactions.
 * Provides a unified interface for different AI providers.
 * Handles provider selection, error handling, and fallbacks.
 */

import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from './types';
import { AIServiceError } from './types';
import { MockAIProvider } from './providers/mock-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { GoogleAIProvider } from './providers/google-provider';
import { OllamaProvider } from './providers/ollama-provider';

/**
 * AI Service class
 * 
 * Manages AI provider instances and routes requests to the appropriate provider.
 * Provides error handling and graceful degradation.
 */
export class AIService {
  private provider: AIProvider;
  private config: AIConfig;

  /**
   * Create a new AI service instance
   * 
   * @param config - AI configuration (defaults to mock provider)
   */
  constructor(config?: AIConfig) {
    this.config = config || this.getDefaultConfig();
    this.provider = this.createProvider(this.config);
  }

  /**
   * Send a chat message and get a response
   * 
   * @param message - The user's message
   * @param history - Optional conversation history
   * @param options - Optional chat configuration
   * @returns Promise resolving to the AI's response
   * @throws AIServiceError if the request fails
   */
  async chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      // Validate message
      if (!message || message.trim().length === 0) {
        throw new AIServiceError(
          'Message cannot be empty',
          'INVALID_MESSAGE',
          this.provider.name
        );
      }

      // Merge options with config defaults
      const mergedOptions: ChatOptions = {
        temperature: options?.temperature ?? this.config.temperature,
        maxTokens: options?.maxTokens ?? this.config.maxTokens,
        model: options?.model ?? this.config.model,
      };

      // Call provider
      const response = await this.provider.chat(message, history, mergedOptions);
      
      return response;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      throw new AIServiceError(
        `AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SERVICE_ERROR',
        this.provider.name
      );
    }
  }

  /**
   * Validate the current configuration
   * 
   * @returns Promise resolving to true if valid
   */
  async validateConfig(): Promise<boolean> {
    try {
      return await this.provider.validateConfig(this.config);
    } catch {
      return false;
    }
  }

  /**
   * Test connection to the AI provider
   * 
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.provider.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Update the AI configuration and switch providers if needed
   * 
   * @param config - New configuration
   */
  updateConfig(config: AIConfig): void {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  /**
   * Get the current configuration
   * 
   * @returns Current AI configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Get the current provider name
   * 
   * @returns Provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Create a provider instance based on configuration
   *
   * @param config - AI configuration
   * @returns Provider instance
   */
  private createProvider(config: AIConfig): AIProvider {
    switch (config.provider) {
      case 'mock':
        return new MockAIProvider();
      
      case 'openai':
        return new OpenAIProvider(config);
      
      case 'anthropic':
        return new AnthropicProvider(config);
      
      case 'google':
        return new GoogleAIProvider(config);
      
      case 'ollama':
        return new OllamaProvider(config);
      
      default:
        // Fallback to mock provider
        console.warn(`Unknown provider: ${config.provider}, falling back to mock`);
        return new MockAIProvider();
    }
  }

  /**
   * Get default configuration
   * 
   * @returns Default AI configuration
   */
  private getDefaultConfig(): AIConfig {
    return {
      provider: 'mock',
      model: 'mock-model',
      temperature: 0.7,
      maxTokens: 2000,
    };
  }
}

/**
 * Create a singleton instance of the AI service
 * This can be used throughout the application
 */
let aiServiceInstance: AIService | null = null;

/**
 * Get the global AI service instance
 * Creates one if it doesn't exist
 * 
 * @param config - Optional configuration for new instance
 * @returns AI service instance
 */
export function getAIService(config?: AIConfig): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService(config);
  } else if (config) {
    aiServiceInstance.updateConfig(config);
  }
  
  return aiServiceInstance;
}

/**
 * Reset the global AI service instance
 * Useful for testing
 */
export function resetAIService(): void {
  aiServiceInstance = null;
}

// Made with Bob

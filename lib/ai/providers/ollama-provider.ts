/**
 * Ollama Provider
 *
 * Implementation of the AIProvider interface for Ollama local models.
 * Supports running AI models locally without requiring an API key.
 * Ollama must be installed and running on the local machine.
 */

import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';
import type { Ollama as OllamaClass } from 'ollama';

type OllamaConstructor = typeof OllamaClass;
type OllamaClient = InstanceType<OllamaConstructor>;

// Dynamically import Ollama only when needed (server-side)
let Ollama: OllamaConstructor | undefined;
if (typeof window === 'undefined') {
  // Only import on server-side
  import('ollama').then(module => {
    Ollama = module.Ollama;
  }).catch(() => {
    // Ollama not available
  });
}

/**
 * Ollama Provider for local AI models
 * 
 * This provider uses the Ollama SDK to interact with locally-running models.
 * It requires Ollama to be installed and running on the local machine.
 * No API key is required.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private client: OllamaClient | null;
  private config: AIConfig;

  /**
   * Create a new Ollama provider instance
   *
   * @param config - AI configuration with optional baseUrl
   */
  constructor(config: AIConfig) {
    this.config = config;
    
    // Initialize Ollama client with custom base URL if provided
    // Default is http://localhost:11434
    if (typeof window === 'undefined' && Ollama) {
      this.client = new Ollama({
        host: config.baseUrl || 'http://localhost:11434',
      });
    } else {
      // Client-side or Ollama not loaded - will throw error on use
      this.client = null;
    }
  }

  /**
   * Send a chat message and get a response from Ollama
   * 
   * @param message - The user's message
   * @param history - Optional conversation history for context
   * @param options - Optional chat configuration
   * @returns Promise resolving to the AI's response
   * @throws AIServiceError if the request fails
   */
  async chat(
    message: string,
    history: ChatMessage[] = [],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    // Check if client is available
    if (!this.client) {
      throw new AIServiceError(
        'Ollama provider is not available in browser environment. It can only be used server-side.',
        'PROVIDER_NOT_AVAILABLE',
        this.name
      );
    }

    try {
      // Validate that we have a model
      const model = options.model || this.config.model || 'llama2';

      // Convert chat history to Ollama format
      const messages = this.convertMessages(message, history);

      // Make the chat request
      const response = await this.client.chat({
        model,
        messages,
        options: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options.maxTokens ?? this.config.maxTokens,
        },
      });

      // Extract response content
      const content = response.message?.content || '';

      return {
        content,
        model,
        finishReason: 'stop',
      };
    } catch (error) {
      // Handle Ollama-specific errors
      if (error instanceof Error) {
        // Connection errors
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new AIServiceError(
            'Cannot connect to Ollama. Make sure Ollama is installed and running on your machine.',
            'CONNECTION_ERROR',
            this.name
          );
        }

        // Model not found
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new AIServiceError(
            `Model not found. Please pull the model first using: ollama pull ${this.config.model || 'llama2'}`,
            'MODEL_NOT_FOUND',
            this.name
          );
        }

        // Generic error
        throw new AIServiceError(
          `Ollama error: ${error.message}`,
          'PROVIDER_ERROR',
          this.name
        );
      }

      throw new AIServiceError(
        'Unknown error occurred while communicating with Ollama',
        'UNKNOWN_ERROR',
        this.name
      );
    }
  }

  /**
   * Validate the provider configuration
   * 
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid
   */
  async validateConfig(_config: AIConfig): Promise<boolean> {
    try {
      // For Ollama, we just need to check if we can connect
      // No API key validation needed
      return await this.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Test connection to Ollama
   * 
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      // Try to list available models as a connection test
      await this.client.list();
      return true;
    } catch {
      // Connection failed
      return false;
    }
  }

  /**
   * Convert chat messages to Ollama format
   * 
   * @param message - Current user message
   * @param history - Conversation history
   * @returns Array of messages in Ollama format
   */
  private convertMessages(message: string, history: ChatMessage[]): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> {
    const messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> = [];

    // Add history messages
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    return messages;
  }

  /**
   * Get list of available models
   * Useful for UI to show available models
   * 
   * @returns Promise resolving to array of model names
   */
  async listModels(): Promise<string[]> {
    try {
      if (!this.client) {
        return [];
      }
      const response = await this.client.list();
      return response.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }
}

// Made with Bob
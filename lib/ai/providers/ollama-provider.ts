/**
 * Ollama Provider
 *
 * Implementation of the AIProvider interface for Ollama local models.
 * Supports running AI models locally without requiring an API key.
 * Ollama must be installed and running on the local machine.
 */

import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';

// Minimal structural type for the subset of the Ollama SDK client we use.
// Declared locally (rather than importing from 'ollama') so this module never
// statically references the server-only 'ollama' package specifier, which
// keeps it out of the client bundle. The real client is loaded via a dynamic
// import() at runtime on the server.
interface OllamaChatResponse {
  message?: { content?: string };
}
interface OllamaListResponse {
  models?: Array<{ name: string }>;
}
interface OllamaClient {
  chat(args: {
    model: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    options?: { temperature?: number; num_predict?: number };
  }): Promise<OllamaChatResponse>;
  list(): Promise<OllamaListResponse>;
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
  private clientPromise: Promise<OllamaClient | null> | null = null;
  private config: AIConfig;

  /**
   * Create a new Ollama provider instance
   *
   * @param config - AI configuration with optional baseUrl
   */
  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Lazily load and cache the Ollama client.
   *
   * The `ollama` SDK relies on Node APIs and can only run server-side, so it
   * is loaded through a dynamic `import()`. This keeps it out of the client
   * bundle (it becomes a separate server-only chunk) and, because callers
   * `await` this getter, the client is guaranteed to be ready before any
   * request is made (unlike a fire-and-forget import in the constructor).
   * If the SDK cannot be loaded (for example, in a browser), this resolves to
   * `null` and callers surface a clear "server-side only" error.
   */
  private getClient(): Promise<OllamaClient | null> {
    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = import('ollama')
      .then(
        (module) =>
          new module.Ollama({
            host: this.config.baseUrl || 'http://localhost:11434',
          }) as unknown as OllamaClient
      )
      .catch(() => null);

    return this.clientPromise;
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
    const client = await this.getClient();
    if (!client) {
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
      const response = await client.chat({
        model,
        messages,
        options: {
          temperature: options.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options.maxTokens ?? this.config.maxTokens,
        },
      });

      // Extract response content
      const content = response.message?.content || '';

      // Ollama reports token counts as prompt_eval_count (prompt) and
      // eval_count (completion) when available. Surface them as usage so the
      // app can total tokens across calls.
      const promptTokens = (response as { prompt_eval_count?: number }).prompt_eval_count;
      const completionTokens = (response as { eval_count?: number }).eval_count;
      const usage =
        typeof promptTokens === 'number' || typeof completionTokens === 'number'
          ? {
              promptTokens: promptTokens ?? 0,
              completionTokens: completionTokens ?? 0,
              totalTokens: (promptTokens ?? 0) + (completionTokens ?? 0),
            }
          : undefined;

      return {
        content,
        model,
        finishReason: 'stop',
        ...(usage ? { usage } : {}),
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
      const client = await this.getClient();
      if (!client) {
        return false;
      }
      // Try to list available models as a connection test
      await client.list();
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
      const client = await this.getClient();
      if (!client) {
        return [];
      }
      const response = await client.list();
      return response.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }
}

// Made with Bob
/**
 * AI Service Types
 * 
 * Core type definitions for AI service interactions.
 * These types are provider-agnostic and define the contract
 * that all AI providers must implement.
 */

/**
 * Represents a single message in a chat conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Options for chat requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Response from a chat request
 */
export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: 'stop' | 'length' | 'error';
}

/**
 * Configuration for AI providers
 */
export interface AIConfig {
  provider: 'mock' | 'ollama' | 'openai' | 'anthropic';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface that all AI providers must implement
 */
export interface AIProvider {
  /**
   * Provider name (e.g., 'mock', 'openai', 'ollama')
   */
  readonly name: string;

  /**
   * Send a chat message and get a response
   * 
   * @param message - The user's message
   * @param history - Optional conversation history for context
   * @param options - Optional chat configuration
   * @returns Promise resolving to the AI's response
   */
  chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse>;

  /**
   * Validate the provider configuration
   * 
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateConfig(config: AIConfig): Promise<boolean>;

  /**
   * Test connection to the AI provider
   * 
   * @returns Promise resolving to true if connection successful
   */
  testConnection(): Promise<boolean>;
}

/**
 * Error thrown by AI services
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Made with Bob

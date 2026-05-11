/**
 * AI Module Exports
 * 
 * Central export point for all AI-related functionality.
 * Import from this file to access AI services, types, and providers.
 */

// Main service
export { AIService, getAIService, resetAIService } from './ai-service';

// Types
export type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  AIConfig,
} from './types';

export { AIServiceError } from './types';

// Providers
export { MockAIProvider } from './providers/mock-provider';

// Made with Bob

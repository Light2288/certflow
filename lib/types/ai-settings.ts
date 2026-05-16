/**
 * CertFlow - AI Settings Type Definitions
 * 
 * Type definitions for AI provider configuration and settings.
 */

// ============================================================================
// AI PROVIDER TYPES
// ============================================================================

export type AIProviderType = 'mock' | 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';

export interface AIProviderInfo {
  id: AIProviderType;
  name: string;
  description: string;
  requiresApiKey: boolean;
  supportsLocalModels: boolean;
  defaultModels: string[];
}

// ============================================================================
// AI SETTINGS TYPES
// ============================================================================

export interface AISettings {
  provider: AIProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // for custom providers or Ollama
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

export const AI_PROVIDERS: Record<AIProviderType, AIProviderInfo> = {
  mock: {
    id: 'mock',
    name: 'Mock Provider (Demo)',
    description: 'Pre-defined responses for testing. No configuration needed.',
    requiresApiKey: false,
    supportsLocalModels: false,
    defaultModels: ['mock-model'],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models from OpenAI. Requires API key.',
    requiresApiKey: true,
    supportsLocalModels: false,
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models from Anthropic. Requires API key.',
    requiresApiKey: true,
    supportsLocalModels: false,
    defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  google: {
    id: 'google',
    name: 'Google AI (Gemini)',
    description: 'Gemini models from Google AI. Requires API key.',
    requiresApiKey: true,
    supportsLocalModels: false,
    defaultModels: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run models locally with Ollama. No API key needed.',
    requiresApiKey: false,
    supportsLocalModels: true,
    defaultModels: ['llama2', 'mistral', 'codellama', 'phi'],
  },
  custom: {
    id: 'custom',
    name: 'Custom API',
    description: 'Connect to a custom OpenAI-compatible API endpoint.',
    requiresApiKey: true,
    supportsLocalModels: false,
    defaultModels: [],
  },
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'mock',
  temperature: 0.7,
  maxTokens: 2000,
};

// Made with Bob

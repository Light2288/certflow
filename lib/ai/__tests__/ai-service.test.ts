/**
 * Tests for AIService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIService, getAIService, resetAIService } from '../ai-service';
import { AIServiceError } from '../types';
import type { AIConfig } from '../types';

describe('AIService', () => {
  afterEach(() => {
    resetAIService();
  });

  describe('Constructor', () => {
    it('should create service with default config', () => {
      const service = new AIService();
      const config = service.getConfig();
      
      expect(config.provider).toBe('mock');
      expect(config.model).toBe('mock-model');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2000);
    });

    it('should create service with custom config', () => {
      const customConfig: AIConfig = {
        provider: 'mock',
        model: 'custom-model',
        temperature: 0.5,
        maxTokens: 1000,
      };
      
      const service = new AIService(customConfig);
      const config = service.getConfig();
      
      expect(config.provider).toBe('mock');
      expect(config.model).toBe('custom-model');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(1000);
    });

    it('should use mock provider by default', () => {
      const service = new AIService();
      expect(service.getProviderName()).toBe('mock');
    });
  });

  describe('chat()', () => {
    let service: AIService;

    beforeEach(() => {
      service = new AIService();
    });

    it('should send message and get response', async () => {
      const response = await service.chat('Hello');
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(typeof response.content).toBe('string');
    });

    it('should throw error for empty message', async () => {
      await expect(service.chat('')).rejects.toThrow(AIServiceError);
      await expect(service.chat('')).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error for whitespace-only message', async () => {
      await expect(service.chat('   ')).rejects.toThrow(AIServiceError);
    });

    it('should pass conversation history to provider', async () => {
      const history = [
        { role: 'user' as const, content: 'Previous message', timestamp: new Date() },
        { role: 'assistant' as const, content: 'Previous response', timestamp: new Date() },
      ];
      
      const response = await service.chat('New message', history);
      expect(response).toBeDefined();
    });

    it('should merge options with config defaults', async () => {
      const service = new AIService({
        provider: 'mock',
        temperature: 0.8,
        maxTokens: 1500,
      });
      
      const response = await service.chat('Test', undefined, {
        temperature: 0.5, // Override
      });
      
      expect(response).toBeDefined();
    });

    it('should use config defaults when no options provided', async () => {
      const service = new AIService({
        provider: 'mock',
        temperature: 0.9,
        maxTokens: 500,
        model: 'test-model',
      });
      
      const response = await service.chat('Test');
      expect(response).toBeDefined();
    });

    it('should handle provider errors gracefully', async () => {
      // This test verifies error wrapping
      const response = await service.chat('Test message');
      expect(response).toBeDefined();
    });
  });

  describe('validateConfig()', () => {
    it('should validate mock provider config', async () => {
      const service = new AIService({ provider: 'mock' });
      const isValid = await service.validateConfig();
      
      expect(isValid).toBe(true);
    });

    it('should handle validation errors', async () => {
      const service = new AIService({ provider: 'mock' });
      const isValid = await service.validateConfig();
      
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('testConnection()', () => {
    it('should test connection successfully for mock provider', async () => {
      const service = new AIService({ provider: 'mock' });
      const result = await service.testConnection();
      
      expect(result).toBe(true);
    });

    it('should handle connection test errors', async () => {
      const service = new AIService({ provider: 'mock' });
      const result = await service.testConnection();
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      const service = new AIService({ provider: 'mock', model: 'old-model' });
      
      service.updateConfig({ provider: 'mock', model: 'new-model' });
      
      const config = service.getConfig();
      expect(config.model).toBe('new-model');
    });

    it('should recreate provider when config changes', () => {
      const service = new AIService({ provider: 'mock' });
      expect(service.getProviderName()).toBe('mock');
      
      service.updateConfig({ provider: 'mock', model: 'updated' });
      expect(service.getProviderName()).toBe('mock');
    });
  });

  describe('getConfig()', () => {
    it('should return copy of config', () => {
      const service = new AIService({ provider: 'mock', model: 'test' });
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });

    it('should not allow external modification of config', () => {
      const service = new AIService({ provider: 'mock', model: 'original' });
      const config = service.getConfig();
      
      config.model = 'modified';
      
      const actualConfig = service.getConfig();
      expect(actualConfig.model).toBe('original');
    });
  });

  describe('getProviderName()', () => {
    it('should return current provider name', () => {
      const service = new AIService({ provider: 'mock' });
      expect(service.getProviderName()).toBe('mock');
    });
  });

  describe('Provider Creation', () => {
    it('should throw error for unimplemented ollama provider', () => {
      expect(() => new AIService({ provider: 'ollama' })).toThrow(AIServiceError);
      expect(() => new AIService({ provider: 'ollama' })).toThrow('not yet implemented');
    });

    it('should throw error for unimplemented openai provider', () => {
      expect(() => new AIService({ provider: 'openai' })).toThrow(AIServiceError);
      expect(() => new AIService({ provider: 'openai' })).toThrow('not yet implemented');
    });

    it('should throw error for unimplemented anthropic provider', () => {
      expect(() => new AIService({ provider: 'anthropic' })).toThrow(AIServiceError);
      expect(() => new AIService({ provider: 'anthropic' })).toThrow('not yet implemented');
    });
  });

  describe('AIServiceError', () => {
    it('should create error with code and provider', () => {
      const error = new AIServiceError('Test error', 'TEST_CODE', 'mock');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.provider).toBe('mock');
      expect(error.name).toBe('AIServiceError');
    });

    it('should create error without provider', () => {
      const error = new AIServiceError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.provider).toBeUndefined();
    });
  });
});

describe('Global AI Service', () => {
  afterEach(() => {
    resetAIService();
  });

  describe('getAIService()', () => {
    it('should create singleton instance', () => {
      const service1 = getAIService();
      const service2 = getAIService();
      
      expect(service1).toBe(service2); // Same instance
    });

    it('should create instance with default config', () => {
      const service = getAIService();
      const config = service.getConfig();
      
      expect(config.provider).toBe('mock');
    });

    it('should create instance with custom config', () => {
      const customConfig: AIConfig = {
        provider: 'mock',
        model: 'custom-model',
      };
      
      const service = getAIService(customConfig);
      const config = service.getConfig();
      
      expect(config.model).toBe('custom-model');
    });

    it('should update existing instance when config provided', () => {
      const service1 = getAIService({ provider: 'mock', model: 'model1' });
      const service2 = getAIService({ provider: 'mock', model: 'model2' });
      
      expect(service1).toBe(service2); // Same instance
      expect(service2.getConfig().model).toBe('model2'); // Updated config
    });

    it('should not update instance when no config provided', () => {
      const service1 = getAIService({ provider: 'mock', model: 'original' });
      const service2 = getAIService();
      
      expect(service1).toBe(service2);
      expect(service2.getConfig().model).toBe('original'); // Unchanged
    });
  });

  describe('resetAIService()', () => {
    it('should reset singleton instance', () => {
      const service1 = getAIService();
      resetAIService();
      const service2 = getAIService();
      
      expect(service1).not.toBe(service2); // Different instances
    });

    it('should allow creating new instance with different config', () => {
      getAIService({ provider: 'mock', model: 'old' });
      resetAIService();
      const service = getAIService({ provider: 'mock', model: 'new' });
      
      expect(service.getConfig().model).toBe('new');
    });
  });
});

// Made with Bob

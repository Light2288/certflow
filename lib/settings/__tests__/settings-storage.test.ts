import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsStorage, saveSettings, loadSettings, clearSettings, hasSettings } from '../settings-storage';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/lib/types/ai-settings';

describe('SettingsStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    // happy-dom provides localStorage, so we just need to clear it
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: AISettings = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      const result = SettingsStorage.saveSettings(settings);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      const stored = localStorage.getItem('certflow_ai_settings');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(settings);
    });

    it('should handle save errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });
  
      const settings: AISettings = DEFAULT_AI_SETTINGS;
      const result = SettingsStorage.saveSettings(settings);
  
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');
      
      // Restore
      setItemSpy.mockRestore();
    });

    it('should overwrite existing settings', () => {
      const settings1: AISettings = {
        provider: 'openai',
        apiKey: 'key1',
        model: 'gpt-4',
      };

      const settings2: AISettings = {
        provider: 'anthropic',
        apiKey: 'key2',
        model: 'claude-3-opus-20240229',
      };

      SettingsStorage.saveSettings(settings1);
      SettingsStorage.saveSettings(settings2);

      const stored = localStorage.getItem('certflow_ai_settings');
      expect(JSON.parse(stored!)).toEqual(settings2);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from localStorage', () => {
      const settings: AISettings = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      localStorage.setItem('certflow_ai_settings', JSON.stringify(settings));

      const result = SettingsStorage.loadSettings();

      expect(result.success).toBe(true);
      // loadSettings merges with defaults, so check key fields
      expect(result.data?.provider).toBe('openai');
      expect(result.data?.apiKey).toBe('test-key');
      expect(result.data?.model).toBe('gpt-4');
    });

    it('should return default settings when none exist', () => {
      const result = SettingsStorage.loadSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(DEFAULT_AI_SETTINGS);
    });

    it('should return default settings on parse error', () => {
      localStorage.setItem('certflow_ai_settings', 'invalid json');

      const result = SettingsStorage.loadSettings();

      expect(result.success).toBe(false);
      expect(result.data).toEqual(DEFAULT_AI_SETTINGS);
      expect(result.error).toBeTruthy();
    });

    it('should return default settings for invalid format', () => {
      localStorage.setItem('certflow_ai_settings', JSON.stringify({ invalid: 'data' }));

      const result = SettingsStorage.loadSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(DEFAULT_AI_SETTINGS);
    });

    it('should merge loaded settings with defaults', () => {
      const partialSettings = {
        provider: 'openai',
      };

      localStorage.setItem('certflow_ai_settings', JSON.stringify(partialSettings));

      const result = SettingsStorage.loadSettings();

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        ...DEFAULT_AI_SETTINGS,
        provider: 'openai',
      });
    });
  });

  describe('clearSettings', () => {
    it('should remove settings from localStorage', () => {
      const settings: AISettings = DEFAULT_AI_SETTINGS;
      localStorage.setItem('certflow_ai_settings', JSON.stringify(settings));

      const result = SettingsStorage.clearSettings();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('certflow_ai_settings')).toBeNull();
    });

    it('should handle clear errors gracefully', () => {
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Clear failed');
      });
  
      const result = SettingsStorage.clearSettings();
  
      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear failed');
      
      // Restore
      removeItemSpy.mockRestore();
    });

    it('should succeed even if no settings exist', () => {
      const result = SettingsStorage.clearSettings();

      expect(result.success).toBe(true);
    });
  });

  describe('hasSettings', () => {
    it('should return true when settings exist', () => {
      localStorage.setItem('certflow_ai_settings', JSON.stringify(DEFAULT_AI_SETTINGS));

      expect(SettingsStorage.hasSettings()).toBe(true);
    });

    it('should return false when no settings exist', () => {
      expect(SettingsStorage.hasSettings()).toBe(false);
    });

    it('should return false on error', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
  
      expect(SettingsStorage.hasSettings()).toBe(false);
      
      // Restore
      getItemSpy.mockRestore();
    });
  });

  describe('getStorageSize', () => {
    it('should return size of stored settings', () => {
      const settings: AISettings = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      localStorage.setItem('certflow_ai_settings', JSON.stringify(settings));

      const size = SettingsStorage.getStorageSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 when no settings exist', () => {
      const size = SettingsStorage.getStorageSize();
      expect(size).toBe(0);
    });

    it('should return 0 on error', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
  
      const size = SettingsStorage.getStorageSize();
      expect(size).toBe(0);
      
      // Restore
      getItemSpy.mockRestore();
    });
  });

  describe('exportSettings', () => {
    it('should export settings as JSON string', () => {
      const settings: AISettings = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      localStorage.setItem('certflow_ai_settings', JSON.stringify(settings));

      const result = SettingsStorage.exportSettings();

      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      const exported = JSON.parse(result.data!);
      expect(exported.provider).toBe('openai');
      expect(exported.apiKey).toBe('test-key');
      expect(exported.model).toBe('gpt-4');
    });

    it('should export default settings when none exist', () => {
      const result = SettingsStorage.exportSettings();

      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(JSON.parse(result.data!)).toEqual(DEFAULT_AI_SETTINGS);
    });

    it('should handle export errors', () => {
      const loadSettingsSpy = vi.spyOn(SettingsStorage, 'loadSettings').mockReturnValue({
        success: false,
        data: undefined,
        error: 'Load failed',
      });
  
      const result = SettingsStorage.exportSettings();
  
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      
      // Restore
      loadSettingsSpy.mockRestore();
    });
  });

  describe('importSettings', () => {
    it('should import settings from JSON string', () => {
      const settings: AISettings = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };

      const json = JSON.stringify(settings);
      const result = SettingsStorage.importSettings(json);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(settings);
      
      const stored = localStorage.getItem('certflow_ai_settings');
      expect(JSON.parse(stored!)).toEqual(settings);
    });

    it('should reject invalid JSON', () => {
      const result = SettingsStorage.importSettings('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject invalid settings format', () => {
      const invalidSettings = { invalid: 'data' };
      const json = JSON.stringify(invalidSettings);

      const result = SettingsStorage.importSettings(json);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid settings format');
    });
  });

  describe('Convenience functions', () => {
    it('saveSettings should work', () => {
      const settings: AISettings = DEFAULT_AI_SETTINGS;
      const result = saveSettings(settings);

      expect(result.success).toBe(true);
    });

    it('loadSettings should work', () => {
      const result = loadSettings();
  
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.provider).toBe(DEFAULT_AI_SETTINGS.provider);
    });

    it('clearSettings should work', () => {
      const result = clearSettings();

      expect(result.success).toBe(true);
    });

    it('hasSettings should work', () => {
      const result = hasSettings();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete save/load cycle', () => {
      const settings: AISettings = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.8,
        maxTokens: 4000,
      };

      // Save
      const saveResult = SettingsStorage.saveSettings(settings);
      expect(saveResult.success).toBe(true);

      // Load
      const loadResult = SettingsStorage.loadSettings();
      expect(loadResult.data?.provider).toBe('anthropic');
      expect(loadResult.data?.apiKey).toBe('sk-ant-test');
      expect(loadResult.data?.model).toBe('claude-3-sonnet-20240229');
      expect(loadResult.data?.temperature).toBe(0.8);
      expect(loadResult.data?.maxTokens).toBe(4000);
    });

    it('should handle save/clear/load cycle', () => {
      const settings: AISettings = DEFAULT_AI_SETTINGS;

      // Save
      SettingsStorage.saveSettings(settings);
      expect(SettingsStorage.hasSettings()).toBe(true);

      // Clear
      SettingsStorage.clearSettings();
      expect(SettingsStorage.hasSettings()).toBe(false);

      // Load should return defaults
      const loadResult = SettingsStorage.loadSettings();
      expect(loadResult.data?.provider).toBe(DEFAULT_AI_SETTINGS.provider);
    });

    it('should handle export/import cycle', () => {
      const settings: AISettings = {
        provider: 'ollama',
        model: 'llama2',
      };

      SettingsStorage.saveSettings(settings);

      // Export
      const exportResult = SettingsStorage.exportSettings();
      expect(exportResult.data).toBeTruthy();

      // Clear
      SettingsStorage.clearSettings();

      // Import
      const importResult = SettingsStorage.importSettings(exportResult.data!);
      expect(importResult.success).toBe(true);
      expect(importResult.data?.provider).toBe('ollama');
      expect(importResult.data?.model).toBe('llama2');
    });
  });
});

// Made with Bob

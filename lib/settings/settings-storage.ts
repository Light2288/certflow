/**
 * CertFlow - Settings Storage Service
 * 
 * Handles persistence of AI settings to localStorage.
 * Provides type-safe operations for saving, loading, and clearing settings.
 */

import { AISettings, DEFAULT_AI_SETTINGS } from '@/lib/types/ai-settings';

const STORAGE_KEY = 'certflow_ai_settings';

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Settings Storage Service
 */
export class SettingsStorage {
  /**
   * Save settings to localStorage
   */
  static saveSettings(settings: AISettings): StorageResult<void> {
    try {
      const serialized = JSON.stringify(settings);
      localStorage.setItem(STORAGE_KEY, serialized);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load settings from localStorage
   * Returns default settings if none exist or if loading fails
   */
  static loadSettings(): StorageResult<AISettings> {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      
      if (!serialized) {
        // No settings saved yet, return defaults
        return {
          success: true,
          data: DEFAULT_AI_SETTINGS,
        };
      }

      const parsed = JSON.parse(serialized);
      
      // Validate that parsed data has required fields
      if (!this.isValidSettings(parsed)) {
        console.warn('Invalid settings format, using defaults');
        return {
          success: true,
          data: DEFAULT_AI_SETTINGS,
        };
      }

      // Merge with defaults to ensure all fields exist
      const settings: AISettings = {
        ...DEFAULT_AI_SETTINGS,
        ...parsed,
      };

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {
        success: false,
        data: DEFAULT_AI_SETTINGS,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear all settings from localStorage
   */
  static clearSettings(): StorageResult<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if settings exist in localStorage
   */
  static hasSettings(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch (error) {
      console.error('Failed to check settings:', error);
      return false;
    }
  }

  /**
   * Validate settings object structure
   */
  private static isValidSettings(obj: any): obj is AISettings {
    return (
      obj &&
      typeof obj === 'object' &&
      'provider' in obj &&
      typeof obj.provider === 'string'
    );
  }

  /**
   * Get storage size in bytes
   */
  static getStorageSize(): number {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      return serialized ? new Blob([serialized]).size : 0;
    } catch (error) {
      console.error('Failed to get storage size:', error);
      return 0;
    }
  }

  /**
   * Export settings as JSON string
   */
  static exportSettings(): StorageResult<string> {
    try {
      const result = this.loadSettings();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: 'Failed to load settings for export',
        };
      }

      const exported = JSON.stringify(result.data, null, 2);
      return {
        success: true,
        data: exported,
      };
    } catch (error) {
      console.error('Failed to export settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import settings from JSON string
   */
  static importSettings(json: string): StorageResult<AISettings> {
    try {
      const parsed = JSON.parse(json);
      
      if (!this.isValidSettings(parsed)) {
        return {
          success: false,
          error: 'Invalid settings format',
        };
      }

      const saveResult = this.saveSettings(parsed);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
        };
      }

      return {
        success: true,
        data: parsed,
      };
    } catch (error) {
      console.error('Failed to import settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }
}

/**
 * Convenience functions for direct use
 */
export const saveSettings = (settings: AISettings) => SettingsStorage.saveSettings(settings);
export const loadSettings = () => SettingsStorage.loadSettings();
export const clearSettings = () => SettingsStorage.clearSettings();
export const hasSettings = () => SettingsStorage.hasSettings();

// Made with Bob

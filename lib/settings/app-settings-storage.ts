/**
 * CertFlow - App Settings Storage Service
 *
 * Handles persistence of app-level settings (e.g. the currently selected
 * certification) to localStorage. Kept separate from AI provider settings so
 * the two concerns never overload one another.
 */

import { AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/types/app-settings';

const STORAGE_KEY = 'certflow_app_settings';

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * App Settings Storage Service
 */
export class AppSettingsStorage {
  /**
   * Save app settings to localStorage
   */
  static saveAppSettings(settings: AppSettings): StorageResult<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return { success: true };
    } catch (error) {
      console.error('Failed to save app settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load app settings from localStorage.
   * Returns default settings if none exist or if loading fails.
   */
  static loadAppSettings(): StorageResult<AppSettings> {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);

      if (!serialized) {
        return { success: true, data: DEFAULT_APP_SETTINGS };
      }

      const parsed = JSON.parse(serialized);

      if (!this.isValidAppSettings(parsed)) {
        console.warn('Invalid app settings format, using defaults');
        return { success: true, data: DEFAULT_APP_SETTINGS };
      }

      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
      };

      return { success: true, data: settings };
    } catch (error) {
      console.error('Failed to load app settings:', error);
      return {
        success: false,
        data: DEFAULT_APP_SETTINGS,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear app settings from localStorage
   */
  static clearAppSettings(): StorageResult<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear app settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate app settings object structure
   */
  private static isValidAppSettings(obj: unknown): obj is AppSettings {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'currentCertificationId' in obj &&
      typeof (obj as AppSettings).currentCertificationId === 'string' &&
      (obj as AppSettings).currentCertificationId.length > 0
    );
  }
}

/**
 * Convenience functions for direct use
 */
export const saveAppSettings = (settings: AppSettings) =>
  AppSettingsStorage.saveAppSettings(settings);
export const loadAppSettings = () => AppSettingsStorage.loadAppSettings();
export const clearAppSettings = () => AppSettingsStorage.clearAppSettings();

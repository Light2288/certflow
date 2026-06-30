import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AppSettingsStorage,
  saveAppSettings,
  loadAppSettings,
  clearAppSettings,
} from '../app-settings-storage';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/types/app-settings';

const STORAGE_KEY = 'certflow_app_settings';

describe('AppSettingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveAppSettings', () => {
    it('should save app settings to localStorage', () => {
      const settings: AppSettings = { currentCertificationId: 'snowpro-core' };

      const result = AppSettingsStorage.saveAppSettings(settings);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(settings);
    });

    it('should handle save errors gracefully', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = AppSettingsStorage.saveAppSettings(DEFAULT_APP_SETTINGS);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');

      setItemSpy.mockRestore();
    });

    it('should overwrite existing app settings', () => {
      saveAppSettings({ currentCertificationId: 'aws-ml' });
      saveAppSettings({ currentCertificationId: 'snowpro-core' });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(stored!)).toEqual({ currentCertificationId: 'snowpro-core' });
    });
  });

  describe('loadAppSettings', () => {
    it('should return defaults when nothing is stored', () => {
      const result = AppSettingsStorage.loadAppSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(DEFAULT_APP_SETTINGS);
      expect(result.data?.currentCertificationId).toBe('aws-ml');
    });

    it('should load app settings from localStorage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentCertificationId: 'snowpro-core' })
      );

      const result = AppSettingsStorage.loadAppSettings();

      expect(result.success).toBe(true);
      expect(result.data?.currentCertificationId).toBe('snowpro-core');
    });

    it('should fall back to defaults on malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{ not valid json');

      const result = AppSettingsStorage.loadAppSettings();

      expect(result.data).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should fall back to defaults on an invalid shape', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

      const result = AppSettingsStorage.loadAppSettings();

      expect(result.data).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should fall back to defaults when the cert id is an empty string', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentCertificationId: '' })
      );

      const result = AppSettingsStorage.loadAppSettings();

      expect(result.data).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe('clearAppSettings', () => {
    it('should remove the stored key', () => {
      saveAppSettings({ currentCertificationId: 'snowpro-core' });
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

      const result = clearAppSettings();

      expect(result.success).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('convenience functions', () => {
    it('round-trips via saveAppSettings/loadAppSettings', () => {
      saveAppSettings({ currentCertificationId: 'snowpro-core' });
      const result = loadAppSettings();
      expect(result.data?.currentCertificationId).toBe('snowpro-core');
    });
  });
});

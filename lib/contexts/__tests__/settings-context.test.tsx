import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../settings-context';
import { DEFAULT_AI_SETTINGS } from '@/lib/types/ai-settings';
import { DEFAULT_CERTIFICATION_ID } from '@/lib/types/app-settings';

describe('SettingsContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('SettingsProvider', () => {
    it('should provide default settings initially', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(DEFAULT_AI_SETTINGS);
    });

    it('should load settings from localStorage on mount', async () => {
      // Pre-populate localStorage
      const savedSettings = {
        provider: 'openai' as const,
        apiKey: 'sk-test-123',
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 2000,
      };
      localStorage.setItem('certflow_ai_settings', JSON.stringify(savedSettings));

      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(savedSettings);
    });

    it('should update settings and persist to localStorage', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update settings
      act(() => {
        result.current.updateSettings({
          provider: 'anthropic',
          apiKey: 'sk-ant-test',
          model: 'claude-3-sonnet-20240229',
        });
      });

      // Check settings were updated
      expect(result.current.settings.provider).toBe('anthropic');
      expect(result.current.settings.apiKey).toBe('sk-ant-test');
      expect(result.current.settings.model).toBe('claude-3-sonnet-20240229');

      // Check localStorage was updated
      const stored = localStorage.getItem('certflow_ai_settings');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.provider).toBe('anthropic');
      expect(parsed.apiKey).toBe('sk-ant-test');
    });

    it('should reset settings to defaults', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Update settings first
      act(() => {
        result.current.updateSettings({
          provider: 'openai',
          apiKey: 'sk-test',
        });
      });

      expect(result.current.settings.provider).toBe('openai');

      // Reset settings
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(DEFAULT_AI_SETTINGS);

      // Check localStorage was updated
      const stored = localStorage.getItem('certflow_ai_settings');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(DEFAULT_AI_SETTINGS);
    });

    it('should handle partial updates', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialSettings = result.current.settings;

      // Update only provider
      act(() => {
        result.current.updateSettings({ provider: 'ollama' });
      });

      expect(result.current.settings.provider).toBe('ollama');
      // Other settings should remain unchanged
      expect(result.current.settings.temperature).toBe(initialSettings.temperature);
      expect(result.current.settings.maxTokens).toBe(initialSettings.maxTokens);
    });
  });

  describe('current certification', () => {
    it('should default the current certification id to aws-ml', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCertificationId).toBe(DEFAULT_CERTIFICATION_ID);
    });

    it('should load the current certification id from localStorage on mount', async () => {
      localStorage.setItem(
        'certflow_app_settings',
        JSON.stringify({ currentCertificationId: 'snowpro-core' })
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCertificationId).toBe('snowpro-core');
    });

    it('should update the current certification and persist it', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentCertification('snowpro-core');
      });

      expect(result.current.currentCertificationId).toBe('snowpro-core');

      const stored = localStorage.getItem('certflow_app_settings');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).currentCertificationId).toBe('snowpro-core');
    });

    it('should not touch AI settings when switching certification', async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSettings({ provider: 'openai', apiKey: 'sk-keep' });
      });
      act(() => {
        result.current.setCurrentCertification('snowpro-core');
      });

      expect(result.current.settings.provider).toBe('openai');
      expect(result.current.settings.apiKey).toBe('sk-keep');
      expect(localStorage.getItem('certflow_ai_settings')).toBeTruthy();
    });
  });

  describe('useSettings hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useSettings());
      }).toThrow('useSettings must be used within a SettingsProvider');

      console.error = originalError;
    });
  });

  describe('Integration', () => {
    it('should persist settings across provider remounts', async () => {
      // First render
      const { result: result1, unmount } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      // Update settings
      act(() => {
        result1.current.updateSettings({
          provider: 'openai',
          apiKey: 'sk-persist-test',
        });
      });

      // Unmount
      unmount();

      // Second render (simulating page reload)
      const { result: result2 } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // Settings should be persisted
      expect(result2.current.settings.provider).toBe('openai');
      expect(result2.current.settings.apiKey).toBe('sk-persist-test');
    });
  });
});

// Made with Bob
/**
 * CertFlow - Settings Context
 * 
 * Provides global state management for AI settings with automatic
 * localStorage persistence.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/lib/types/ai-settings';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/types/app-settings';
import { loadSettings, saveSettings as persistSettings } from '@/lib/settings/settings-storage';
import {
  loadAppSettings,
  saveAppSettings as persistAppSettings,
} from '@/lib/settings/app-settings-storage';

interface SettingsContextType {
  settings: AISettings;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
  currentCertificationId: string;
  setCurrentCertification: (certificationId: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const result = loadSettings();
    if (result.success && result.data) {
      setSettings(result.data);
    }

    const appResult = loadAppSettings();
    if (appResult.success && appResult.data) {
      setAppSettings(appResult.data);
    }

    setIsLoading(false);
  }, []);

  // Update settings and persist to localStorage
  const updateSettings = useCallback((newSettings: Partial<AISettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // Persist to localStorage
      persistSettings(updated);

      return updated;
    });
  }, []);

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_AI_SETTINGS);
    persistSettings(DEFAULT_AI_SETTINGS);
  }, []);

  // Switch the current certification and persist it (independent of AI settings)
  const setCurrentCertification = useCallback((certificationId: string) => {
    setAppSettings((prev) => {
      const updated = { ...prev, currentCertificationId: certificationId };
      persistAppSettings(updated);
      return updated;
    });
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    currentCertificationId: appSettings.currentCertificationId,
    setCurrentCertification,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings context
 * 
 * @throws Error if used outside SettingsProvider
 */
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}

// Made with Bob
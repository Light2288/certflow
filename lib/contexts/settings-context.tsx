/**
 * CertFlow - Settings Context
 * 
 * Provides global state management for AI settings with automatic
 * localStorage persistence.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AISettings, DEFAULT_AI_SETTINGS } from '@/lib/types/ai-settings';
import { loadSettings, saveSettings as persistSettings } from '@/lib/settings/settings-storage';

interface SettingsContextType {
  settings: AISettings;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const result = loadSettings();
    if (result.success && result.data) {
      setSettings(result.data);
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

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
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
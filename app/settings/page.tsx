'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProviderSelector from './components/ProviderSelector';
import ApiKeyInput from './components/ApiKeyInput';
import ModelSelector from './components/ModelSelector';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, type AIProviderType, type AISettings } from '@/lib/types/ai-settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const selectedProvider = AI_PROVIDERS[settings.provider];
  const requiresApiKey = selectedProvider.requiresApiKey;

  const handleProviderChange = (provider: AIProviderType) => {
    setSettings({
      ...settings,
      provider,
      // Reset API key and model when changing provider
      apiKey: '',
      model: AI_PROVIDERS[provider].defaultModels[0] || '',
    });
    setSaveStatus('idle');
  };

  const handleApiKeyChange = (apiKey: string) => {
    setSettings({ ...settings, apiKey });
    setSaveStatus('idle');
  };

  const handleModelChange = (model: string) => {
    setSettings({ ...settings, model });
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // TODO: Save to localStorage in Phase 6.5
      console.log('Settings to save:', settings);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_AI_SETTINGS);
    setSaveStatus('idle');
  };

  const canSave = !requiresApiKey || (requiresApiKey && settings.apiKey);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Configure your AI provider and customize your learning experience
          </p>
        </div>

        {/* Settings Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-6">
            {/* AI Provider Configuration Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                AI Provider Configuration
              </h2>
              <div className="space-y-6">
                {/* Provider Selector */}
                <ProviderSelector
                  value={settings.provider}
                  onChange={handleProviderChange}
                  disabled={isSaving}
                />

                {/* API Key Input - Only show if provider requires it */}
                {requiresApiKey && (
                  <ApiKeyInput
                    value={settings.apiKey || ''}
                    onChange={handleApiKeyChange}
                    disabled={isSaving}
                    required={true}
                    helpText="Your API key is stored locally and never sent to our servers."
                  />
                )}

                {/* Model Selector */}
                <ModelSelector
                  provider={settings.provider}
                  value={settings.model || ''}
                  onChange={handleModelChange}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Advanced Options Section (Placeholder for future) */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Options
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Additional configuration options coming soon.
              </p>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset to Defaults
            </button>

            <div className="flex items-center gap-3">
              {/* Save Status */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Settings saved!</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Failed to save</span>
                </div>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Local Storage
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                All settings are stored locally in your browser. Your API keys and preferences never leave your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

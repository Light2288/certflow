'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProviderSelector from './components/ProviderSelector';
import ApiKeyInput from './components/ApiKeyInput';
import ModelSelector from './components/ModelSelector';
import { AI_PROVIDERS, type AIProviderType, type AISettings } from '@/lib/types/ai-settings';
import { useSettings } from '@/lib/contexts/settings-context';

export default function SettingsPage() {
  const { settings: savedSettings, updateSettings, resetSettings, isLoading } = useSettings();
  
  // Local draft state for unsaved changes
  const [draftSettings, setDraftSettings] = useState<AISettings>(savedSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update draft when saved settings change (e.g., on initial load)
  useEffect(() => {
    setDraftSettings(savedSettings);
  }, [savedSettings]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(draftSettings) !== JSON.stringify(savedSettings);

  const selectedProvider = AI_PROVIDERS[draftSettings.provider];
  const requiresApiKey = selectedProvider.requiresApiKey;

  const handleProviderChange = (provider: AIProviderType) => {
    setDraftSettings({
      ...draftSettings,
      provider,
      // Reset API key and model when changing provider
      apiKey: '',
      model: AI_PROVIDERS[provider].defaultModels[0] || '',
    });
    setSaveStatus('idle');
  };

  const handleApiKeyChange = (apiKey: string) => {
    setDraftSettings({ ...draftSettings, apiKey });
    setSaveStatus('idle');
  };

  const handleModelChange = (model: string) => {
    setDraftSettings({ ...draftSettings, model });
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Simulate save delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update context (which persists to localStorage)
      updateSettings(draftSettings);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert to saved settings
    setDraftSettings(savedSettings);
    setSaveStatus('idle');
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async () => {
    setShowResetConfirm(false);
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      resetSettings();
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCancel = () => {
    setShowResetConfirm(false);
  };

  const canSave = !requiresApiKey || (requiresApiKey && draftSettings.apiKey);

  // Show loading state while settings are being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

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

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                You have unsaved changes. Click &quot;Save Settings&quot; to apply them.
              </p>
            </div>
          </div>
        )}

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
                  value={draftSettings.provider}
                  onChange={handleProviderChange}
                  disabled={isSaving}
                />

                {/* API Key Input - Only show if provider requires it */}
                {requiresApiKey && (
                  <ApiKeyInput
                    value={draftSettings.apiKey || ''}
                    onChange={handleApiKeyChange}
                    disabled={isSaving}
                    required={true}
                    helpText="Your API key is stored locally and never sent to our servers."
                  />
                )}

                {/* Model Selector */}
                <ModelSelector
                  provider={draftSettings.provider}
                  value={draftSettings.model || ''}
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

          {/* Bottom Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  You have unsaved changes. Click <strong>Save Settings</strong> to apply them or <strong>Cancel</strong> to discard.
                </p>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetClick}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

              {/* Cancel Button - Only show if there are unsaved changes */}
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canSave || !hasUnsavedChanges}
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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Reset to Defaults?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  This will reset all settings to their default values. Your API key and custom configuration will be lost. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleResetCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Reset Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob

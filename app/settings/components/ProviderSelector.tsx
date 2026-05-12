'use client';

import { AI_PROVIDERS, type AIProviderType } from '@/lib/types/ai-settings';

interface ProviderSelectorProps {
  value: AIProviderType;
  onChange: (provider: AIProviderType) => void;
  disabled?: boolean;
}

export default function ProviderSelector({ value, onChange, disabled = false }: ProviderSelectorProps) {
  const selectedProvider = AI_PROVIDERS[value];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI Provider
        </label>
        <select
          id="provider"
          value={value}
          onChange={(e) => onChange(e.target.value as AIProviderType)}
          disabled={disabled}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {Object.values(AI_PROVIDERS).map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      {/* Provider Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              {selectedProvider.name}
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {selectedProvider.description}
            </p>
            
            {/* Provider Features */}
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedProvider.requiresApiKey && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  API Key Required
                </span>
              )}
              {selectedProvider.supportsLocalModels && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Local Models
                </span>
              )}
              {!selectedProvider.requiresApiKey && !selectedProvider.supportsLocalModels && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No Configuration
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Links */}
      {selectedProvider.requiresApiKey && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">Need an API key?</p>
          <ul className="space-y-1 ml-4">
            {selectedProvider.id === 'openai' && (
              <li>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Get OpenAI API Key
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
            )}
            {selectedProvider.id === 'anthropic' && (
              <li>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Get Anthropic API Key
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      {selectedProvider.id === 'ollama' && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">Using Ollama:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">ollama.ai</a></li>
            <li>Run <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">ollama serve</code> to start the server</li>
            <li>Pull a model: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">ollama pull llama2</code></li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Made with Bob

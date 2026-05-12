'use client';

import { AI_PROVIDERS, type AIProviderType } from '@/lib/types/ai-settings';

interface ModelSelectorProps {
  provider: AIProviderType;
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  customModels?: string[];
}

export default function ModelSelector({
  provider,
  value,
  onChange,
  disabled = false,
  customModels = [],
}: ModelSelectorProps) {
  const providerInfo = AI_PROVIDERS[provider];
  const availableModels = customModels.length > 0 ? customModels : providerInfo.defaultModels;
  const hasModels = availableModels.length > 0;

  // If no models available, show info message
  if (!hasModels) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Model
        </label>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No models configured for this provider.
              </p>
              {provider === 'custom' && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Custom providers may not require model selection, or you can specify a model name manually.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Model
      </label>
      
      <select
        id="model"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {!value && (
          <option value="">Select a model</option>
        )}
        {availableModels.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>

      {/* Model Info */}
      {value && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Selected: {value}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {getModelDescription(provider, value)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Provider-specific help */}
      {provider === 'ollama' && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-1">Available models depend on what you've pulled locally.</p>
          <p className="text-xs">
            Pull a model: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">ollama pull {availableModels[0]}</code>
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get model descriptions
function getModelDescription(provider: AIProviderType, model: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    openai: {
      'gpt-4': 'Most capable model, best for complex tasks',
      'gpt-4-turbo': 'Faster GPT-4 with improved performance',
      'gpt-3.5-turbo': 'Fast and efficient for most tasks',
    },
    anthropic: {
      'claude-3-opus-20240229': 'Most powerful model for complex tasks',
      'claude-3-sonnet-20240229': 'Balanced performance and speed',
      'claude-3-haiku-20240307': 'Fastest model for simple tasks',
    },
    ollama: {
      'llama2': 'Meta\'s open-source language model',
      'mistral': 'High-performance open model',
      'codellama': 'Specialized for code generation',
      'phi': 'Compact and efficient model',
    },
    mock: {
      'mock-model': 'Demo model with pre-defined responses',
    },
  };

  return descriptions[provider]?.[model] || 'AI language model';
}

// Made with Bob

'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const providerInfo = AI_PROVIDERS[provider];
  const suggestedModels = customModels.length > 0 ? customModels : providerInfo.defaultModels;

  // Filter suggestions based on input
  const filteredSuggestions = suggestedModels.filter(model =>
    model.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  };

  const handleSelectSuggestion = (model: string) => {
    setInputValue(model);
    onChange(model);
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        onChange(inputValue);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelectSuggestion(filteredSuggestions[focusedIndex]);
        } else {
          onChange(inputValue);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Model
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id="model"
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={`Enter model name (e.g., ${suggestedModels[0] || 'model-name'})`}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />

        {/* Autocomplete Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && !disabled && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            <div className="py-1">
              {filteredSuggestions.map((model, index) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelectSuggestion(model)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    index === focusedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{model}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {getModelDescription(provider, model)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {suggestedModels.length > 0 ? (
          <>
            <span className="font-medium">Suggested models:</span> {suggestedModels.slice(0, 3).join(', ')}
            {suggestedModels.length > 3 && ` and ${suggestedModels.length - 3} more`}
          </>
        ) : (
          'Enter any model name supported by your provider'
        )}
      </div>

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
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Ollama Models</p>
          <p className="text-xs mb-2">Enter the name of any model you've pulled locally.</p>
          <p className="text-xs">
            Example: <code className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-blue-200 dark:border-blue-700">ollama pull llama2</code>
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

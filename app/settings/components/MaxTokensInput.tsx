'use client';

import { useState } from 'react';

interface MaxTokensInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function MaxTokensInput({
  value,
  onChange,
  disabled = false,
}: MaxTokensInputProps) {
  const [hasError, setHasError] = useState(false);

  const handleChange = (raw: string) => {
    const parsed = Number(raw);

    if (raw.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      setHasError(true);
      return;
    }

    setHasError(false);
    onChange(Math.floor(parsed));
  };

  return (
    <div className="space-y-2">
      <label htmlFor="max-tokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Max Tokens
      </label>

      <input
        id="max-tokens"
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5
          bg-white dark:bg-gray-700
          border rounded-lg
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${hasError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}
        `}
        aria-invalid={hasError}
        aria-describedby="max-tokens-help"
      />

      {hasError ? (
        <p id="max-tokens-help" className="text-sm text-red-600 dark:text-red-400">
          Max tokens must be a positive number.
        </p>
      ) : (
        <p id="max-tokens-help" className="text-xs text-gray-600 dark:text-gray-400">
          Maximum number of tokens to generate in a response.
        </p>
      )}
    </div>
  );
}

// Made with Bob

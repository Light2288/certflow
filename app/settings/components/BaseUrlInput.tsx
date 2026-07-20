'use client';

interface BaseUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function BaseUrlInput({
  value,
  onChange,
  disabled = false,
}: BaseUrlInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="base-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Base URL
      </label>

      <input
        id="base-url"
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="http://localhost:11434"
        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-describedby="base-url-help"
      />

      <p id="base-url-help" className="text-xs text-gray-600 dark:text-gray-400">
        Optional. Point Ollama or a custom provider at a specific host (e.g. <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">http://localhost:11434</code>). Leave blank to use the provider default.
      </p>
    </div>
  );
}

// Made with Bob

'use client';

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function TemperatureSlider({
  value,
  onChange,
  disabled = false,
}: TemperatureSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Temperature
        </label>
        <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
          {value}
        </span>
      </div>

      <input
        id="temperature"
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-describedby="temperature-help"
      />

      <p id="temperature-help" className="text-xs text-gray-600 dark:text-gray-400">
        Controls randomness. Lower values are more focused and deterministic; higher values are more creative.
      </p>
    </div>
  );
}

// Made with Bob

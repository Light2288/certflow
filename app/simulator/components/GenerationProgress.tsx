'use client';

import type { GenerationStats } from '@/lib/ai/generator';
import type { GenerationStage } from '@/lib/quiz/use-question-pool';

interface GenerationProgressProps {
  stage: Extract<GenerationStage, 'drafting' | 'validating' | 'mixing'>;
  stats?: GenerationStats | null;
  onCancel: () => void;
}

const STAGES: Array<{
  id: GenerationProgressProps['stage'];
  label: string;
  description: string;
}> = [
  { id: 'drafting', label: 'Drafting', description: 'Asking the AI to draft new questions' },
  { id: 'validating', label: 'Validating', description: 'Scoring each candidate for quality' },
  { id: 'mixing', label: 'Mixing', description: 'Blending curated and generated questions' },
];

export default function GenerationProgress({
  stage,
  stats,
  onCancel,
}: GenerationProgressProps) {
  const activeIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
      <div className="text-center mb-8">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Preparing your questions
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Generating and validating AI questions to expand your quiz pool.
        </p>
      </div>

      <ol className="space-y-3 mb-8">
        {STAGES.map((s, index) => {
          const isActive = s.id === stage;
          const isDone = index < activeIndex;
          return (
            <li
              key={s.id}
              data-testid={`stage-${s.id}`}
              data-active={isActive ? 'true' : 'false'}
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : isDone
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {isDone ? '✓' : index + 1}
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{s.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {stats && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 text-sm text-gray-700 dark:text-gray-300">
          <p>
            Approved <span className="font-semibold">{stats.approved}</span>, flagged{' '}
            <span className="font-semibold">{stats.flagged}</span>, rejected{' '}
            <span className="font-semibold">{stats.rejected}</span> of{' '}
            <span className="font-semibold">{stats.produced}</span> produced.
          </p>
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import type { TopicPerformance } from '@/lib/progress/types';

interface TopicPerformanceCardProps {
  performance: TopicPerformance;
  topicName: string;
}

const TREND_DISPLAY: Record<
  TopicPerformance['trend'],
  { icon: string; classes: string }
> = {
  up: { icon: '▲', classes: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  down: { icon: '▼', classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  flat: { icon: '▬', classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

export default function TopicPerformanceCard({
  performance,
  topicName,
}: TopicPerformanceCardProps) {
  const { trend, attempted, correct, averageScore, topicId } = performance;
  const trendDisplay = TREND_DISPLAY[trend];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {topicName}
        </h3>
        <span
          aria-label={`Trend: ${trend}`}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${trendDisplay.classes}`}
        >
          {trendDisplay.icon} {trend}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {averageScore}%
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          average score
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {correct} / {attempted} correct
      </p>

      <Link
        href={`/simulator?topic=${topicId}`}
        className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        Practice this topic →
      </Link>
    </div>
  );
}

// Made with Bob

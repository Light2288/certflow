'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadCertification, getTopicById } from '@/lib/loaders/certification-loader';
import { ProgressStorage } from '@/lib/progress/progress-storage';
import { rankWeakTopics } from '@/lib/progress/aggregate';
import TopicPerformanceCard from './components/TopicPerformanceCard';
import type { CertificationData } from '@/lib/types/certification';
import type { UserProgress } from '@/lib/progress/types';

const CERT_ID = 'aws-ml';

export default function ProgressPage() {
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadCertification(CERT_ID);
        setCertificationData(data);
        setProgress(ProgressStorage.getProgress(CERT_ID));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress');
        console.error('Error loading progress:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const topicName = (topicId: string): string => {
    if (certificationData) {
      const topic = getTopicById(topicId, certificationData.topics);
      if (topic) return topic.name;
    }
    return topicId;
  };

  const weakTopics = progress ? rankWeakTopics(progress.topicPerformance) : [];
  const allTopics = progress ? Object.values(progress.topicPerformance) : [];
  const recentSessions = progress
    ? [...progress.sessions]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 10)
    : [];
  const hasProgress = (progress?.sessions.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Progress</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Track your performance and spot weak areas to practise next
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading progress...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !hasProgress && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              No progress yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Complete a quiz in the simulator and your per-topic performance will
              show up here.
            </p>
            <Link
              href="/simulator"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start a quiz
            </Link>
          </div>
        )}

        {/* Progress Content */}
        {!loading && !error && hasProgress && (
          <div className="space-y-10">
            {/* Weak Topics */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Weak Topics
              </h2>
              {weakTopics.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Not enough data yet — keep practising to surface weak areas.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {weakTopics.map((tp) => (
                    <TopicPerformanceCard
                      key={tp.topicId}
                      performance={tp}
                      topicName={topicName(tp.topicId)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Recent Sessions */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Sessions
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {recentSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(session.completedAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.correctAnswers}/{session.totalQuestions} correct
                    </span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {session.score}%
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* All Topics Breakdown */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                All Topics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTopics.map((tp) => (
                  <TopicPerformanceCard
                    key={tp.topicId}
                    performance={tp}
                    topicName={topicName(tp.topicId)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob

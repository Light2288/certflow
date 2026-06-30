'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadCertificationTopics } from '@/lib/loaders/certification-loader';
import { useSettings } from '@/lib/contexts/settings-context';
import TopicCard from './components/TopicCard';
import type { Topic } from '@/lib/types/certification';

export default function TopicsPage() {
  const { currentCertificationId } = useSettings();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'order' | 'weight' | 'name'>('order');

  // Load topics on mount
  useEffect(() => {
    async function fetchTopics() {
      try {
        setLoading(true);
        setError(null);
        const topicsData = await loadCertificationTopics(currentCertificationId);
        setTopics(topicsData.topics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load topics');
        console.error('Error loading topics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, [currentCertificationId]);

  // Filter topics based on search query
  const filteredTopics = topics.filter((topic) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      topic.name.toLowerCase().includes(query) ||
      topic.description.toLowerCase().includes(query)
    );
  });

  // Sort topics
  const sortedTopics = [...filteredTopics].sort((a, b) => {
    switch (sortBy) {
      case 'weight':
        return b.weight - a.weight;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'order':
      default:
        return a.order - b.order;
    }
  });

  // Calculate statistics
  const totalSubtopics = topics.reduce((sum, topic) => sum + topic.subtopics.length, 0);

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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Topic Map
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Explore certification topics and master key concepts
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading topics...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Failed to load topics
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Topics Content */}
        {!loading && !error && (
          <>
            {/* Statistics Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white mr-2">
                      {topics.length}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {topics.length === 1 ? 'Topic' : 'Topics'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white mr-2">
                      {totalSubtopics}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {totalSubtopics === 1 ? 'Subtopic' : 'Subtopics'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Sort Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="sm:w-48">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'order' | 'weight' | 'name')}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="order">Sort by Order</option>
                    <option value="weight">Sort by Weight</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>

                {/* Clear Button */}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Topics Grid */}
            {sortedTopics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedTopics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No topics found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Try adjusting your search query.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Made with Bob
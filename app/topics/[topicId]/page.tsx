'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  loadCertificationTopics,
  loadCertificationQuestions,
  getTopicById,
  countQuestionsBySubtopic,
} from '@/lib/loaders/certification-loader';
import { useSettings } from '@/lib/contexts/settings-context';
import type { Topic } from '@/lib/types/certification';
import DeepDiveButton from './components/DeepDiveButton';
import { markdownComponents } from './components/markdown-components';

export default function TopicDetailPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const { currentCertificationId } = useSettings();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [subtopicCounts, setSubtopicCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTopic() {
      try {
        setLoading(true);
        setError(null);
        
        // Load all topics and questions in parallel.
        const [topicsData, questionsData] = await Promise.all([
          loadCertificationTopics(currentCertificationId),
          loadCertificationQuestions(currentCertificationId),
        ]);

        // Find the specific topic
        const foundTopic = getTopicById(topicId, topicsData);
        
        if (!foundTopic) {
          setError('Topic not found');
        } else {
          setTopic(foundTopic);
          setSubtopicCounts(countQuestionsBySubtopic(questionsData));
        }
      } catch (err) {
        console.error('Failed to load topic:', err);
        setError('Failed to load topic details');
      } finally {
        setLoading(false);
      }
    }

    fetchTopic();
  }, [topicId, currentCertificationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading topic details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              {error || 'Topic not found'}
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">
              The topic you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
            </p>
            <Link
              href="/topics"
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              ← Back to Topics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href="/topics"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Topics
          </Link>
        </nav>

        {/* Topic Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {topic.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {topic.description}
              </p>
            </div>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-4 flex-shrink-0">
              {topic.weight}%
            </span>
          </div>

          {/* Topic Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium">
                {topic.subtopics.length} {topic.subtopics.length === 1 ? 'Subtopic' : 'Subtopics'}
              </span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">{topic.weight}% of exam</span>
            </div>
          </div>

          {/* Deep Dive Button */}
          <div className="mt-6">
            <DeepDiveButton topic={topic} />
          </div>
        </div>

        {/* Subtopics */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Subtopics
          </h2>
          
          {topic.subtopics.map((subtopic, index) => {
            const questionCount =
              subtopicCounts[topic.id]?.[subtopic.id] ?? 0;
            const difficultyStyles: Record<string, string> = {
              easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
              medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
              hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            };
            return (
            <div
              key={subtopic.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Subtopic Header */}
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center font-semibold mr-4">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {subtopic.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {subtopic.description}
                  </p>

                  {/* Metadata badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {subtopic.difficulty && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyStyles[subtopic.difficulty]}`}
                      >
                        {subtopic.difficulty}
                      </span>
                    )}
                    {subtopic.estimatedStudyMinutes !== undefined && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {subtopic.estimatedStudyMinutes} min
                      </span>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content (markdown) */}
              {subtopic.content && (
                <div className="ml-12 mb-4 prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {subtopic.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Key Points */}
              {subtopic.keyPoints && subtopic.keyPoints.length > 0 && (
                <div className="ml-12">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Key Points
                  </h4>
                  <ul className="space-y-2">
                    {subtopic.keyPoints.map((point, pointIndex) => (
                      <li
                        key={pointIndex}
                        className="flex items-start text-gray-600 dark:text-gray-400"
                      >
                        <svg
                          className="w-5 h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* References */}
              {subtopic.references && subtopic.references.length > 0 && (
                <div className="ml-12 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    References
                  </h4>
                  <ul className="space-y-1">
                    {subtopic.references.map((ref, refIndex) => (
                      <li key={refIndex} className="flex items-start">
                        <svg
                          className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0 mt-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <a
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm"
                        >
                          {ref}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/simulator"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Practice Questions
          </Link>
          
          <Link
            href="/tutor"
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Ask AI Tutor
          </Link>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
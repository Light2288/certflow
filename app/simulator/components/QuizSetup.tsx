'use client';

import { useState } from 'react';
import type { Question, Topic } from '@/lib/types/certification';

interface QuizSetupProps {
  questions: Question[];
  topics: Topic[];
  onStartQuiz: (selectedQuestions: Question[]) => void;
}

export default function QuizSetup({ questions, topics, onStartQuiz }: QuizSetupProps) {
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const maxQuestions = questions.length;

  const handleStartQuiz = () => {
    let filteredQuestions = [...questions];

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(
        (q) => q.difficulty === selectedDifficulty
      );
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filteredQuestions = filteredQuestions.filter(
        (q) => q.topicId === selectedTopic
      );
    }

    // Shuffle and select questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    if (selected.length === 0) {
      alert('No questions match the selected filters. Please adjust your selection.');
      return;
    }

    onStartQuiz(selected);
  };

  // Calculate available questions based on filters
  const getAvailableQuestions = () => {
    let filtered = questions;

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((q) => q.difficulty === selectedDifficulty);
    }

    if (selectedTopic !== 'all') {
      filtered = filtered.filter((q) => q.topicId === selectedTopic);
    }

    return filtered.length;
  };

  const availableQuestions = getAvailableQuestions();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Configure Your Quiz
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your practice session by selecting the number of questions, difficulty level, and topic.
          </p>
        </div>

        {/* Question Count */}
        <div>
          <label
            htmlFor="question-count"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Number of Questions: {questionCount}
          </label>
          <input
            id="question-count"
            type="range"
            min="5"
            max={Math.min(maxQuestions, 50)}
            step="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>5</span>
            <span>{Math.min(maxQuestions, 50)}</span>
          </div>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Difficulty Level
          </label>
          <select
            id="difficulty"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Topic Filter */}
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Topic
          </label>
          <select
            id="topic"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        {/* Available Questions Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {availableQuestions} question{availableQuestions !== 1 ? 's' : ''} available
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                {availableQuestions < questionCount
                  ? `Only ${availableQuestions} questions match your filters. The quiz will include all available questions.`
                  : `Your quiz will include ${Math.min(questionCount, availableQuestions)} randomly selected questions.`}
              </p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartQuiz}
          disabled={availableQuestions === 0}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          {availableQuestions === 0 ? 'No Questions Available' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}

// Made with Bob

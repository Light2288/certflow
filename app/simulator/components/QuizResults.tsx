'use client';

import type { QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import type { Question } from '@/lib/types/certification';

interface QuizResultsProps {
  results: QuizSessionResult;
  onReviewAnswers: () => void;
  onStartNew: () => void;
}

export default function QuizResults({
  results,
  onReviewAnswers,
  onStartNew,
}: QuizResultsProps) {
  const passed = results.score >= 70; // Assuming 70% is passing
  const scoreColor = passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const scoreBgColor = passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  const scoreBorderColor = passed ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800';

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border-2 ${scoreBorderColor}`}>
        <div className="text-center space-y-4">
          {/* Pass/Fail Badge */}
          <div className="flex justify-center">
            {passed ? (
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Score */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {passed
                ? 'You passed the quiz! Great job!'
                : 'You need 70% or higher to pass. Review your answers and try again.'}
            </p>
          </div>

          {/* Score Display */}
          <div className={`inline-block px-8 py-4 rounded-lg ${scoreBgColor}`}>
            <div className={`text-6xl font-bold ${scoreColor}`}>{results.score}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your Score</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {results.totalQuestions}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Questions</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {results.correctAnswers}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Correct</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {results.incorrectAnswers}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Incorrect</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatTime(results.timeSpent)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Time Spent</p>
          </div>
        </div>
      </div>

      {/* Unanswered Warning */}
      {results.unanswered > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {results.unanswered} question{results.unanswered !== 1 ? 's' : ''} left unanswered
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Unanswered questions are counted as incorrect.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onReviewAnswers}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Review Answers
        </button>
        <button
          onClick={onStartNew}
          className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Start New Quiz
        </button>
      </div>
    </div>
  );
}

// Made with Bob

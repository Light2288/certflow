'use client';

import { useState, useEffect } from 'react';
import type { Question } from '@/lib/types/certification';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer?: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onAnswerChange,
  onPrevious,
  onNext,
  onSubmit,
  canGoPrevious,
  canGoNext,
  isLastQuestion,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>(
    currentAnswer || (question.type === 'multi-select' ? [] : '')
  );

  // Update local state when currentAnswer prop changes (e.g., when navigating)
  useEffect(() => {
    setSelectedAnswer(currentAnswer || (question.type === 'multi-select' ? [] : ''));
  }, [currentAnswer, question.type]);

  const handleSingleSelect = (optionId: string) => {
    setSelectedAnswer(optionId);
    onAnswerChange(optionId);
  };

  const handleMultiSelect = (optionId: string) => {
    const currentSelections = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    const newSelections = currentSelections.includes(optionId)
      ? currentSelections.filter((id) => id !== optionId)
      : [...currentSelections, optionId];

    setSelectedAnswer(newSelections);
    onAnswerChange(newSelections);
  };

  const isSelected = (optionId: string): boolean => {
    if (question.type === 'multi-select') {
      return Array.isArray(selectedAnswer) && selectedAnswer.includes(optionId);
    }
    return selectedAnswer === optionId;
  };

  const hasAnswer = question.type === 'multi-select'
    ? Array.isArray(selectedAnswer) && selectedAnswer.length > 0
    : selectedAnswer !== '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Question Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Question {questionNumber} of {totalQuestions}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  question.difficulty === 'easy'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : question.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {question.type === 'multi-select' ? 'Multiple Answers' : 'Single Answer'}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
              {question.question}
            </h3>
          </div>
        </div>

        {question.type === 'multi-select' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Select all answers that apply
            </p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {question.options.map((option) => {
          const selected = isSelected(option.id);

          return (
            <label
              key={option.id}
              className={`
                flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                ${
                  selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <div className="flex items-center h-6">
                {question.type === 'multi-select' ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleMultiSelect(option.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                ) : (
                  <input
                    type="radio"
                    checked={selected}
                    onChange={() => handleSingleSelect(option.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                )}
              </div>
              <div className="ml-3 flex-1">
                <span
                  className={`text-base ${
                    selected
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.text}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {!hasAnswer && (
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                Select an answer
              </span>
            )}
            {hasAnswer && (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {isLastQuestion ? (
            <button
              onClick={onSubmit}
              className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob

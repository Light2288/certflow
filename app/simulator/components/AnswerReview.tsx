'use client';

import type { Question } from '@/lib/types/certification';
import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';

interface AnswerReviewProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  onClose: () => void;
}

export default function AnswerReview({ questions, answers, onClose }: AnswerReviewProps) {
  const getAnswerStatus = (question: Question) => {
    const userAnswer = answers[question.id];
    if (!userAnswer) return 'unanswered';

    const isCorrect = QuizSessionManager.checkAnswer(question, userAnswer);
    return isCorrect ? 'correct' : 'incorrect';
  };

  const getOptionLabel = (question: Question, optionId: string): string => {
    const option = question.options.find((opt) => opt.id === optionId);
    return option?.text || optionId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Answer Review</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review your answers and see detailed explanations
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Questions Review */}
      {questions.map((question, index) => {
        const status = getAnswerStatus(question);
        const userAnswer = answers[question.id];
        const correctAnswer = question.correctAnswer;

        return (
          <div
            key={question.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 ${
              status === 'correct'
                ? 'border-green-200 dark:border-green-800'
                : status === 'incorrect'
                ? 'border-red-200 dark:border-red-800'
                : 'border-yellow-200 dark:border-yellow-800'
            }`}
          >
            {/* Question Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    Question {index + 1}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'correct'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : status === 'incorrect'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}
                  >
                    {status === 'correct' ? '✓ Correct' : status === 'incorrect' ? '✗ Incorrect' : '− Unanswered'}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {question.question}
              </h3>
            </div>

            {/* Options */}
            <div className="p-6 space-y-3">
              {question.options.map((option) => {
                const isCorrectOption = Array.isArray(correctAnswer)
                  ? correctAnswer.includes(option.id)
                  : correctAnswer === option.id;

                const isUserSelection = Array.isArray(userAnswer)
                  ? userAnswer.includes(option.id)
                  : userAnswer === option.id;

                return (
                  <div
                    key={option.id}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrectOption
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : isUserSelection
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCorrectOption ? (
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : isUserSelection ? (
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="w-5 h-5" />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p
                          className={`text-base ${
                            isCorrectOption || isUserSelection
                              ? 'font-medium text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option.text}
                        </p>
                        {isUserSelection && !isCorrectOption && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Your answer
                          </p>
                        )}
                        {isCorrectOption && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Correct answer
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Explanation
              </h4>
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                    Why this is correct:
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {question.explanation.correct}
                  </p>
                </div>

                {question.explanation.whyOthersWrong && Object.keys(question.explanation.whyOthersWrong).length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                      Why others are wrong:
                    </p>
                    <ul className="space-y-1">
                      {Object.entries(question.explanation.whyOthersWrong).map(([optionId, explanation]) => (
                        <li key={optionId} className="text-sm text-red-700 dark:text-red-400">
                          <span className="font-medium">{getOptionLabel(question, optionId)}:</span> {explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Close Button */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Results
        </button>
      </div>
    </div>
  );
}

// Made with Bob

'use client';

import { useState } from 'react';
import type { Question } from '@/lib/types/certification';
import { getGenerationMeta, isAIGenerated, formatValidatorScore } from '@/lib/quiz/question-provenance';
import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';

type ExamModality = 'answer-all' | 'immediate';

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
  /** Whether this question is flagged for review. */
  isFlagged?: boolean;
  /** Toggle the mark-for-review flag for this question. */
  onToggleFlag?: () => void;
  /** Exam modality: 'answer-all' (default) or 'immediate' feedback. */
  modality?: ExamModality;
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
  isFlagged = false,
  onToggleFlag,
  modality = 'answer-all',
}: QuestionCardProps) {
  const derivedAnswer = currentAnswer || (question.type === 'multi-select' ? [] : '');
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>(derivedAnswer);

  // Reset local state when the answer prop or question type changes (e.g. when
  // navigating between questions). Deriving during render instead of in an
  // effect avoids a cascading re-render and satisfies react-hooks lint rules.
  const [prevKey, setPrevKey] = useState<string>(
    `${Array.isArray(currentAnswer) ? currentAnswer.join(',') : currentAnswer ?? ''}|${question.type}`
  );
  const currentKey = `${Array.isArray(currentAnswer) ? currentAnswer.join(',') : currentAnswer ?? ''}|${question.type}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setSelectedAnswer(derivedAnswer);
  }

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

  // In immediate mode the answer + explanation are revealed once the user has
  // answered. Navigation is never gated (Next/Submit stay active in both modes).
  const isImmediate = modality === 'immediate';
  const revealed = isImmediate && hasAnswer;
  const isCorrect = revealed
    ? QuizSessionManager.checkAnswer(question, selectedAnswer)
    : false;
  const correctAnswer = question.correctAnswer;
  const advanceDisabled = !canGoNext;

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
              {isAIGenerated(question) ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  AI-generated
                  {getGenerationMeta(question) && (
                    <span className="ml-1 font-semibold">
                      {formatValidatorScore(getGenerationMeta(question)!.validatorScore.overall)}/10
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  Curated
                </span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
              {question.question}
            </h3>
          </div>
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              aria-pressed={isFlagged}
              className={`ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isFlagged
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.28a1 1 0 01.948.684l.298.895a1 1 0 00.948.684H19a2 2 0 012 2v6a2 2 0 01-2 2h-6.28a1 1 0 01-.948-.684l-.298-.895A1 1 0 0010.28 17H3z" />
              </svg>
              {isFlagged ? 'Unflag' : 'Flag for review'}
            </button>
          )}
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
          const isCorrectOption = Array.isArray(correctAnswer)
            ? correctAnswer.includes(option.id)
            : correctAnswer === option.id;

          // When revealed (immediate mode), color options by correctness.
          let optionClasses: string;
          if (revealed && isCorrectOption) {
            optionClasses = 'border-green-500 bg-green-50 dark:bg-green-900/20';
          } else if (revealed && selected && !isCorrectOption) {
            optionClasses = 'border-red-500 bg-red-50 dark:bg-red-900/20';
          } else if (selected) {
            optionClasses = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
          } else {
            optionClasses =
              'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50';
          }

          return (
            <label
              key={option.id}
              className={`
                flex items-start p-4 border-2 rounded-lg transition-all
                ${revealed ? 'cursor-default' : 'cursor-pointer'}
                ${optionClasses}
              `}
            >
              <div className="flex items-center h-6">
                {question.type === 'multi-select' ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={revealed}
                    onChange={() => handleMultiSelect(option.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                ) : (
                  <input
                    type="radio"
                    checked={selected}
                    disabled={revealed}
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

      {/* Immediate feedback: correctness + explanation */}
      {revealed && (
        <div className="px-6 pb-6 space-y-3">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isCorrect
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
              Why this is correct:
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              {question.explanation.correct}
            </p>
          </div>
          {question.explanation.whyOthersWrong &&
            Object.keys(question.explanation.whyOthersWrong).length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  Why others are wrong:
                </p>
                <ul className="space-y-1">
                  {Object.entries(question.explanation.whyOthersWrong).map(
                    ([optionId, explanation]) => {
                      const opt = question.options.find((o) => o.id === optionId);
                      return (
                        <li key={optionId} className="text-sm text-red-700 dark:text-red-400">
                          <span className="font-medium">{opt?.text ?? optionId}:</span>{' '}
                          {explanation}
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            )}
        </div>
      )}

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
              disabled={advanceDisabled}
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

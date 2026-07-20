'use client';

import { useState } from 'react';

type ExamModality = 'answer-all' | 'immediate';

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  /** 0-based indices of questions that have an answer. */
  answeredIndices: number[];
  /** 0-based indices of questions the user has visited. */
  visitedIndices: number[];
  /** 0-based indices of questions flagged for review. */
  flaggedIndices?: number[];
  /** Exam modality: controls whether cells show correctness (immediate). */
  modality?: ExamModality;
  /** 0-based indices answered correctly (used in immediate mode). */
  correctIndices?: number[];
  /** 0-based indices answered incorrectly (used in immediate mode). */
  incorrectIndices?: number[];
  /** Jump to a question by its 0-based index. */
  onQuestionSelect?: (index: number) => void;
  /** Finish the quiz early (submits with unanswered questions left blank). */
  onFinish?: () => void;
  /** Number of curated (pool) questions in this quiz, for the source breakdown. */
  curatedCount?: number;
  /** Number of AI-generated questions in this quiz, for the source breakdown. */
  aiGeneratedCount?: number;
}

export default function QuizProgress({
  currentQuestion,
  totalQuestions,
  answeredCount,
  answeredIndices,
  visitedIndices,
  flaggedIndices = [],
  modality = 'answer-all',
  correctIndices = [],
  incorrectIndices = [],
  onQuestionSelect,
  onFinish,
  curatedCount,
  aiGeneratedCount,
}: QuizProgressProps) {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const answeredPercentage = (answeredCount / totalQuestions) * 100;

  const answeredSet = new Set(answeredIndices);
  const visitedSet = new Set(visitedIndices);
  const flaggedSet = new Set(flaggedIndices);
  const correctSet = new Set(correctIndices);
  const incorrectSet = new Set(incorrectIndices);
  const hasFlagged = flaggedSet.size > 0;
  const isImmediate = modality === 'immediate';

  const [flaggedOnly, setFlaggedOnly] = useState(false);
  // When filtering, only show flagged indices; otherwise every question index.
  const visibleIndices = Array.from({ length: totalQuestions }, (_, i) => i).filter(
    (i) => (flaggedOnly ? flaggedSet.has(i) : true)
  );

  const handleFinish = () => {
    if (!onFinish) return;
    const unanswered = totalQuestions - answeredCount;
    const message =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${
            unanswered === 1 ? '' : 's'
          }. Finish the quiz anyway?`
        : 'Finish the quiz and see your results?';
    if (typeof window === 'undefined' || window.confirm(message)) {
      onFinish();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="space-y-4">
        {/* Question Counter */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question {currentQuestion} of {totalQuestions}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {answeredCount} answered
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(answeredPercentage)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
          </div>
        </div>

        {/* Question source breakdown (curated vs AI-generated) */}
        {(curatedCount != null || aiGeneratedCount != null) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
              {curatedCount ?? 0} curated
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {aiGeneratedCount ?? 0} AI-generated
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        {/* Question Status Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Question Status
            </p>
            {hasFlagged && (
              <button
                type="button"
                onClick={() => setFlaggedOnly((v) => !v)}
                aria-pressed={flaggedOnly}
                className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
                  flaggedOnly
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                {flaggedOnly ? 'Show all' : 'Show flagged only'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {visibleIndices.map((i) => {
              const questionNumber = i + 1;
              const isCurrent = questionNumber === currentQuestion;
              const isAnswered = answeredSet.has(i);
              const isVisited = visitedSet.has(i);
              const isFlagged = flaggedSet.has(i);
              const isCorrect = correctSet.has(i);
              const isIncorrect = incorrectSet.has(i);

              // Style precedence: current > correctness/answered > visited > default.
              // In immediate mode, answered cells are colored by correctness
              // (green = correct, red = incorrect). In answer-all mode, answered
              // cells use a neutral color (indigo) reserved from correctness.
              let stateClasses: string;
              if (isCurrent) {
                stateClasses =
                  'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800';
              } else if (isImmediate && isCorrect) {
                stateClasses = 'bg-green-500 text-white';
              } else if (isImmediate && isIncorrect) {
                stateClasses = 'bg-red-500 text-white';
              } else if (isAnswered) {
                stateClasses = 'bg-indigo-500 text-white';
              } else if (isVisited) {
                stateClasses =
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
              } else {
                stateClasses =
                  'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
              }

              const statusLabel = isCurrent
                ? ' (current)'
                : isImmediate && isCorrect
                ? ' (correct)'
                : isImmediate && isIncorrect
                ? ' (incorrect)'
                : isAnswered
                ? ' (answered)'
                : isVisited
                ? ' (visited)'
                : '';
              const flagLabel = isFlagged ? ' (flagged)' : '';

              return (
                <button
                  key={i}
                  type="button"
                  onClick={onQuestionSelect ? () => onQuestionSelect(i) : undefined}
                  disabled={!onQuestionSelect}
                  className={`
                    relative aspect-square rounded flex items-center justify-center text-xs font-medium
                    ${onQuestionSelect ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400' : 'cursor-default'}
                    ${stateClasses}
                  `}
                  title={`Question ${questionNumber}${statusLabel}${flagLabel}`}
                >
                  {questionNumber}
                  {isFlagged && (
                    <span
                      data-flag-marker
                      aria-hidden
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-gray-800"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-gray-600 dark:text-gray-400">Current</span>
          </div>
          {isImmediate ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Correct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-gray-600 dark:text-gray-400">Answered</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/40" />
            <span className="text-gray-600 dark:text-gray-400">Visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" />
            <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
          </div>
          {hasFlagged && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">Flagged</span>
            </div>
          )}
        </div>

        {/* Finish early */}
        {onFinish && (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Finish quiz
          </button>
        )}
      </div>
    </div>
  );
}

// Made with Bob

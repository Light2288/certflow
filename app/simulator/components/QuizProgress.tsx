interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
}

export default function QuizProgress({
  currentQuestion,
  totalQuestions,
  answeredCount,
}: QuizProgressProps) {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const answeredPercentage = (answeredCount / totalQuestions) * 100;

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
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question Status
          </p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const questionNumber = i + 1;
              const isCurrent = questionNumber === currentQuestion;
              const isAnswered = i < answeredCount;

              return (
                <div
                  key={i}
                  className={`
                    aspect-square rounded flex items-center justify-center text-xs font-medium
                    ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                        : isAnswered
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                  title={`Question ${questionNumber}${isCurrent ? ' (current)' : ''}${
                    isAnswered ? ' (answered)' : ''
                  }`}
                >
                  {questionNumber}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-gray-600 dark:text-gray-400">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" />
            <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

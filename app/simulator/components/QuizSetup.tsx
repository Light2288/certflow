'use client';

import { useState } from 'react';
import type { Question, Topic, DifficultyLevel } from '@/lib/types/certification';
import { useSettings } from '@/lib/contexts/settings-context';

/** Exam modality: reveal results at the end, or per-question immediate feedback. */
export type ExamModality = 'answer-all' | 'immediate';

/** Config emitted when the user starts a quiz. The page/hook owns pool building. */
export interface QuizStartConfig {
  /** Curated questions matching the filters (used directly when augment is off). */
  questions: Question[];
  count: number;
  difficulty: DifficultyLevel | 'all';
  topicId: string;
  augment: boolean;
  /** Target percentage (0–100) of AI-generated questions in the blend. */
  targetAiPercent: number;
  /** Exam modality chosen by the user. */
  modality: ExamModality;
  /** Whether the exam is timed (live countdown, auto-submit at zero). */
  timed: boolean;
  /** Whether AI-generated questions are quality-validated by the model. */
  validate: boolean;
}

interface QuizSetupProps {
  questions: Question[];
  topics: Topic[];
  onStartQuiz: (config: QuizStartConfig) => void;
  /** Optional topic id to pre-select (e.g. from a `?topic=` deeplink). */
  initialTopicId?: string;
  /** The certification's real exam question count, used as the slider default. */
  examQuestionCount?: number;
}

/** Fallback bounds when the cert exam question count is unavailable. */
const FALLBACK_DEFAULT_COUNT = 100;
const FALLBACK_MAX_COUNT = FALLBACK_DEFAULT_COUNT * 2;

/** Slider bounds. */
const SLIDER_MIN = 5;
const SLIDER_STEP = 5;

/**
 * Resolve the augmented slider maximum: twice the cert's exam question count,
 * or a fixed fallback when that data is unavailable.
 */
function resolveAugmentedMax(examQuestionCount: number | undefined): number {
  if (Number.isFinite(examQuestionCount ?? NaN) && (examQuestionCount ?? 0) > 0) {
    return (examQuestionCount as number) * 2;
  }
  return FALLBACK_MAX_COUNT;
}

/**
 * Resolve the initial slider count. When the cert provides a valid exam
 * question count, clamp/snap it into [min, max]. Otherwise fall back to the
 * fallback default count (clamped into range).
 */
function resolveInitialCount(
  examQuestionCount: number | undefined,
  min: number,
  max: number,
  step: number
): number {
  const hasExamCount =
    Number.isFinite(examQuestionCount ?? NaN) && (examQuestionCount ?? 0) > 0;
  const base = hasExamCount
    ? (examQuestionCount as number)
    : Math.min(FALLBACK_DEFAULT_COUNT, max);
  const clamped = Math.min(Math.max(base, min), Math.max(min, max));
  const snapped = Math.round(clamped / step) * step;
  return Math.min(Math.max(snapped, min), Math.max(min, max));
}

export default function QuizSetup({
  questions,
  topics,
  onStartQuiz,
  initialTopicId,
  examQuestionCount,
}: QuizSetupProps) {
  const { settings } = useSettings();
  const isMockProvider = settings.provider === 'mock';

  // Default ON for a real provider, OFF for mock.
  const [augment, setAugment] = useState<boolean>(!isMockProvider);
  // Target % of AI-generated questions in the blend (only meaningful when
  // augmentation is on). 30% mirrors the prior effective default.
  const [targetAiPercent, setTargetAiPercent] = useState<number>(30);
  const [modality, setModality] = useState<ExamModality>('answer-all');
  const [timed, setTimed] = useState<boolean>(true);
  // Quality-validate AI questions with the model (default on). Turning this off
  // is much faster and keeps more questions, but skips the quality gate.
  const [validateAi, setValidateAi] = useState<boolean>(true);

  const maxQuestions = questions.length;
  const augmentedMax = resolveAugmentedMax(examQuestionCount);
  // When augmenting, the slider is bounded by the exam-derived augmented max;
  // otherwise it is capped by the curated pool size (never above the max).
  const sliderMax = augment ? augmentedMax : Math.min(maxQuestions, augmentedMax);

  // Seed the slider from the cert's real exam question count, clamped/snapped to
  // the slider range. The initial slider max reflects the default augment state.
  const initialSliderMax = !isMockProvider
    ? augmentedMax
    : Math.min(maxQuestions, augmentedMax);
  const [questionCount, setQuestionCount] = useState(() =>
    resolveInitialCount(
      examQuestionCount,
      SLIDER_MIN,
      initialSliderMax,
      SLIDER_STEP
    )
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  // Only honour a deeplinked topic id when it matches a known topic.
  const validInitialTopic =
    initialTopicId && topics.some((t) => t.id === initialTopicId)
      ? initialTopicId
      : 'all';
  const [selectedTopic, setSelectedTopic] = useState<string>(validInitialTopic);

  const getAvailableQuestions = () => {
    let filtered = questions;
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((q) => q.difficulty === selectedDifficulty);
    }
    if (selectedTopic !== 'all') {
      filtered = filtered.filter((q) => q.topicId === selectedTopic);
    }
    return filtered;
  };

  const handleStartQuiz = () => {
    const filteredQuestions = getAvailableQuestions();

    if (filteredQuestions.length === 0 && !augment) {
      alert('No questions match the selected filters. Please adjust your selection.');
      return;
    }

    onStartQuiz({
      questions: filteredQuestions,
      count: questionCount,
      difficulty: selectedDifficulty as DifficultyLevel | 'all',
      topicId: selectedTopic,
      augment,
      targetAiPercent,
      modality,
      timed,
      validate: validateAi,
    });
  };

  const availableQuestions = getAvailableQuestions().length;
  const startDisabled = availableQuestions === 0 && !augment;

  // Estimate the curated vs AI-generated split for the info text. Mirrors the
  // pool builder: aim for ~targetAiPercent of the count as AI, fill the rest
  // from the curated pool (bounded by how many actually match the filters).
  const aiEstimate = augment
    ? Math.min(Math.round(questionCount * (targetAiPercent / 100)), questionCount)
    : 0;
  const curatedEstimate = Math.min(
    questionCount - aiEstimate,
    availableQuestions
  );
  // The quiz involves AI generation (and thus a build step) when augmenting
  // with a non-zero AI target, or when the curated pool can't fill the count.
  const willGenerate =
    augment && (aiEstimate > 0 || availableQuestions < questionCount);

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
            max={sliderMax}
            step="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>5</span>
            <span>{sliderMax}</span>
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

        {/* Exam Modality */}
        <div>
          <label
            htmlFor="exam-modality"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Exam Mode
          </label>
          <select
            id="exam-modality"
            value={modality}
            onChange={(e) => setModality(e.target.value as ExamModality)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="answer-all">Answer all, then see results</option>
            <option value="immediate">Immediate feedback + explanation per question</option>
          </select>
        </div>

        {/* Timed Exam Toggle */}
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <input
            id="timed-toggle"
            type="checkbox"
            checked={timed}
            onChange={(e) => setTimed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="timed-toggle" className="flex-1 cursor-pointer">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">
              Timed exam
            </span>
            <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
              Show a live countdown based on the exam duration. The quiz
              auto-submits when time runs out.
            </span>
          </label>
        </div>

        {/* AI Augmentation Toggle */}
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <input
            id="augment-toggle"
            type="checkbox"
            checked={augment}
            onChange={(e) => setAugment(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="augment-toggle" className="flex-1 cursor-pointer">
            <span className="block text-sm font-medium text-gray-900 dark:text-white">
              Augment with AI-generated questions
            </span>
            <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isMockProvider
                ? 'Using the mock provider — generated questions are canned demo content.'
                : 'Fill any gap beyond the curated pool with freshly generated, validated questions.'}
            </span>
          </label>
        </div>

        {/* Target % AI-generated (only meaningful when augmenting) */}
        {augment && (
          <div>
            <label
              htmlFor="target-ai-percent"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Target % AI-generated: {targetAiPercent}%
            </label>
            <input
              id="target-ai-percent"
              type="range"
              min="0"
              max="100"
              step="5"
              value={targetAiPercent}
              onChange={(e) => setTargetAiPercent(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>All curated</span>
              <span>All AI-generated</span>
            </div>

            {/* Cost / time disclaimer */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Generating AI questions can be slow: each one is drafted and
                validated by the model. Keep the share low — around 20–30% at
                most, and generally fewer than 20 AI-generated questions. Higher
                amounts take much longer and, on a paid provider, can use a lot
                of tokens.
              </p>
            </div>

            {/* Validate AI questions toggle */}
            <div className="mt-3 flex items-start gap-3">
              <input
                id="validate-ai-toggle"
                type="checkbox"
                checked={validateAi}
                onChange={(e) => setValidateAi(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="validate-ai-toggle" className="flex-1 cursor-pointer">
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  Validate AI questions
                </span>
                <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Have the model score each generated question for quality
                  (recommended). Turning this off is much faster and keeps more
                  questions, but skips the quality check.
                </span>
              </label>
            </div>
          </div>
        )}

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
                {augment
                  ? `Your quiz should include about ${curatedEstimate} randomly selected question${
                      curatedEstimate === 1 ? '' : 's'
                    } from the existing ones, and ${aiEstimate} AI-generated question${
                      aiEstimate === 1 ? '' : 's'
                    }. Actual AI counts may be lower if the model returns fewer valid questions.`
                  : availableQuestions < questionCount
                  ? `Only ${availableQuestions} questions match your filters. The quiz will include all available questions.`
                  : `Your quiz will include ${Math.min(questionCount, availableQuestions)} randomly selected questions.`}
              </p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartQuiz}
          disabled={startDisabled}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          {startDisabled
            ? 'No Questions Available'
            : willGenerate
            ? 'Create Quiz'
            : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}

// Made with Bob

'use client';

import { useState, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadCertification } from '@/lib/loaders/certification-loader';
import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';
import type { QuizSessionState, QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import { ProgressStorage } from '@/lib/progress/progress-storage';
import type { CertificationData, Question } from '@/lib/types/certification';
import { useSettings } from '@/lib/contexts/settings-context';
import { useQuestionPool } from '@/lib/quiz/use-question-pool';
import { isAIGenerated } from '@/lib/quiz/question-provenance';
import { shuffle } from '@/lib/ai/generator';
import QuizSetup, { type QuizStartConfig, type ExamModality } from './components/QuizSetup';
import GenerationProgress from './components/GenerationProgress';
import QuizProgress from './components/QuizProgress';
import QuizTimer from './components/QuizTimer';
import QuestionCard from './components/QuestionCard';
import QuizResults from './components/QuizResults';
import AnswerReview from './components/AnswerReview';

type ViewMode = 'setup' | 'generating' | 'quiz' | 'results' | 'review';

function SimulatorPageContent() {
  const { settings, currentCertificationId } = useSettings();
  const searchParams = useSearchParams();
  const initialTopicId = searchParams.get('topic') ?? undefined;
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [results, setResults] = useState<QuizSessionResult | null>(null);
  const [startConfig, setStartConfig] = useState<QuizStartConfig | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // Questions built by the generation step, held until the user clicks
  // "Start quiz" on the generating page (null while still generating).
  const [pendingQuestions, setPendingQuestions] = useState<Question[] | null>(null);
  // Seed for reproducible curated selection + generation ordering. Created when
  // the user starts a quiz and carried through into the session.
  const [sessionSeed, setSessionSeed] = useState<string>('');
  // Exam modality chosen at setup, applied to the live QuestionCard.
  const [modality, setModality] = useState<ExamModality>('answer-all');
  // Whether the current quiz is timed (live countdown + auto-submit).
  const [timed, setTimed] = useState<boolean>(false);

  // Track the certification the page is currently showing so we can detect a
  // switch and discard any in-progress quiz cleanly.
  const previousCertRef = useRef<string>(currentCertificationId);

  // Pool hook is driven by the user's setup selection (defaults are harmless
  // before the user starts; build() is only invoked on Start).
  const pool = useQuestionPool({
    certificationData: certificationData ?? EMPTY_CERT_DATA,
    topicId: startConfig?.topicId ?? 'all',
    difficulty: startConfig?.difficulty ?? 'all',
    requestedCount: startConfig?.count ?? 10,
    aiSettings: settings,
    augment: startConfig?.augment ?? false,
    seed: sessionSeed || 'default-seed',
    targetAiPercent: startConfig?.targetAiPercent ?? 70,
    validateAi: startConfig?.validate ?? true,
  });

  // Load certification data on mount
  useEffect(() => {
    loadCertificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCertificationId]);

  // When the certification changes mid-quiz, warn the user and discard the
  // in-progress session so the newly selected certification loads cleanly.
  useEffect(() => {
    if (previousCertRef.current === currentCertificationId) return;
    previousCertRef.current = currentCertificationId;

    const hasActiveQuiz =
      (viewMode === 'quiz' || viewMode === 'generating') && session !== null;

    if (hasActiveQuiz) {
      const discard =
        typeof window === 'undefined' ||
        window.confirm(
          'Switching certification will discard your current quiz. Continue?'
        );
      if (!discard) return;
    }

    // Discard any active session and reset the simulator back to setup.
    QuizSessionManager.clearActiveSession();
    setSession(null);
    setResults(null);
    setStartConfig(null);
    setGenerationError(null);
    setViewMode('setup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCertificationId]);

  // Check for active session on mount
  useEffect(() => {
    const activeSession = QuizSessionManager.loadActiveSession();
    if (activeSession && !activeSession.completedAt) {
      setSession(activeSession);
      // Restore the exam settings persisted on the session so the restored quiz
      // behaves like the original (modality, timer, seed).
      setModality(activeSession.modality ?? 'answer-all');
      setTimed(activeSession.timed ?? false);
      setSessionSeed(activeSession.seed ?? '');
      setViewMode('quiz');
    }
  }, []);

  const loadCertificationData = async () => {
    try {
      setLoading(true);
      const data = await loadCertification(currentCertificationId);
      setCertificationData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load certification data. Please try again.');
      console.error('Error loading certification:', err);
    } finally {
      setLoading(false);
    }
  };

  const beginQuiz = (questions: Question[], seed: string, config: QuizStartConfig) => {
    if (!certificationData) return;
    const newSession = QuizSessionManager.createSession({
      certificationId: certificationData.config.id,
      questions,
      seed,
      modality: config.modality,
      timed: config.timed,
    });
    setSession(newSession);
    setViewMode('quiz');
  };

  const handleStartQuiz = async (config: QuizStartConfig) => {
    if (!certificationData) return;
    setGenerationError(null);

    // Fresh seed per quiz start so the session is reproducible from it.
    const seed = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setSessionSeed(seed);
    setModality(config.modality);
    setTimed(config.timed);

    // Generation runs when augmenting and either the curated pool can't fill the
    // requested count, or the user asked for a non-zero share of AI questions.
    const needsGeneration =
      config.augment &&
      (config.questions.length < config.count || config.targetAiPercent > 0);

    if (!needsGeneration) {
      // Curated-only path: use the seeded selection for reproducibility.
      const shuffled = shuffle(config.questions, seed);
      beginQuiz(shuffled.slice(0, config.count), seed, config);
      return;
    }

    // Augmented path: set config and switch to the generating view. An effect
    // runs build() once the hook has re-rendered with the fresh config.
    setPendingQuestions(null);
    setStartConfig(config);
    setViewMode('generating');
  };

  // Drive generation once we enter the generating view with a config in place.
  useEffect(() => {
    if (viewMode !== 'generating' || !startConfig || !certificationData) return;
    let cancelled = false;
    (async () => {
      const { questions: finalPool, error, aiCount, stats } = await pool.build();
      if (cancelled) return;
      if (error) {
        setGenerationError(
          `AI generation failed: ${error.message} — the quiz uses the curated questions only. ` +
            'Check your AI provider and model in Settings (for Ollama, ensure it is running).'
        );
      } else if (startConfig.targetAiPercent > 0 && aiCount === 0) {
        // Generation ran without a hard error but produced no usable AI
        // questions. Distinguish "model returned nothing parseable" from
        // "everything was rejected" so the cause is clear.
        if (!stats || stats.produced === 0) {
          setGenerationError(
            'The AI model did not return any usable questions (it produced 0 parseable candidates), ' +
              'so the quiz uses the curated questions only. This usually means the model replied with ' +
              'text instead of the required JSON, or the model is too small. Try a more capable model in Settings.'
          );
        } else {
          setGenerationError(
            `No AI-generated questions passed the quality check: the model produced ${stats.produced} candidate(s) — ` +
              `${stats.approved} approved, ${stats.flagged} flagged, ${stats.rejected} rejected. ` +
              'The quiz uses the curated questions only. Try turning off "Validate AI questions" in setup, or use a more capable model.'
          );
        }
      }
      if (finalPool.length === 0) {
        setViewMode('setup');
        return;
      }
      // Hold the built pool; the user starts the quiz from the generating page.
      setPendingQuestions(finalPool);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, startConfig]);

  const handleStartGeneratedQuiz = () => {
    if (!pendingQuestions || !startConfig) return;
    beginQuiz(pendingQuestions, sessionSeed, startConfig);
    setPendingQuestions(null);
  };

  const handleCancelGeneration = () => {
    pool.cancel();
    setPendingQuestions(null);
    setViewMode('setup');
  };

  const handleAnswerChange = (answer: string | string[]) => {
    if (!session) return;
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const updatedSession = QuizSessionManager.updateAnswer(session, currentQuestion.id, answer);
    setSession(updatedSession);
  };

  const handlePrevious = () => {
    if (!session) return;
    setSession(QuizSessionManager.previousQuestion(session));
  };

  const handleNext = () => {
    if (!session) return;
    setSession(QuizSessionManager.nextQuestion(session));
  };

  const handleGoToQuestion = (index: number) => {
    if (!session) return;
    setSession(QuizSessionManager.goToQuestion(session, index));
  };

  const handleToggleFlag = () => {
    if (!session) return;
    setSession(QuizSessionManager.toggleFlag(session, session.currentQuestionIndex));
  };

  const handleSubmit = () => {
    if (!session) return;
    const completedSession = QuizSessionManager.completeSession(session);
    const sessionResults = QuizSessionManager.calculateResults(completedSession);
    setSession(completedSession);
    setResults(sessionResults);
    setViewMode('results');

    // Persist progress. Storage guards internally, so a failure here never
    // blocks showing the results.
    ProgressStorage.recordSession({
      ...sessionResults,
      certificationId: completedSession.certificationId,
      completedAt: completedSession.completedAt ?? new Date().toISOString(),
    });
  };

  const handleReviewAnswers = () => {
    setViewMode('review');
  };

  const handleBackToResults = () => {
    setViewMode('results');
  };

  const handleStartNew = () => {
    setSession(null);
    setResults(null);
    setStartConfig(null);
    setGenerationError(null);
    setViewMode('setup');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading certification data...</p>
        </div>
      </div>
    );
  }

  if (error || !certificationData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Error</h3>
                <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
                <button
                  onClick={loadCertificationData}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = session?.questions[session.currentQuestionIndex];
  const progressStage =
    pool.stage === 'mixing' ? 'mixing' : pool.stage === 'validating' ? 'validating' : 'drafting';

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
            Exam Simulator
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            {certificationData.config.name}
          </p>
        </div>

        {/* Setup View */}
        {viewMode === 'setup' && (
          <>
            {generationError && (
              <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-300">
                {generationError}
              </div>
            )}
            <QuizSetup
              questions={certificationData.questions.questions}
              topics={certificationData.topics.topics}
              onStartQuiz={handleStartQuiz}
              initialTopicId={initialTopicId}
              examQuestionCount={certificationData.config.examDetails.questionCount}
            />
          </>
        )}

        {/* Generating View */}
        {viewMode === 'generating' && (
          <>
            {generationError && (
              <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-300">
                {generationError}
              </div>
            )}
            <GenerationProgress
              stage={progressStage}
              stats={pool.generationStats}
              progress={pool.generationProgress}
              ready={pendingQuestions !== null}
              onStart={handleStartGeneratedQuiz}
              onCancel={handleCancelGeneration}
            />
          </>
        )}

        {/* Quiz View */}
        {viewMode === 'quiz' && session && currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <QuestionCard
                question={currentQuestion}
                questionNumber={session.currentQuestionIndex + 1}
                totalQuestions={session.questions.length}
                currentAnswer={session.answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSubmit={handleSubmit}
                canGoPrevious={session.currentQuestionIndex > 0}
                canGoNext={session.currentQuestionIndex < session.questions.length - 1}
                isLastQuestion={session.currentQuestionIndex === session.questions.length - 1}
                isFlagged={(session.flagged ?? []).includes(session.currentQuestionIndex)}
                onToggleFlag={handleToggleFlag}
                modality={modality}
              />
            </div>
            <div className="lg:col-span-1">
              {timed && (
                <div className="mb-6">
                  <QuizTimer
                    durationMinutes={certificationData.config.examDetails.duration}
                    onExpire={handleSubmit}
                  />
                </div>
              )}
              <QuizProgress
                currentQuestion={session.currentQuestionIndex + 1}
                totalQuestions={session.questions.length}
                answeredCount={Object.keys(session.answers).length}
                answeredIndices={session.questions
                  .map((q, i) => (session.answers[q.id] != null ? i : -1))
                  .filter((i) => i >= 0)}
                visitedIndices={session.visited ?? []}
                flaggedIndices={session.flagged ?? []}
                curatedCount={
                  session.questions.filter((q) => !isAIGenerated(q)).length
                }
                aiGeneratedCount={
                  session.questions.filter((q) => isAIGenerated(q)).length
                }
                modality={modality}
                correctIndices={
                  modality === 'immediate'
                    ? session.questions
                        .map((q, i) =>
                          session.answers[q.id] != null &&
                          QuizSessionManager.checkAnswer(q, session.answers[q.id])
                            ? i
                            : -1
                        )
                        .filter((i) => i >= 0)
                    : []
                }
                incorrectIndices={
                  modality === 'immediate'
                    ? session.questions
                        .map((q, i) =>
                          session.answers[q.id] != null &&
                          !QuizSessionManager.checkAnswer(q, session.answers[q.id])
                            ? i
                            : -1
                        )
                        .filter((i) => i >= 0)
                    : []
                }
                onQuestionSelect={handleGoToQuestion}
                onFinish={handleSubmit}
              />
            </div>
          </div>
        )}

        {/* Results View */}
        {viewMode === 'results' && results && (
          <QuizResults
            results={results}
            onReviewAnswers={handleReviewAnswers}
            onStartNew={handleStartNew}
            certificationId={certificationData.config.id}
            topics={certificationData.topics.topics}
          />
        )}

        {/* Review View */}
        {viewMode === 'review' && results && (
          <AnswerReview
            questions={results.questions}
            answers={results.answers}
            onClose={handleBackToResults}
          />
        )}
      </div>
    </div>
  );
}

// `useSearchParams` must be rendered inside a Suspense boundary in the App
// Router. The default export wraps the content component accordingly.
export default function SimulatorPage() {
  return (
    <Suspense fallback={null}>
      <SimulatorPageContent />
    </Suspense>
  );
}

// A stable empty certification used before data loads so the hook always has a
// well-formed input shape.
const EMPTY_CERT_DATA: CertificationData = {
  config: {
    id: '',
    name: '',
    code: '',
    version: '',
    description: '',
    provider: '',
    examDetails: { duration: 0, questionCount: 0, passingScore: 0, scoreRange: { min: 0, max: 0 } },
    metadata: { lastUpdated: '', difficulty: 'beginner' },
  },
  topics: { topics: [] },
  questions: { questions: [] },
};

// Made with Bob

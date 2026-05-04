'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadCertification } from '@/lib/loaders/certification-loader';
import { QuizSessionManager } from '@/lib/quiz/quiz-session-manager';
import type { QuizSessionState, QuizSessionResult } from '@/lib/quiz/quiz-session-manager';
import type { CertificationData, Question } from '@/lib/types/certification';
import QuizSetup from './components/QuizSetup';
import QuizProgress from './components/QuizProgress';
import QuestionCard from './components/QuestionCard';
import QuizResults from './components/QuizResults';
import AnswerReview from './components/AnswerReview';

type ViewMode = 'setup' | 'quiz' | 'results' | 'review';

export default function SimulatorPage() {
  const [certificationData, setCertificationData] = useState<CertificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [results, setResults] = useState<QuizSessionResult | null>(null);

  // Load certification data on mount
  useEffect(() => {
    loadCertificationData();
  }, []);

  // Check for active session on mount
  useEffect(() => {
    const activeSession = QuizSessionManager.loadActiveSession();
    if (activeSession && !activeSession.completedAt) {
      setSession(activeSession);
      setViewMode('quiz');
    }
  }, []);

  const loadCertificationData = async () => {
    try {
      setLoading(true);
      const data = await loadCertification('aws-ml');
      setCertificationData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load certification data. Please try again.');
      console.error('Error loading certification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (selectedQuestions: Question[]) => {
    if (!certificationData) return;

    const newSession = QuizSessionManager.createSession({
      certificationId: certificationData.config.id,
      questions: selectedQuestions,
    });

    setSession(newSession);
    setViewMode('quiz');
  };

  const handleAnswerChange = (answer: string | string[]) => {
    if (!session) return;

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const updatedSession = QuizSessionManager.updateAnswer(
      session,
      currentQuestion.id,
      answer
    );

    setSession(updatedSession);
  };

  const handlePrevious = () => {
    if (!session) return;
    const updatedSession = QuizSessionManager.previousQuestion(session);
    setSession(updatedSession);
  };

  const handleNext = () => {
    if (!session) return;
    const updatedSession = QuizSessionManager.nextQuestion(session);
    setSession(updatedSession);
  };

  const handleSubmit = () => {
    if (!session) return;

    const completedSession = QuizSessionManager.completeSession(session);
    const sessionResults = QuizSessionManager.calculateResults(completedSession);

    setSession(completedSession);
    setResults(sessionResults);
    setViewMode('results');
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
          <QuizSetup
            questions={certificationData.questions.questions}
            topics={certificationData.topics.topics}
            onStartQuiz={handleStartQuiz}
          />
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
              />
            </div>
            <div className="lg:col-span-1">
              <QuizProgress
                currentQuestion={session.currentQuestionIndex + 1}
                totalQuestions={session.questions.length}
                answeredCount={Object.keys(session.answers).length}
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

// Made with Bob

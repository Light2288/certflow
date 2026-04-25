/**
 * CertFlow - Certification Type Definitions
 * 
 * Type definitions for certification data structures.
 * Supports data-driven certification system.
 */

// ============================================================================
// CERTIFICATION CONFIG TYPES
// ============================================================================

export interface CertificationConfig {
  id: string;
  name: string;
  code: string;
  version: string;
  description: string;
  provider: string;
  examDetails: ExamDetails;
  metadata: CertificationMetadata;
}

export interface ExamDetails {
  duration: number; // in minutes
  questionCount: number;
  passingScore: number;
  scoreRange: {
    min: number;
    max: number;
  };
}

export interface CertificationMetadata {
  lastUpdated: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  officialUrl?: string;
}

// ============================================================================
// TOPIC TYPES
// ============================================================================

export interface TopicsData {
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  weight: number; // percentage weight in exam
  order: number;
  subtopics: Subtopic[];
}

export interface Subtopic {
  id: string;
  name: string;
  description: string;
  keyPoints: string[];
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

export interface QuestionsData {
  questions: Question[];
}

export interface Question {
  id: string;
  topicId: string;
  subtopicId: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  question: string;
  options: QuestionOption[];
  correctAnswer: string | string[]; // string for single, array for multi-select
  explanation: QuestionExplanation;
  references?: string[];
  tags?: string[];
  metadata: QuestionMetadata;
}

export type QuestionType = 'multiple-choice' | 'multi-select';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionExplanation {
  correct: string;
  whyOthersWrong: Record<string, string>; // optionId -> explanation
}

export interface QuestionMetadata {
  createdAt: string;
  lastReviewed: string;
  source: string;
}

// ============================================================================
// CERTIFICATION DATA (COMBINED)
// ============================================================================

export interface CertificationData {
  config: CertificationConfig;
  topics: TopicsData;
  questions: QuestionsData;
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

// ============================================================================
// QUIZ SESSION TYPES (for future use)
// ============================================================================

export interface QuizSession {
  id: string;
  certificationId: string;
  questions: Question[];
  answers: Record<string, string | string[]>; // questionId -> answer(s)
  startedAt: Date;
  completedAt?: Date;
}

export interface QuizResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number; // percentage or scaled score
  timeSpent: number; // in seconds
  breakdown: TopicBreakdown[];
}

export interface TopicBreakdown {
  topicId: string;
  topicName: string;
  correct: number;
  total: number;
  percentage: number;
}
/**
 * Topic Deep Dive — Types
 *
 * Structured shape for an AI-generated topic deep dive. Unlike the previous
 * free-form markdown essay, a deep dive is a structured object: explanatory
 * sections plus actionable, exam-focused material (targeted practice
 * questions and "common exam traps" tied to the domain's questions). This
 * makes dives renderable in a stable way and persistable to localStorage.
 */

import type { QuestionOption } from '@/lib/types/certification';

/**
 * A single explanatory section of a deep dive. `body` is markdown so it can
 * render with the same components used elsewhere.
 */
export interface DeepDiveSection {
  heading: string;
  body: string;
}

/**
 * A "common exam trap" — a mistake candidates often make on this domain,
 * with a short explanation of why it's wrong. Optionally tied to a real
 * question in the pool via `relatedQuestionId`.
 */
export interface DeepDiveTrap {
  trap: string;
  why: string;
  relatedQuestionId?: string;
}

/**
 * A targeted practice question produced by the deep dive. Kept intentionally
 * looser than the curated `Question` schema (no id/metadata/topic linkage
 * required) since it is model-authored study material, not a pool entry.
 */
export interface DeepDivePracticeQuestion {
  question: string;
  options: QuestionOption[];
  correctAnswer: string | string[];
  explanation: string;
}

/**
 * A generated deep dive for a single topic.
 */
export interface DeepDive {
  topicId: string;
  sections: DeepDiveSection[];
  practiceQuestions: DeepDivePracticeQuestion[];
  traps: DeepDiveTrap[];
}

/**
 * A deep dive as persisted in localStorage, wrapped with the certification
 * and topic it belongs to plus a generation timestamp (epoch millis).
 */
export interface StoredDeepDive {
  certId: string;
  topicId: string;
  generatedAt: number;
  dive: DeepDive;
}

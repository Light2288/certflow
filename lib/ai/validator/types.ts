/**
 * AI Validator Agent - Type Contract
 *
 * Public types for the client-side AI question validator (Phase 8).
 *
 * NOTE: The `ValidationResult` exported here is intentionally DISTINCT from
 * the unrelated `ValidationResult` in `lib/types/certification.ts` (which
 * validates certification DATA structures). This one describes the semantic
 * quality verdict the AI returns for a single exam `Question`. Consumers must
 * import it explicitly from this module.
 */

/**
 * Verdict for a validated question.
 *
 * - `approved`: high overall score AND high confidence.
 * - `rejected`: overall score below the reject threshold.
 * - `flagged`: everything in between (incl. low-confidence cases) and the
 *   error verdict surfaced when the AI response cannot be parsed.
 */
export type ValidationVerdict = 'approved' | 'rejected' | 'flagged';

/**
 * Component scores for a question, all on a 0-10 scale.
 * `overall` is a weighted mean of the four component scores.
 */
export interface ValidationScore {
  clarity: number; // 0-10
  topicAlignment: number; // 0-10
  correctness: number; // 0-10
  difficulty: number; // 0-10
  overall: number; // weighted mean, 0-10
}

/**
 * The result of validating a single question.
 */
export interface ValidationResult {
  questionId: string;
  score: ValidationScore;
  verdict: ValidationVerdict;
  confidence: number; // 0-1
  reasoning: string;
  issues: string[]; // human-readable problems
}

/**
 * Thresholds that drive the verdict mapping.
 */
export interface ValidatorThresholds {
  approveOverall: number; // default 8.0
  approveConfidence: number; // default 0.85
  rejectOverall: number; // default 6.0
}

/**
 * Default thresholds per Phase 8 spec.
 */
export const DEFAULT_VALIDATOR_THRESHOLDS: ValidatorThresholds = {
  approveOverall: 8.0,
  approveConfidence: 0.85,
  rejectOverall: 6.0,
};

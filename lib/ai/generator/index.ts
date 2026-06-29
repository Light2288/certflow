/**
 * AI Question Generation Service - public exports (Phase 9).
 */

export { QuestionGenerator, isNearDuplicate, normalizeText } from './question-generator';
export {
  GENERATOR_SYSTEM_PROMPT,
  STRICT_JSON_RETRY_INSTRUCTION,
  buildGenerationPrompt,
} from './prompts';
export {
  getApproved,
  addApproved,
  clear,
  generatedQuestionsKey,
} from './question-store';
export type {
  GenerationRequest,
  GenerationResult,
  GenerationStats,
  GenerationMeta,
  GeneratedQuestion,
} from './types';

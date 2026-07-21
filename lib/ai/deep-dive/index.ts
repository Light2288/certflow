/**
 * Topic Deep Dive — Public Exports
 *
 * Central export point for the topic deep-dive feature.
 */

export {
  DEEP_DIVE_SYSTEM_PROMPT,
  DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION,
  buildDeepDiveSystemPrompt,
  buildDeepDivePrompt,
} from './prompts';
export { generateDeepDive, parseDeepDive } from './deep-dive-service';
export { getDeepDive, setDeepDive, clearDeepDive, deepDiveKey } from './deep-dive-store';
export type {
  DeepDive,
  DeepDiveSection,
  DeepDiveTrap,
  DeepDivePracticeQuestion,
  StoredDeepDive,
} from './types';

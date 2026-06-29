/**
 * Smoke test for the generator module public exports.
 */

import { describe, it, expect } from 'vitest';
import * as generator from '../index';

describe('generator index exports', () => {
  it('re-exports the public API', () => {
    expect(generator.QuestionGenerator).toBeTypeOf('function');
    expect(generator.buildGenerationPrompt).toBeTypeOf('function');
    expect(generator.GENERATOR_SYSTEM_PROMPT).toBeTypeOf('string');
    expect(generator.STRICT_JSON_RETRY_INSTRUCTION).toBeTypeOf('string');
    expect(generator.getApproved).toBeTypeOf('function');
    expect(generator.addApproved).toBeTypeOf('function');
    expect(generator.clear).toBeTypeOf('function');
    expect(generator.generatedQuestionsKey).toBeTypeOf('function');
    expect(generator.isNearDuplicate).toBeTypeOf('function');
  });
});

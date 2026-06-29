/**
 * Smoke test for the validator module public exports.
 */

import { describe, it, expect } from 'vitest';
import * as validator from '../index';

describe('validator index exports', () => {
  it('re-exports the public API', () => {
    expect(validator.QuestionValidator).toBeTypeOf('function');
    expect(validator.buildValidationPrompt).toBeTypeOf('function');
    expect(validator.VALIDATOR_SYSTEM_PROMPT).toBeTypeOf('string');
    expect(validator.STRICT_JSON_RETRY_INSTRUCTION).toBeTypeOf('string');
    expect(validator.DEFAULT_VALIDATOR_THRESHOLDS).toEqual({
      approveOverall: 8.0,
      approveConfidence: 0.85,
      rejectOverall: 6.0,
    });
  });
});

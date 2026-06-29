/**
 * Shared test fixtures and a routing canned provider for generator tests.
 *
 * The generator makes TWO kinds of AI calls:
 *   1. Generation: one `chat()` whose user message is the generation prompt.
 *   2. Validation: the QuestionValidator calls `chat()` once per candidate,
 *      passing VALIDATOR_SYSTEM_PROMPT in `history`.
 *
 * `RoutingProvider` distinguishes them by inspecting `history` for the
 * validator system prompt, returning generation JSON for the former and a
 * configurable validator verdict for the latter.
 */

import { AIService } from '@/lib/ai/ai-service';
import { AIServiceError } from '@/lib/ai/types';
import type {
  AIConfig,
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from '@/lib/ai/types';
import { VALIDATOR_SYSTEM_PROMPT } from '@/lib/ai/validator';
import type { Topic, Subtopic } from '@/lib/types/certification';

// ---------------------------------------------------------------------------
// Service injection helper (mirrors the validator test harness).
// ---------------------------------------------------------------------------

class TestAIService extends AIService {
  constructor(provider: AIProvider) {
    super({ provider: 'mock' });
    (this as unknown as { provider: AIProvider }).provider = provider;
  }
}

export function makeServiceWithProvider(provider: AIProvider): AIService {
  return new TestAIService(provider);
}

export { AIServiceError };

// ---------------------------------------------------------------------------
// Canned validator JSON.
// ---------------------------------------------------------------------------

export type VerdictKind = 'approved' | 'flagged' | 'rejected';

/** Build a validator JSON response that maps to the desired verdict. */
export function validatorJson(kind: VerdictKind): string {
  const presets: Record<VerdictKind, { overall: number; confidence: number }> = {
    approved: { overall: 9, confidence: 0.95 },
    flagged: { overall: 7, confidence: 0.9 },
    rejected: { overall: 3, confidence: 0.9 },
  };
  const { overall, confidence } = presets[kind];
  return JSON.stringify({
    clarity: overall,
    topicAlignment: overall,
    correctness: overall,
    difficulty: overall,
    overall,
    confidence,
    reasoning: `Canned ${kind} verdict.`,
    issues: kind === 'approved' ? [] : ['Some issue.'],
  });
}

// ---------------------------------------------------------------------------
// RoutingProvider: serves generation JSON or validator JSON per call type.
// ---------------------------------------------------------------------------

function isValidationCall(history?: ChatMessage[]): boolean {
  if (!history) {
    return false;
  }
  return history.some((m) => m.content.includes(VALIDATOR_SYSTEM_PROMPT));
}

export interface RoutingProviderOptions {
  /** Raw string the generation call returns (usually a JSON array). */
  generationResponse: string | Error;
  /**
   * Verdicts returned for each successive validation call (in order). When the
   * queue is exhausted the last verdict repeats. Defaults to all 'approved'.
   */
  verdicts?: VerdictKind[];
  /** When set, validation calls return this raw string instead of verdicts. */
  validationResponseOverride?: string;
}

export class RoutingProvider implements AIProvider {
  readonly name = 'routing';
  public generationCalls = 0;
  public validationCalls = 0;
  private verdictCursor = 0;

  constructor(private readonly opts: RoutingProviderOptions) {}

  async chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    void message;
    void options;

    if (isValidationCall(history)) {
      this.validationCalls += 1;
      if (this.opts.validationResponseOverride !== undefined) {
        return this.wrap(this.opts.validationResponseOverride);
      }
      const verdicts = this.opts.verdicts ?? ['approved'];
      const index = Math.min(this.verdictCursor, verdicts.length - 1);
      this.verdictCursor += 1;
      return this.wrap(validatorJson(verdicts[index]));
    }

    this.generationCalls += 1;
    if (this.opts.generationResponse instanceof Error) {
      throw this.opts.generationResponse;
    }
    return this.wrap(this.opts.generationResponse);
  }

  private wrap(content: string): ChatResponse {
    return { content, model: 'routing-model', finishReason: 'stop' };
  }

  async validateConfig(config: AIConfig): Promise<boolean> {
    void config;
    return true;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Topic / candidate fixtures.
// ---------------------------------------------------------------------------

export const genTopic: Topic = {
  id: 'data-eng',
  name: 'Data Engineering',
  description: 'Building data pipelines on AWS.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'ingestion',
      name: 'Data Ingestion',
      description: 'Batch and streaming ingestion.',
      keyPoints: ['Kinesis for streaming', 'Glue for batch ETL'],
    },
  ],
};

export const genSubtopic: Subtopic = genTopic.subtopics[0];

/** A well-formed candidate object (as the AI would emit, sans id/metadata). */
export function candidate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    topicId: 'data-eng',
    subtopicId: 'ingestion',
    type: 'multiple-choice',
    difficulty: 'medium',
    question: 'Which AWS service is best for real-time streaming ingestion?',
    options: [
      { id: 'a', text: 'Amazon Kinesis' },
      { id: 'b', text: 'AWS Glue' },
      { id: 'c', text: 'Amazon S3' },
      { id: 'd', text: 'Amazon Athena' },
    ],
    correctAnswer: 'a',
    explanation: {
      correct: 'Kinesis is designed for real-time streaming.',
      whyOthersWrong: {
        b: 'Glue is batch ETL.',
        c: 'S3 is object storage.',
        d: 'Athena is interactive query.',
      },
    },
    ...overrides,
  };
}

/** Build a JSON array string of N distinct candidates. */
export function candidateArray(
  questions: Array<Record<string, unknown>>
): string {
  return JSON.stringify(questions);
}

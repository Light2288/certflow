/**
 * Shared test fixtures and a canned-response provider for validator tests.
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
import type {
  Question,
  Topic,
  Subtopic,
  TopicsData,
} from '@/lib/types/certification';

/**
 * A provider that returns queued canned responses in order. Each entry is
 * either a string (returned as `content`) or an Error (thrown on that call).
 * When the queue is exhausted, the last response repeats.
 */
export class CannedJsonProvider implements AIProvider {
  readonly name = 'canned';
  private responses: Array<string | Error>;
  public calls = 0;
  public inFlight = 0;
  public maxInFlight = 0;
  private delayMs: number;

  constructor(responses: Array<string | Error>, delayMs = 0) {
    this.responses = responses;
    this.delayMs = delayMs;
  }

  async chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    void message;
    void history;
    void options;
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      if (this.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
      const index = Math.min(this.calls, this.responses.length - 1);
      this.calls += 1;
      const entry = this.responses[index];
      if (entry instanceof Error) {
        throw entry;
      }
      return {
        content: entry,
        model: 'canned-model',
        finishReason: 'stop',
      };
    } finally {
      this.inFlight -= 1;
    }
  }

  async validateConfig(config: AIConfig): Promise<boolean> {
    void config;
    return true;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

/**
 * Wrap an arbitrary AIProvider in an AIService so QuestionValidator can use it.
 * Uses a tiny subclass to inject the provider (AIService has no public hook).
 */
class TestAIService extends AIService {
  constructor(provider: AIProvider) {
    super({ provider: 'mock' });
    // Inject the test provider over the default mock one.
    (this as unknown as { provider: AIProvider }).provider = provider;
  }
}

export function makeServiceWithProvider(provider: AIProvider): AIService {
  return new TestAIService(provider);
}

export { AIServiceError };

/**
 * Build a canned validator JSON response string.
 *
 * If `overall` is omitted it defaults to the same value as the component
 * scores so callers can set a single uniform score that survives the
 * validator's weighted-mean recomputation (weights sum to 1).
 */
export function cannedResponse(overrides: {
  clarity?: number;
  topicAlignment?: number;
  correctness?: number;
  difficulty?: number;
  overall?: number;
  confidence?: number;
  reasoning?: string;
  issues?: string[];
}): string {
  // When a uniform `overall` is requested, set all components to that value so
  // the validator's weighted mean recomputes to the same number.
  const uniform = overrides.overall;
  return JSON.stringify({
    clarity: overrides.clarity ?? uniform ?? 9,
    topicAlignment: overrides.topicAlignment ?? uniform ?? 9,
    correctness: overrides.correctness ?? uniform ?? 9,
    difficulty: overrides.difficulty ?? uniform ?? 9,
    overall: overrides.overall ?? 9,
    confidence: overrides.confidence ?? 0.9,
    reasoning: overrides.reasoning ?? 'Looks good.',
    issues: overrides.issues ?? [],
  });
}

// ---------------------------------------------------------------------------
// Topic / Question fixtures
// ---------------------------------------------------------------------------

export const dataEngTopic: Topic = {
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

export const ingestionSubtopic: Subtopic = dataEngTopic.subtopics[0];

export const topicsData: TopicsData = {
  topics: [dataEngTopic],
};

function makeQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    topicId: 'data-eng',
    subtopicId: 'ingestion',
    type: 'multiple-choice',
    difficulty: 'medium',
    question: 'Which service is best for real-time streaming ingestion?',
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
    metadata: {
      createdAt: '2026-01-01',
      lastReviewed: '2026-01-01',
      source: 'curated',
    },
    ...overrides,
  };
}

/** A well-formed question expected to be APPROVED. */
export const goodQuestion: Question = makeQuestion('q-good');

/** A borderline question expected to be FLAGGED. */
export const borderlineQuestion: Question = makeQuestion('q-borderline');

/** A poor question expected to be REJECTED. */
export const badQuestion: Question = makeQuestion('q-bad', {
  question: 'Which one?',
});

/** Canned responses keyed to verdict outcomes. */
export const goodResponse = cannedResponse({
  overall: 9,
  confidence: 0.92,
});

export const borderlineResponse = cannedResponse({
  overall: 7,
  confidence: 0.6,
  issues: ['Slightly ambiguous wording.'],
});

export const badResponse = cannedResponse({
  overall: 4,
  confidence: 0.9,
  issues: ['Stem is too vague.', 'Mis-keyed answer.'],
});

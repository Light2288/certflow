/**
 * AI Validator Agent - QuestionValidator
 *
 * Client-side agent that scores a single exam `Question` for clarity, topic
 * alignment, answer correctness, and difficulty using the configured AI
 * provider via `AIService`, then maps the result to an approved / rejected /
 * flagged verdict.
 */

import type { AIService } from '@/lib/ai/ai-service';
import { AIServiceError } from '@/lib/ai/types';
import type { ChatMessage } from '@/lib/ai/types';
import type {
  Question,
  Topic,
  Subtopic,
  TopicsData,
} from '@/lib/types/certification';
import {
  VALIDATOR_SYSTEM_PROMPT,
  STRICT_JSON_RETRY_INSTRUCTION,
  buildValidationPrompt,
} from './prompts';
import {
  DEFAULT_VALIDATOR_THRESHOLDS,
  type ValidationResult,
  type ValidationScore,
  type ValidationVerdict,
  type ValidatorThresholds,
} from './types';

/**
 * Shape of the raw JSON we expect the AI to emit.
 */
interface RawValidatorResponse {
  clarity: number;
  topicAlignment: number;
  correctness: number;
  difficulty: number;
  overall: number;
  confidence: number;
  reasoning: string;
  issues: string[];
}

/** Component weights used to recompute/sanity-check the overall score. */
const SCORE_WEIGHTS = {
  clarity: 0.2,
  topicAlignment: 0.2,
  correctness: 0.4,
  difficulty: 0.2,
} as const;

function clamp(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export class QuestionValidator {
  private readonly aiService: AIService;
  private readonly thresholds: ValidatorThresholds;

  constructor(aiService: AIService, thresholds?: ValidatorThresholds) {
    this.aiService = aiService;
    this.thresholds = { ...DEFAULT_VALIDATOR_THRESHOLDS, ...thresholds };
  }

  /**
   * Validate a single question. Never throws: AI/parse failures surface as a
   * flagged error verdict.
   */
  async validate(
    question: Question,
    topic: Topic,
    subtopic?: Subtopic
  ): Promise<ValidationResult> {
    try {
      const userPrompt = buildValidationPrompt(question, topic, subtopic);
      const systemMessage: ChatMessage = {
        role: 'system',
        content: VALIDATOR_SYSTEM_PROMPT,
        timestamp: new Date(),
      };

      // First attempt.
      const first = await this.aiService.chat(userPrompt, [systemMessage]);
      let parsed = this.tryParse(first.content);

      // Retry once on malformed/partial output.
      if (!parsed) {
        const retryMessage: ChatMessage = {
          role: 'system',
          content: STRICT_JSON_RETRY_INSTRUCTION,
          timestamp: new Date(),
        };
        const second = await this.aiService.chat(userPrompt, [
          systemMessage,
          retryMessage,
        ]);
        parsed = this.tryParse(second.content);
      }

      if (!parsed) {
        return this.errorResult(
          question.id,
          'AI response could not be parsed as valid JSON after one retry.'
        );
      }

      return this.buildResult(question.id, parsed);
    } catch (error) {
      const message =
        error instanceof AIServiceError
          ? `${error.code}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Unknown error during validation.';
      return this.errorResult(question.id, message);
    }
  }

  /**
   * Validate a batch of questions with a bounded concurrency limit (default 3).
   * Preserves input order and isolates per-question failures.
   */
  async validateBatch(
    questions: Question[],
    topics: TopicsData,
    concurrency = 3
  ): Promise<ValidationResult[]> {
    if (questions.length === 0) {
      return [];
    }

    const limit = Math.max(1, Math.floor(concurrency));
    const topicById = new Map<string, Topic>();
    const subtopicById = new Map<string, Subtopic>();
    for (const topic of topics.topics) {
      topicById.set(topic.id, topic);
      for (const sub of topic.subtopics) {
        subtopicById.set(sub.id, sub);
      }
    }

    const results = new Array<ValidationResult>(questions.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < questions.length) {
        const index = cursor;
        cursor += 1;
        const question = questions[index];
        const topic = topicById.get(question.topicId);
        if (!topic) {
          results[index] = this.errorResult(
            question.id,
            `Topic "${question.topicId}" was not found in the provided topic data.`
          );
          continue;
        }
        const subtopic = subtopicById.get(question.subtopicId);
        // validate() never throws, but guard defensively anyway.
        try {
          results[index] = await this.validate(question, topic, subtopic);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown batch error.';
          results[index] = this.errorResult(question.id, message);
        }
      }
    };

    const workerCount = Math.min(limit, questions.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return results;
  }

  /**
   * Extract and parse a validator JSON object from raw AI content.
   * Returns null when the content is not parseable or is missing fields.
   */
  private tryParse(content: string): RawValidatorResponse | null {
    const jsonText = this.extractJson(content);
    if (!jsonText) {
      return null;
    }

    let obj: unknown;
    try {
      obj = JSON.parse(jsonText);
    } catch {
      return null;
    }

    if (!this.isCompleteResponse(obj)) {
      return null;
    }

    return obj;
  }

  /**
   * Isolate the first JSON object from arbitrary content (handles code fences
   * and surrounding prose).
   */
  private extractJson(content: string): string | null {
    if (!content) {
      return null;
    }
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return content.slice(start, end + 1);
  }

  /**
   * Type guard ensuring all required numeric/string/array fields are present.
   */
  private isCompleteResponse(obj: unknown): obj is RawValidatorResponse {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    const r = obj as Record<string, unknown>;
    const numberFields = [
      'clarity',
      'topicAlignment',
      'correctness',
      'difficulty',
      'overall',
      'confidence',
    ];
    for (const field of numberFields) {
      if (typeof r[field] !== 'number' || Number.isNaN(r[field])) {
        return false;
      }
    }
    if (typeof r.reasoning !== 'string') {
      return false;
    }
    if (!Array.isArray(r.issues)) {
      return false;
    }
    return true;
  }

  /**
   * Build a ValidationResult from a well-formed raw response.
   */
  private buildResult(
    questionId: string,
    raw: RawValidatorResponse
  ): ValidationResult {
    const clarity = clamp(raw.clarity, 0, 10);
    const topicAlignment = clamp(raw.topicAlignment, 0, 10);
    const correctness = clamp(raw.correctness, 0, 10);
    const difficulty = clamp(raw.difficulty, 0, 10);
    const confidence = clamp(raw.confidence, 0, 1);

    // `overall` is a weighted mean of the four component scores, computed
    // locally for deterministic, consistent verdicts (the AI's own `overall`
    // field is required for parse-completeness but not trusted as the source
    // of truth).
    const overall = this.computeOverall({
      clarity,
      topicAlignment,
      correctness,
      difficulty,
    });

    const score: ValidationScore = {
      clarity,
      topicAlignment,
      correctness,
      difficulty,
      overall,
    };

    return {
      questionId,
      score,
      verdict: this.decideVerdict(overall, confidence),
      confidence,
      reasoning: raw.reasoning,
      issues: raw.issues.map((i) => String(i)),
    };
  }

  /**
   * Weighted mean of the four component scores (used as a fallback / sanity
   * check; exported via the public overall too).
   */
  private computeOverall(score: Omit<ValidationScore, 'overall'>): number {
    const weighted =
      score.clarity * SCORE_WEIGHTS.clarity +
      score.topicAlignment * SCORE_WEIGHTS.topicAlignment +
      score.correctness * SCORE_WEIGHTS.correctness +
      score.difficulty * SCORE_WEIGHTS.difficulty;
    return clamp(weighted, 0, 10);
  }

  /**
   * Map an overall score + confidence to a verdict per the threshold bands.
   */
  private decideVerdict(overall: number, confidence: number): ValidationVerdict {
    if (
      overall >= this.thresholds.approveOverall &&
      confidence >= this.thresholds.approveConfidence
    ) {
      return 'approved';
    }
    if (overall < this.thresholds.rejectOverall) {
      return 'rejected';
    }
    return 'flagged';
  }

  /**
   * Build the flagged error verdict returned on parse/AI failure.
   */
  private errorResult(questionId: string, message: string): ValidationResult {
    return {
      questionId,
      score: {
        clarity: 0,
        topicAlignment: 0,
        correctness: 0,
        difficulty: 0,
        overall: 0,
      },
      verdict: 'flagged',
      confidence: 0,
      reasoning: 'Validation could not be completed.',
      issues: [message],
    };
  }
}

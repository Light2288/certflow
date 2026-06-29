/**
 * AI Question Generation Service - QuestionGenerator
 *
 * Client-side service that asks the configured AI provider to draft candidate
 * exam questions, validates each candidate through the Phase 8
 * `QuestionValidator`, stamps provenance metadata, de-duplicates, and returns
 * a `GenerationResult`. Also provides a deterministic `mix()` blend of curated
 * and generated pools.
 */

import type { AIService } from '@/lib/ai/ai-service';
import { AIServiceError } from '@/lib/ai/types';
import type { ChatMessage } from '@/lib/ai/types';
import { QuestionValidator } from '@/lib/ai/validator';
import { validateQuestion } from '@/lib/loaders/certification-loader';
import type {
  Question,
  QuestionType,
  DifficultyLevel,
} from '@/lib/types/certification';
import {
  GENERATOR_SYSTEM_PROMPT,
  STRICT_JSON_RETRY_INSTRUCTION,
  buildGenerationPrompt,
} from './prompts';
import type {
  GeneratedQuestion,
  GenerationRequest,
  GenerationResult,
} from './types';

/** Near-duplicate threshold: token Jaccard similarity at/above this collapses. */
const NEAR_DUPLICATE_THRESHOLD = 0.85;

export class QuestionGenerator {
  private readonly aiService: AIService;
  private readonly validator: QuestionValidator;

  constructor(aiService: AIService, validator: QuestionValidator) {
    this.aiService = aiService;
    this.validator = validator;
  }

  /**
   * Generate, validate, and de-duplicate questions for a request.
   *
   * Never throws on AI failure: returns an empty result with `error` populated
   * so callers can fall back to curated questions.
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const stats = {
      requested: request.count,
      produced: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
    };
    const generated: GeneratedQuestion[] = [];
    const rejected: Array<{ raw: unknown; reason: string }> = [];

    let content: string;
    try {
      content = await this.callAi(request);
    } catch (error) {
      const aiError =
        error instanceof AIServiceError
          ? error
          : new AIServiceError(
              error instanceof Error ? error.message : 'Unknown AI error.',
              'SERVICE_ERROR'
            );
      return { generated, rejected, stats, error: aiError };
    }

    const candidates = this.parseCandidates(content);
    if (candidates === null) {
      rejected.push({ raw: content, reason: 'AI output was not a JSON array.' });
      stats.rejected += 1;
      return { generated, rejected, stats };
    }

    stats.produced = candidates.length;

    const seenTexts: string[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < candidates.length; i += 1) {
      const raw = candidates[i];

      // Drop candidates that collide with an existing id (pre-validation).
      const rawId =
        typeof raw === 'object' && raw !== null
          ? (raw as Record<string, unknown>).id
          : undefined;
      if (typeof rawId === 'string' && request.existingQuestionIds.includes(rawId)) {
        rejected.push({ raw, reason: `Duplicate of existing question id "${rawId}".` });
        stats.rejected += 1;
        continue;
      }

      // Build a stamped candidate question from the raw object.
      const built = this.buildQuestion(raw, request, timestamp, i);
      if (!built) {
        rejected.push({ raw, reason: 'Candidate failed schema validation.' });
        stats.rejected += 1;
        continue;
      }

      // Near-duplicate text guard (within this batch + curated context).
      const normalized = normalizeText(built.question);
      if (seenTexts.some((t) => jaccard(t, normalized) >= NEAR_DUPLICATE_THRESHOLD)) {
        rejected.push({ raw, reason: 'Near-duplicate of another generated question.' });
        stats.rejected += 1;
        continue;
      }

      // Semantic validation via the Phase 8 validator.
      const verdict = await this.validator.validate(
        built,
        request.topic,
        request.subtopic
      );

      if (verdict.verdict === 'rejected') {
        rejected.push({ raw, reason: `Validator rejected: ${verdict.reasoning}` });
        stats.rejected += 1;
        continue;
      }

      built.generationMeta = {
        verdict: verdict.verdict,
        validatorScore: verdict.score,
        confidence: verdict.confidence,
      };

      if (verdict.verdict === 'approved') {
        stats.approved += 1;
      } else {
        stats.flagged += 1;
      }

      seenTexts.push(normalized);
      generated.push(built);
    }

    return { generated, rejected, stats };
  }

  /**
   * Blend curated (`seed`) and `generated` questions at the given `ratio`
   * (fraction curated). Deterministic per `sessionSeed`; degrades gracefully
   * when either pool is too small (uses what is available, never pads/throws).
   */
  mix(
    seed: Question[],
    generated: Question[],
    ratio = 0.3,
    sessionSeed: string = String(Date.now())
  ): Question[] {
    if (seed.length === 0 && generated.length === 0) {
      return [];
    }
    if (seed.length === 0) {
      return shuffle(generated, sessionSeed);
    }
    if (generated.length === 0) {
      return shuffle(seed, sessionSeed);
    }

    const total = seed.length + generated.length;
    let curatedTarget = Math.round(total * ratio);
    // Clamp to availability and ensure the complement fits the generated pool.
    curatedTarget = Math.min(curatedTarget, seed.length);
    let generatedTarget = total - curatedTarget;
    if (generatedTarget > generated.length) {
      generatedTarget = generated.length;
      curatedTarget = total - generatedTarget;
    }

    const curatedPick = shuffle(seed, `${sessionSeed}:curated`).slice(0, curatedTarget);
    const generatedPick = shuffle(generated, `${sessionSeed}:generated`).slice(
      0,
      generatedTarget
    );

    return shuffle([...curatedPick, ...generatedPick], `${sessionSeed}:mix`);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async callAi(request: GenerationRequest): Promise<string> {
    const userPrompt = buildGenerationPrompt(request);
    const systemMessage: ChatMessage = {
      role: 'system',
      content: GENERATOR_SYSTEM_PROMPT,
      timestamp: new Date(),
    };

    const first = await this.aiService.chat(userPrompt, [systemMessage]);
    if (this.parseCandidates(first.content) !== null) {
      return first.content;
    }

    // One retry on unparseable output.
    const retryMessage: ChatMessage = {
      role: 'system',
      content: STRICT_JSON_RETRY_INSTRUCTION,
      timestamp: new Date(),
    };
    const second = await this.aiService.chat(userPrompt, [
      systemMessage,
      retryMessage,
    ]);
    return second.content;
  }

  /**
   * Extract a JSON array of candidate objects from raw AI content. Returns null
   * when no array can be parsed.
   */
  private parseCandidates(content: string): unknown[] | null {
    if (!content) {
      return null;
    }
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.slice(start, end + 1));
    } catch {
      return null;
    }
    return Array.isArray(parsed) ? parsed : null;
  }

  /**
   * Stamp id/metadata/difficulty onto a raw candidate and validate its schema.
   * Returns null when the candidate is not a schema-valid Question.
   */
  private buildQuestion(
    raw: unknown,
    request: GenerationRequest,
    timestamp: number,
    index: number
  ): GeneratedQuestion | null {
    if (typeof raw !== 'object' || raw === null) {
      return null;
    }
    const r = raw as Record<string, unknown>;
    const nowIso = new Date(timestamp).toISOString();

    const built: GeneratedQuestion = {
      id: `gen_${timestamp}_${index}`,
      topicId: typeof r.topicId === 'string' ? r.topicId : request.topic.id,
      subtopicId:
        typeof r.subtopicId === 'string'
          ? r.subtopicId
          : (request.subtopic?.id ?? ''),
      type: (r.type as QuestionType) ?? 'multiple-choice',
      difficulty: request.difficulty as DifficultyLevel,
      question: typeof r.question === 'string' ? r.question : '',
      options: Array.isArray(r.options) ? (r.options as Question['options']) : [],
      correctAnswer: (r.correctAnswer as Question['correctAnswer']) ?? '',
      explanation:
        (r.explanation as Question['explanation']) ?? {
          correct: '',
          whyOthersWrong: {},
        },
      references: Array.isArray(r.references)
        ? (r.references as string[])
        : undefined,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
      metadata: {
        createdAt: nowIso,
        lastReviewed: nowIso,
        source: 'ai-generated',
      },
    };

    if (!validateQuestion(built).valid) {
      return null;
    }
    return built;
  }
}

// ---------------------------------------------------------------------------
// Text + shuffle helpers (exported for unit testing).
// ---------------------------------------------------------------------------

/** Normalize question text for near-duplicate comparison. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token Jaccard similarity of two normalized strings (0..1). */
export function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(' ').filter(Boolean));
  const sb = new Set(b.split(' ').filter(Boolean));
  if (sa.size === 0 && sb.size === 0) {
    return 1;
  }
  let intersection = 0;
  for (const t of sa) {
    if (sb.has(t)) {
      intersection += 1;
    }
  }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** True when two question texts are near-duplicates. */
export function isNearDuplicate(a: string, b: string): boolean {
  return jaccard(normalizeText(a), normalizeText(b)) >= NEAR_DUPLICATE_THRESHOLD;
}

/** Deterministic 32-bit hash of a string seed. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle seeded by a string. */
export function shuffle<T>(items: T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai';
import type { AIConfig } from '@/lib/ai/types';
import { QuestionGenerator, type GenerationRequest } from '@/lib/ai/generator';
import { QuestionValidator } from '@/lib/ai/validator';

export const runtime = 'nodejs';

/**
 * POST /api/generate-questions
 *
 * Server-side AI question generation. Runs the QuestionGenerator + validator
 * on the server so that server-only providers (e.g. Ollama) work — the exam
 * simulator cannot construct those providers in the browser.
 *
 * Body: { request: GenerationRequest, config: AIConfig }
 * Returns: GenerationResult (generated questions + stats), or { error } on
 * failure so the client can fall back to curated questions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request: genRequest, config } = body as {
      request?: GenerationRequest;
      config?: AIConfig;
    };

    if (!genRequest || typeof genRequest !== 'object') {
      return NextResponse.json(
        { error: 'A generation request is required' },
        { status: 400 }
      );
    }

    if (!genRequest.topic || typeof genRequest.count !== 'number') {
      return NextResponse.json(
        { error: 'The generation request must include a topic and a count' },
        { status: 400 }
      );
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    const aiService = new AIService(config as AIConfig);
    const validator = new QuestionValidator(aiService);
    const generator = new QuestionGenerator(aiService, validator);

    const result = await generator.generate(genRequest as GenerationRequest);

    // The generator never throws; a total AI failure is carried in result.error.
    // Serialize the error to a plain shape so it survives JSON transport.
    const serializable = {
      generated: result.generated,
      rejected: result.rejected,
      stats: result.stats,
      error: result.error
        ? {
            message: result.error.message,
            code: (result.error as { code?: string }).code ?? 'SERVICE_ERROR',
            provider:
              (result.error as { provider?: string }).provider ?? config.provider,
          }
        : undefined,
    };

    return NextResponse.json(serializable);
  } catch (error: unknown) {
    console.error('Generate-questions API error:', error);

    const err =
      typeof error === 'object' && error !== null
        ? (error as { message?: unknown; code?: unknown; provider?: unknown })
        : {};
    const message =
      typeof err.message === 'string' && err.message
        ? err.message
        : 'An error occurred';
    const code =
      typeof err.code === 'string' && err.code ? err.code : 'UNKNOWN_ERROR';
    const provider =
      typeof err.provider === 'string' && err.provider ? err.provider : 'unknown';

    return NextResponse.json({ error: message, code, provider }, { status: 500 });
  }
}

// Made with Bob

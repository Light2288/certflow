import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai';
import type { AIConfig } from '@/lib/ai/types';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 * 
 * Server-side API route for handling AI chat requests.
 * This is necessary for providers like Ollama that can only run server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], config } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    // Create AI service with provided config
    const aiService = new AIService(config as AIConfig);

    // Send chat message
    const response = await aiService.chat(message, history);

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Narrow the unknown error to safely read optional AIServiceError-like fields.
    const err = (typeof error === 'object' && error !== null)
      ? (error as { message?: unknown; code?: unknown; provider?: unknown })
      : {};

    const message = typeof err.message === 'string' && err.message ? err.message : 'An error occurred';
    const code = typeof err.code === 'string' && err.code ? err.code : 'UNKNOWN_ERROR';
    const provider = typeof err.provider === 'string' && err.provider ? err.provider : 'unknown';

    // Return error details
    return NextResponse.json(
      {
        error: message,
        code,
        provider,
      },
      { status: 500 }
    );
  }
}

// Made with Bob

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
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Return error details
    return NextResponse.json(
      {
        error: error.message || 'An error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        provider: error.provider || 'unknown',
      },
      { status: 500 }
    );
  }
}

// Made with Bob

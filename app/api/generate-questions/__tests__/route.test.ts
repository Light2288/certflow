/**
 * Tests for the /api/generate-questions route.
 *
 * Runs the real QuestionGenerator + validator server-side with the mock
 * provider (which needs no network), so this route is exercised end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import type { Topic } from '@/lib/types/certification';

const topic: Topic = {
  id: 'data-eng',
  name: 'Data Engineering',
  description: 'Building data pipelines.',
  weight: 20,
  order: 1,
  subtopics: [
    {
      id: 'ingestion',
      name: 'Data Ingestion',
      description: 'Batch and streaming ingestion.',
      keyPoints: ['Kinesis', 'Glue'],
    },
  ],
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/generate-questions', () => {
  it('generates AI questions server-side with the mock provider', async () => {
    const res = await POST(
      makeRequest({
        request: {
          topic,
          subtopic: topic.subtopics[0],
          difficulty: 'medium',
          count: 3,
          existingQuestionIds: [],
        },
        config: { provider: 'mock' },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.generated)).toBe(true);
    expect(data.generated.length).toBe(3);
    for (const q of data.generated) {
      expect(q.metadata.source).toBe('ai-generated');
    }
  }, 30000);

  it('returns 400 when the generation request is missing', async () => {
    const res = await POST(makeRequest({ config: { provider: 'mock' } }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it('returns 400 when the config is missing', async () => {
    const res = await POST(
      makeRequest({
        request: {
          topic,
          difficulty: 'medium',
          count: 1,
          existingQuestionIds: [],
        },
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

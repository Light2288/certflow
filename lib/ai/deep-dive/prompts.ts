/**
 * Topic Deep Dive — Prompts
 *
 * Builds the prompts used to ask an AI provider to produce a *structured*,
 * certification-grounded deep dive for a topic. Unlike the previous free-form
 * essay, the model is asked to return a single JSON object matching the
 * `DeepDive` schema (explanatory sections, targeted practice questions, and
 * "common exam traps").
 *
 * Grounding sources:
 * - The topic's real `keyPoints` (aggregated from its subtopics) and any
 *   enriched per-subtopic `content`.
 * - A few real practice questions from the pool, injected as few-shot
 *   examples so generated material matches the exam's real style.
 * - The certification's identity + domains, mirroring the cert-grounding
 *   system-prompt pattern from `lib/ai/tutor/prompts.ts`.
 */

import type {
  CertificationConfig,
  Question,
  Topic,
  TopicsData,
} from '@/lib/types/certification';

/**
 * System prompt framing the model as a certification tutor that returns a
 * single structured JSON deep dive. Certification-specific context is
 * appended by `buildDeepDiveSystemPrompt`.
 */
export const DEEP_DIVE_SYSTEM_PROMPT = `You are an expert certification tutor helping a candidate master a specific exam topic.

Produce an actionable, exam-focused deep dive as a SINGLE JSON object — no prose, markdown, or code fences outside the JSON. The object must match this schema exactly:

{
  "topicId": string,               // the id of the topic being covered
  "sections": [                    // 2-4 concise explanatory sections
    { "heading": string, "body": string }   // body is markdown
  ],
  "practiceQuestions": [           // 2-4 NEW targeted practice questions
    {
      "question": string,
      "options": [ { "id": string, "text": string } ],
      "correctAnswer": string | string[],
      "explanation": string
    }
  ],
  "traps": [                       // 2-4 common exam traps for this domain
    { "trap": string, "why": string, "relatedQuestionId": string }
  ]
}

Ground every part strictly in the topic's key points and the example exam questions provided. Match the style, difficulty, and phrasing of the real exam questions. The "traps" must describe mistakes candidates commonly make on THIS domain; where an example question illustrates a trap, set "relatedQuestionId" to that question's id (otherwise omit it).`;

/**
 * Retry instruction for when the model's first response cannot be parsed as
 * the required JSON object. Mirrors the generator's strict-JSON retry.
 */
export const DEEP_DIVE_STRICT_JSON_RETRY_INSTRUCTION = `Your previous response could not be parsed. Respond again with ONLY a single valid JSON object matching the required deep-dive schema. Do not include markdown, code fences, or any explanatory text outside the JSON.`;

/**
 * Build the full deep-dive system prompt for a given certification, injecting
 * its identity, exam details, and domain/subtopic context. Mirrors
 * `buildTutorSystemPrompt`'s assembly so dives stay anchored to the exam.
 *
 * @param config - the certification's `config.json` contents
 * @param topics - the certification's `topics.json` contents
 */
export function buildDeepDiveSystemPrompt(
  config: CertificationConfig,
  topics: TopicsData
): string {
  const { examDetails } = config;

  const sections: string[] = [
    DEEP_DIVE_SYSTEM_PROMPT,
    `CERTIFICATION: ${config.name} (${config.code})`,
    [
      'EXAM DETAILS:',
      `  - Duration: ${examDetails.duration} minutes`,
      `  - Question count: ${examDetails.questionCount}`,
      `  - Passing score: ${examDetails.passingScore}`,
      `  - Score range: ${examDetails.scoreRange.min}–${examDetails.scoreRange.max}`,
    ].join('\n'),
  ];

  if (topics.topics.length > 0) {
    const domainBlocks = topics.topics.map((topic) => {
      const lines: string[] = [`- ${topic.name} (${topic.weight}% of the exam)`];
      for (const subtopic of topic.subtopics) {
        lines.push(`  - ${subtopic.name}`);
        for (const keyPoint of subtopic.keyPoints) {
          lines.push(`    - ${keyPoint}`);
        }
      }
      return lines.join('\n');
    });

    sections.push(`EXAM DOMAINS (with weights):\n${domainBlocks.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Collect the key points from a topic's subtopics, along with any enriched
 * per-subtopic `content`, into a flat list of grounding lines.
 */
function collectGrounding(topic: Topic): string[] {
  const lines: string[] = [];
  for (const subtopic of topic.subtopics ?? []) {
    for (const point of subtopic.keyPoints ?? []) {
      lines.push(point);
    }
    if (subtopic.content && subtopic.content.trim().length > 0) {
      lines.push(subtopic.content.trim());
    }
  }
  return lines;
}

/**
 * Render a real practice question as a compact few-shot example.
 */
function renderExampleQuestion(question: Question, index: number): string {
  const options = question.options
    .map((opt) => `    ${opt.id}) ${opt.text}`)
    .join('\n');
  const answer = Array.isArray(question.correctAnswer)
    ? question.correctAnswer.join(', ')
    : question.correctAnswer;

  return [
    `Example ${index + 1} (id: ${question.id}, difficulty: ${question.difficulty}):`,
    `  Q: ${question.question}`,
    options,
    `  Correct: ${answer}`,
    `  Explanation: ${question.explanation.correct}`,
  ].join('\n');
}

/**
 * Build the user prompt for a topic deep dive.
 *
 * Injects the topic name, description, its real key points (and enriched
 * subtopic content), and — when supplied — a few real practice questions as
 * few-shot examples. A topic with no subtopics/key points, and/or no example
 * questions, still yields a valid prompt.
 *
 * @param topic - The topic to expand.
 * @param exampleQuestions - Real practice questions to use as few-shot
 *   examples (optional; omitted section when empty).
 * @returns The user prompt string.
 */
export function buildDeepDivePrompt(
  topic: Topic,
  exampleQuestions: Question[] = []
): string {
  const grounding = collectGrounding(topic);

  const sections: string[] = [
    `Produce a structured deep dive for the following certification topic (topicId: "${topic.id}").`,
    '',
    `Topic: ${topic.name}`,
    `Description: ${topic.description}`,
  ];

  if (grounding.length > 0) {
    sections.push('', 'Key points and study content to ground the dive in:');
    for (const line of grounding) {
      sections.push(`- ${line}`);
    }
  }

  if (exampleQuestions.length > 0) {
    sections.push(
      '',
      'Example exam questions from the real pool (match their style and difficulty):'
    );
    exampleQuestions.forEach((q, i) => {
      sections.push('', renderExampleQuestion(q, i));
    });
  }

  sections.push(
    '',
    'Return the JSON deep-dive object described in the system prompt: explanatory sections, targeted practice questions, and common exam traps for this domain.'
  );

  return sections.join('\n');
}

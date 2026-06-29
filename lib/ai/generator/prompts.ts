/**
 * AI Question Generation Service - Prompt builders
 *
 * Constructs the system prompt and a user-prompt for asking the configured
 * AI provider to draft candidate exam questions. The model is required to
 * respond with a single strict-JSON array so parsing is deterministic.
 */

import type { GenerationRequest } from './types';

/**
 * System prompt framing the model as an exam-question author. Documents the
 * exact JSON array schema the model must emit (one object per question).
 */
export const GENERATOR_SYSTEM_PROMPT = `You are an expert certification exam-question author.

Your job is to write high-quality multiple-choice (or multi-select) exam questions for the given certification topic. Each question must be unambiguous, exam-realistic, have exactly one defensible key (or a clear set of keys for multi-select), and plausible-but-wrong distractors.

Respond with a SINGLE JSON array and NOTHING else (no markdown, no prose, no code fences). Each element of the array MUST be an object with exactly this shape:

[
  {
    "topicId": <string>,
    "subtopicId": <string>,
    "type": "multiple-choice" | "multi-select",
    "difficulty": "easy" | "medium" | "hard",
    "question": <string, the question stem>,
    "options": [ { "id": <string>, "text": <string> }, ... at least 2 ],
    "correctAnswer": <option id string for multiple-choice, OR array of option id strings for multi-select>,
    "explanation": {
      "correct": <string explaining why the key is correct>,
      "whyOthersWrong": { <optionId>: <string explaining why that option is wrong>, ... }
    },
    "tags": [ <string>, ... ]   // optional
  }
]

Rules:
- correctAnswer MUST reference ids that exist in options.
- whyOthersWrong SHOULD cover every non-correct option id.
- OMIT the "id" and "metadata" fields entirely; the application generates those.
- Return only the JSON array.`;

/**
 * Instruction appended on a retry when the first response could not be parsed.
 */
export const STRICT_JSON_RETRY_INSTRUCTION = `Your previous response could not be parsed. Respond again with ONLY a single valid JSON array matching the required schema. Do not include markdown, code fences, or any explanatory text outside the JSON.`;

/**
 * A compact few-shot example, derived from a real aws-ml question, showing the
 * exact object shape (without id/metadata) the model should emit.
 */
const FEW_SHOT_EXAMPLE = JSON.stringify(
  [
    {
      topicId: 'data-engineering',
      subtopicId: 'data-repositories',
      type: 'multiple-choice',
      difficulty: 'medium',
      question:
        'A company needs to store 500 TB of training data accessed frequently at first and rarely later. Which storage solution gives the best cost-performance balance?',
      options: [
        { id: 'a', text: 'Amazon S3 Standard' },
        { id: 'b', text: 'Amazon S3 Intelligent-Tiering' },
        { id: 'c', text: 'Amazon EFS' },
        { id: 'd', text: 'Amazon EBS' },
      ],
      correctAnswer: 'b',
      explanation: {
        correct:
          'S3 Intelligent-Tiering automatically moves data between access tiers based on usage, optimizing cost without performance impact.',
        whyOthersWrong: {
          a: 'S3 Standard keeps high frequent-access pricing even after training.',
          c: 'EFS is far more expensive for large-scale storage.',
          d: 'EBS is unsuitable for 500 TB of shared training data.',
        },
      },
      tags: ['storage', 's3', 'cost-optimization'],
    },
  ],
  null,
  2
);

/**
 * Build the user-prompt that injects the topic context and generation request.
 *
 * @param request - what to generate (topic, optional subtopic, difficulty,
 *   count, and existing ids to avoid repeating)
 */
export function buildGenerationPrompt(request: GenerationRequest): string {
  const { topic, subtopic, difficulty, count, existingQuestionIds } = request;

  const sections: string[] = [
    `TOPIC ID: ${topic.id}`,
    `TOPIC: ${topic.name}`,
    `TOPIC DESCRIPTION: ${topic.description}`,
  ];

  if (subtopic) {
    sections.push(`SUBTOPIC ID: ${subtopic.id}`);
    sections.push(`SUBTOPIC: ${subtopic.name}`);
    sections.push(`SUBTOPIC DESCRIPTION: ${subtopic.description}`);
    if (subtopic.keyPoints.length > 0) {
      sections.push(
        `SUBTOPIC KEY POINTS:\n${subtopic.keyPoints
          .map((kp) => `  - ${kp}`)
          .join('\n')}`
      );
    }
  }

  sections.push(`REQUESTED DIFFICULTY: ${difficulty}`);
  sections.push(`NUMBER OF QUESTIONS TO GENERATE: ${count}`);

  if (existingQuestionIds.length > 0) {
    sections.push(
      `AVOID REPEATING THE THEMES OF THESE EXISTING QUESTION IDS:\n${existingQuestionIds
        .map((id) => `  - ${id}`)
        .join('\n')}`
    );
  }

  sections.push(`EXAMPLE OF THE REQUIRED OUTPUT SHAPE:\n${FEW_SHOT_EXAMPLE}`);

  sections.push(
    `Generate exactly ${count} new "${difficulty}" question(s) for the topic above. Use the topicId "${topic.id}"${
      subtopic ? ` and subtopicId "${subtopic.id}"` : ''
    }. Respond with the required JSON array only.`
  );

  return sections.join('\n\n');
}

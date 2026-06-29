/**
 * AI Validator Agent - Prompt builders
 *
 * Constructs the system prompt and a user-prompt for asking the configured
 * AI provider to review a single exam `Question`. The model is required to
 * respond with a single strict-JSON object so parsing is deterministic.
 */

import type { Question, Topic, Subtopic } from '@/lib/types/certification';

/**
 * System prompt framing the model as a strict exam-question reviewer.
 * Documents the exact JSON schema the model must emit.
 */
export const VALIDATOR_SYSTEM_PROMPT = `You are a strict certification exam-question reviewer.

Your job is to review a single multiple-choice (or multi-select) exam question and score it for quality. You must be rigorous and skeptical: penalise ambiguous wording, options that overlap, mis-keyed answers, and questions that drift from the stated topic.

Respond with a SINGLE JSON object and NOTHING else (no markdown, no prose, no code fences). The JSON object MUST have exactly this shape:

{
  "clarity": <number 0-10>,
  "topicAlignment": <number 0-10>,
  "correctness": <number 0-10>,
  "difficulty": <number 0-10>,
  "overall": <number 0-10>,
  "confidence": <number 0-1>,
  "reasoning": <string explaining the scores>,
  "issues": <array of human-readable problem strings, may be empty>
}

Scoring guidance:
- clarity: is the question unambiguous and well written?
- topicAlignment: does the question fit the stated topic and subtopic?
- correctness: is the keyed correct answer actually correct and the distractors wrong?
- difficulty: how challenging is the question (0 = trivial, 10 = expert)?
- overall: your holistic quality score for the question.
- confidence: how confident you are in this assessment (0 = unsure, 1 = certain).

Return only the JSON object.`;

/**
 * Instruction appended on a retry when the first response could not be parsed.
 */
export const STRICT_JSON_RETRY_INSTRUCTION = `Your previous response could not be parsed. Respond again with ONLY a single valid JSON object matching the required schema. Do not include markdown, code fences, or any explanatory text outside the JSON.`;

/**
 * Render a correct answer (single id or array of ids) as a readable string.
 */
function formatCorrectAnswer(correctAnswer: string | string[]): string {
  return Array.isArray(correctAnswer)
    ? correctAnswer.join(', ')
    : correctAnswer;
}

/**
 * Build the user-prompt that injects the question and its topic context.
 *
 * @param question - the question to validate
 * @param topic - the topic the question belongs to
 * @param subtopic - optional subtopic for extra grounding (key points)
 */
export function buildValidationPrompt(
  question: Question,
  topic: Topic,
  subtopic?: Subtopic
): string {
  const optionLines = question.options
    .map((opt) => `  (${opt.id}) ${opt.text}`)
    .join('\n');

  const whyOthersWrong = Object.entries(question.explanation.whyOthersWrong)
    .map(([id, reason]) => `  (${id}) ${reason}`)
    .join('\n');

  const sections: string[] = [
    `TOPIC: ${topic.name}`,
    `TOPIC DESCRIPTION: ${topic.description}`,
  ];

  if (subtopic) {
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

  sections.push(`QUESTION TYPE: ${question.type}`);
  sections.push(`KEYED DIFFICULTY: ${question.difficulty}`);
  sections.push(`QUESTION: ${question.question}`);
  sections.push(`OPTIONS:\n${optionLines}`);
  sections.push(`CORRECT ANSWER: ${formatCorrectAnswer(question.correctAnswer)}`);
  sections.push(`EXPLANATION (why correct): ${question.explanation.correct}`);
  if (whyOthersWrong) {
    sections.push(`EXPLANATION (why others wrong):\n${whyOthersWrong}`);
  }

  sections.push(
    'Review the question above and respond with the required JSON object only.'
  );

  return sections.join('\n\n');
}

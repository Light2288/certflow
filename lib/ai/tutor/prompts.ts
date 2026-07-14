/**
 * AI Tutor - Prompt builder
 *
 * Constructs a certification-grounded system prompt for the AI Tutor.
 * The prompt frames the model as an expert study tutor for a specific
 * certification and injects the exam's identity, exam details, and its
 * domains/subtopics (with weights and key points) so answers stay grounded
 * in the selected exam rather than being generic.
 *
 * Mirrors the pattern used by the question generator in
 * `lib/ai/generator/prompts.ts` (a framing system-prompt constant plus a
 * `build...` function that assembles context sections joined with blank
 * lines). Unlike the generator, the tutor produces free-form prose answers,
 * so no strict-JSON schema is imposed.
 */

import type {
  CertificationConfig,
  TopicsData,
} from '@/lib/types/certification';

/**
 * System prompt framing the model as a certification study tutor. The
 * certification-specific context is appended by `buildTutorSystemPrompt`.
 */
export const TUTOR_SYSTEM_PROMPT = `You are an expert, patient certification study tutor.

Your job is to help the learner prepare for a specific certification exam. Explain concepts clearly, give exam-relevant guidance, offer study strategies, and answer questions accurately. Stay grounded in the certification's exam domains and their relative weights described below — prioritise the topics that matter most for this exam. If a question falls outside the certification's scope, say so briefly and steer the learner back to exam-relevant material.

Answer in clear, well-structured prose (Markdown is welcome). Do not fabricate exam details; rely on the context provided below.`;

/**
 * Build the full tutor system prompt for a given certification, injecting its
 * identity, exam details, and domain/subtopic context.
 *
 * @param config - the certification's `config.json` contents
 * @param topics - the certification's `topics.json` contents
 */
export function buildTutorSystemPrompt(
  config: CertificationConfig,
  topics: TopicsData
): string {
  const { examDetails } = config;

  const sections: string[] = [
    TUTOR_SYSTEM_PROMPT,
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
      const lines: string[] = [
        `- ${topic.name} (${topic.weight}% of the exam)`,
      ];

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

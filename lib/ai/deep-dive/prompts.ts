/**
 * Topic Deep Dive — Prompts
 *
 * Builds the prompt used to ask an AI provider to expand a certification topic
 * into a structured markdown deep dive. Grounded in the topic's name,
 * description, and the key points aggregated from its subtopics.
 */

import type { Topic } from '@/lib/types/certification';

/**
 * System prompt framing the model as an expert certification tutor that
 * returns a structured markdown explanation.
 */
export const DEEP_DIVE_SYSTEM_PROMPT = `You are an expert certification tutor.
When asked to explain a topic, produce a clear, well-structured markdown deep
dive aimed at a candidate preparing for a professional certification exam.

Always organise your answer into these four markdown sections, using level-2
headings (##):

## Overview
A concise conceptual explanation of the topic.

## Worked Examples
One or two concrete, worked examples that illustrate the topic in practice.

## Real-World Context
How this topic is applied in real systems and why it matters.

## Exam Tips
Focused, actionable tips for answering exam questions on this topic.

Use markdown formatting (headings, lists, code blocks, bold) so the response
renders cleanly. Ground your explanation strictly in the provided topic
context.`;

/**
 * Aggregate the key points from a topic's subtopics into a flat list.
 */
function collectKeyPoints(topic: Topic): string[] {
  return (topic.subtopics ?? []).flatMap((subtopic) => subtopic.keyPoints ?? []);
}

/**
 * Build the user prompt for a topic deep dive.
 *
 * Injects the topic name, description, and any key points aggregated from its
 * subtopics. A topic with no subtopics or key points still yields a valid
 * prompt built from its name and description.
 *
 * @param topic - The topic to expand.
 * @returns The user prompt string.
 */
export function buildDeepDivePrompt(topic: Topic): string {
  const keyPoints = collectKeyPoints(topic);

  const sections: string[] = [
    DEEP_DIVE_SYSTEM_PROMPT,
    '',
    `Provide a deep dive on the following certification topic.`,
    '',
    `Topic: ${topic.name}`,
    `Description: ${topic.description}`,
  ];

  if (keyPoints.length > 0) {
    sections.push('', 'Key points to cover:');
    for (const point of keyPoints) {
      sections.push(`- ${point}`);
    }
  }

  sections.push(
    '',
    'Respond with the four sections described above: Overview, Worked Examples, Real-World Context, and Exam Tips.'
  );

  return sections.join('\n');
}

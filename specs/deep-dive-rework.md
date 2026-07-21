# Deep Dive Rework

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Deep Dive Rework                                       |
| **Type**      | refactor                                               |
| **Scope**     | Topic Deep Dive (lib/ai/deep-dive, DeepDiveButton)    |
| **Created**   | 2026-07-22 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

"Deep Dive with AI" is currently low-value. `buildDeepDivePrompt` in
`lib/ai/deep-dive/prompts.ts` asks the model for a generic four-section
markdown essay (Overview / Worked Examples / Real-World Context / Exam
Tips) built almost entirely from the topic's `name` and `description`. It
overlaps heavily with the AI Tutor, is not persisted (every click
regenerates from scratch), and produces prose that users find unhelpful
for actual exam prep. It should be reworked into something genuinely
useful: grounded in the topic's real content and the certification's real
question pool, revisitable, and actionable.

## Current Behavior

- `DeepDiveButton.tsx` triggers `generateDeepDive(topic, service)` in
  `lib/ai/deep-dive/deep-dive-service.ts`.
- `generateDeepDive` builds a prompt via `buildDeepDivePrompt(topic)`,
  calls `service.chat(prompt)`, and returns the raw markdown string.
- The prompt injects only the topic `name`, `description`, and key points
  aggregated from subtopics, and requests a fixed four-section essay.
- Output is not persisted; each click re-invokes the provider.
- Ollama requests now route through `/api/chat` (recently changed).
- There is no use of the certification's practice-question pool and no
  reuse of the certification-grounding system-prompt pattern from
  `tutor-certification-grounding`.

## Desired Outcome

The deep dive becomes a grounded, persisted, actionable study artifact for
a specific topic:

- **Grounded in real content.** The prompt is built from the topic's real
  `keyPoints` (from its subtopics, and the richer per-subtopic content
  delivered by `topics-schema-enrichment`) rather than just name and
  description.
- **Few-shot grounded in the real question pool.** A small number of real
  practice questions drawn from the certification's pool for this
  topic/domain are included as few-shot examples, so generated output
  matches the exam's real style, difficulty, and phrasing.
- **Reuses cert-grounding.** The system prompt reuses the
  certification-grounded system-prompt pattern established in
  `tutor-certification-grounding` (framing role + injected certification
  context), so the dive is anchored to the selected certification.
- **Actionable output.** Instead of a generic essay, the dive produces
  concrete, exam-focused material — e.g. targeted practice questions for
  the topic and "common exam traps" tied to the domain's real questions —
  represented as a **structured object** (sections plus arrays of
  targeted practice questions and exam traps), persisted as JSON.
- **Cached / persisted.** Generated dives are stored in `localStorage`,
  keyed per topic (e.g. `certflow:deep-dive:<certId>:<topicId>`),
  mirroring the store pattern in `lib/ai/generator/question-store.ts`
  (get / add / clear, defensive parsing, graceful storage failures). A
  cached dive is loaded and shown on subsequent clicks instead of being
  regenerated, with an explicit way to regenerate.

## Acceptance Criteria

- [ ] The deep-dive prompt is grounded in the topic's real `keyPoints`
      (from subtopics / enriched per-subtopic content), not just `name`
      and `description`.
- [ ] A few-shot section injects a small number of real practice
      questions from the certification's pool for the relevant
      topic/domain into the prompt.
- [ ] The system prompt reuses the certification-grounding system-prompt
      pattern from `tutor-certification-grounding` (framing role +
      injected certification context).
- [ ] A generated deep dive is a **structured object** including at least:
      explanatory sections, an array of targeted practice questions, and
      an array of "common exam traps" tied to the domain's questions.
- [ ] Generated dives are persisted to `localStorage` keyed per topic
      (e.g. `certflow:deep-dive:<certId>:<topicId>`), via a store module
      that mirrors `lib/ai/generator/question-store.ts` (get / add /
      clear, defensive parse, swallowed write failures).
- [ ] On subsequent opens, a cached dive for the topic is loaded and
      displayed without calling the provider.
- [ ] The user can explicitly regenerate a dive (replacing the cached
      entry) rather than being stuck with the first result.
- [ ] The Ollama path continues to route through `/api/chat` (no
      regression from the recent change).
- [ ] No changes to the `AIProvider` / provider `chat(...)` interface.
- [ ] No new dependencies are added.
- [ ] Existing deep-dive tests are updated to reflect the new shape and
      remain green.

## Edge Cases & Error Handling

- **No practice questions available for the topic/domain**: build the
  prompt without the few-shot section; still produce a grounded dive.
- **No certification selected / cert context fails to load**: fall back
  to a topic-only grounded dive (mirror the tutor's graceful fallback);
  log, do not surface a hard error.
- **Empty / whitespace provider response**: preserve the existing
  `EMPTY_RESPONSE` `AIServiceError` behaviour so the UI can show a
  friendly fallback.
- **Malformed / non-conforming structured output from the model**: parse
  defensively; if the structured shape cannot be recovered, treat it as a
  failed generation (do not persist a corrupt entry).
- **Corrupt / non-parseable cached entry**: drop it defensively and
  regenerate (mirror `question-store` parsing behaviour).
- **localStorage unavailable or write fails (quota)**: degrade gracefully
  — show the freshly generated dive in-session without persisting.

## Dependencies & Constraints

- **Depends on `topics-schema-enrichment`** for the richer per-subtopic
  content used to ground the dive.
- **Reuses `tutor-certification-grounding`**'s system-prompt pattern.
- Sequencing: this is intended to be done **last**, after both of the
  above are in place.
- No new dependencies; no change to the provider interface.
- Cache module mirrors `lib/ai/generator/question-store.ts` conventions
  (key prefix, defensive reads, swallowed write errors).
- Confined to `lib/ai/deep-dive/` and
  `app/topics/[topicId]/components/DeepDiveButton.tsx` (plus a new
  deep-dive store module under `lib/ai/deep-dive/`).

## Out of Scope

- Server-side persistence or cross-device sync of dives (localStorage
  only).
- Cache size capping / eviction (mirrors the existing documented
  unbounded-growth concern in `question-store.ts`).
- Broader RAG/retrieval beyond the few-shot question sampling described
  here.
- Changes to the AI Tutor itself.

## Notes

- Store pattern to mirror: `lib/ai/generator/question-store.ts`
  (`KEY_PREFIX`, `getApproved` / `addApproved` / `clear`, `hasStorage`
  guard, defensive `JSON.parse` and validation).
- Cert-grounding pattern to reuse: `specs/tutor-certification-grounding.md`
  (framing role + injected certification context, memoized per cert).
- Current files to rework: `lib/ai/deep-dive/prompts.ts`,
  `lib/ai/deep-dive/deep-dive-service.ts`,
  `lib/ai/deep-dive/index.ts`,
  `lib/ai/deep-dive/__tests__/deep-dive-service.test.ts`,
  `app/topics/[topicId]/components/DeepDiveButton.tsx`.
- Cache key granularity confirmed: per topic
  (`certflow:deep-dive:<certId>:<topicId>`).

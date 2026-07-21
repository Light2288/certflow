# Topics Schema Enrichment

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Topics Schema Enrichment                               |
| **Type**      | feature                                                |
| **Scope**     | certification topics (schema, loader, data, UI, tooling) |
| **Created**   | 2026-07-21 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The certification topics model is shallow. A `Topic` has a name, description,
weight, order, and a list of `Subtopic`s; each `Subtopic` carries only a name,
description, and `keyPoints: string[]`. This is defined in
`lib/types/certification.ts`.

As a result, the topics experience is thin:

- The topic list card (`app/topics/components/TopicCard.tsx`) shows only name,
  description, weight, and a subtopic count.
- `keyPoints` only surface on the detail page
  (`app/topics/[topicId]/page.tsx`); there is nowhere to hold real study
  material (explanations, references, difficulty, effort estimates).
- There is no per-topic or per-subtopic question count anywhere, even though
  `questions.json` already links every question to a `topicId`/`subtopicId`.

Learners cannot gauge how much material or practice a topic involves before
diving in, and authors have no structured place to capture study depth.

## Current Behavior

- `Subtopic` is `{ id, name, description, keyPoints: string[] }`.
- `TopicCard` renders name, description (line-clamped), a weight badge, and
  `topic.subtopics.length` as a subtopic count.
- The detail page renders the topic header (name, description, weight,
  subtopic count) and, per subtopic, its description plus a "Key Points" list.
- No question counts are shown at the topic or subtopic level.
- `topics.json` for all three certifications
  (`snowpro-core`, `aws-developer-associate`, `aws-data-engineer-associate`)
  is hand-maintained; `study-materials/author-questions.mjs` and
  `study-materials/mappings/*` only author `questions.json`.
- The strict test at `lib/loaders/__tests__/certification-data.test.ts`
  enforces (among other rules) that topic weights sum to 100, ids are unique,
  and every question resolves to an existing topic/subtopic.

## Desired Outcome

The `Subtopic` schema is extended with richer, **optional** study fields, the
topics UI presents this depth, and per-topic/per-subtopic question counts are
surfaced by joining `questions.json` at load time.

**Schema (`lib/types/certification.ts`)** — extend `Subtopic` with optional
fields so existing data stays valid and the UI degrades gracefully:

- `content?: string` — a markdown explanation / study note.
- `references?: string[]` — external doc/links, mirroring `Question.references`.
- `difficulty?: DifficultyLevel` — reuses the existing `easy | medium | hard`
  scale.
- `estimatedStudyMinutes?: number` — estimated study time for the subtopic.

**Question counts (derived, not stored)** — add loader helper(s) that compute
counts by joining a `QuestionsData` against topics: total questions per topic,
and per subtopic. No new stored fields in `topics.json`; counts are always
computed from `questions.json` so they cannot drift.

**Loader & validators (`lib/loaders/certification-loader.ts`)** — validation of
the new optional fields when present (e.g. `difficulty` must be one of the
allowed values, `estimatedStudyMinutes` non-negative, `references` an array of
strings). Absent fields must not produce errors. Add the question-count
helper(s) here alongside the existing `getQuestionsByTopic` utilities.

**UI** — improve both surfaces:

- `TopicCard`: surface a per-topic question count alongside the existing
  subtopic count (and any other cheap depth signal that reads well).
- Topic detail page: render each subtopic's `content` as **properly formatted
  markdown**, show `references` as links, show `difficulty` and
  `estimatedStudyMinutes` when present, and show a per-subtopic question count.

**Tooling** — add a new `study-materials/author-topics.mjs` script (mirroring
`author-questions.mjs`, with per-cert mapping support under
`study-materials/mappings/*`) that scaffolds/enriches `topics.json` with the
new optional fields. `topics.json` remains a valid hand-editable file; the
script assists authoring rather than replacing it.

**Backfill** — implement full end-to-end support (schema + loader + UI +
tooling) and author a **representative sample** of real enriched content (e.g.
one certification, or a handful of subtopics) to prove the pipeline end to end.
The remaining subtopics are enriched incrementally later; because the fields
are optional, un-enriched subtopics continue to render as they do today.

## Acceptance Criteria

- [ ] `Subtopic` in `lib/types/certification.ts` gains optional `content`,
      `references`, `difficulty`, and `estimatedStudyMinutes` fields; existing
      `id`, `name`, `description`, `keyPoints` are unchanged.
- [ ] `difficulty` on a subtopic reuses the existing `DifficultyLevel`
      (`easy | medium | hard`) type.
- [ ] `validateTopics` (or a subtopic validator it calls) validates the new
      fields **only when present**: `difficulty` must be a valid level,
      `estimatedStudyMinutes` must be a non-negative number, `references` must
      be an array of strings. Missing fields produce no errors.
- [ ] A loader helper computes per-topic and per-subtopic question counts by
      joining a `QuestionsData`; counts derive from `questions.json` and are
      not stored in `topics.json`.
- [ ] `TopicCard` displays a per-topic question count in addition to the
      existing subtopic count.
- [ ] The topic detail page renders subtopic `content` as formatted markdown,
      renders `references` as links, and shows `difficulty`,
      `estimatedStudyMinutes`, and a per-subtopic question count when available.
- [ ] Subtopics without the new fields render exactly as before (graceful
      degradation) — the "Key Points" list continues to work.
- [ ] A new `study-materials/author-topics.mjs` script exists with per-cert
      mapping support and can scaffold/enrich `topics.json` with the new fields.
- [ ] A representative sample of subtopics is backfilled with real enriched
      content across at least one certification.
- [ ] `lib/loaders/__tests__/certification-data.test.ts` still passes
      unchanged in intent: topic weights sum to 100, ids remain unique, and all
      question references still resolve for all three certifications.

## Edge Cases & Error Handling

- Subtopic with none of the new fields: renders as today; no validation errors.
- Subtopic with `content` but empty/missing `keyPoints`: markdown renders, the
  Key Points section is omitted.
- Topic or subtopic with zero associated questions: question count shows `0`
  (or a neutral "no questions yet" affordance) rather than breaking.
- `estimatedStudyMinutes` of `0` vs. missing: `0` is a valid value; missing is
  simply not displayed.
- Invalid `difficulty` value or negative `estimatedStudyMinutes` in
  `topics.json`: caught by the validator as an error.
- Markdown `content` containing links/HTML: rendered safely (no raw HTML
  injection); the chosen renderer must sanitize or escape untrusted markup.
- Question counts must remain correct if a question's `topicId`/`subtopicId`
  changes, since they are computed at load time.

## Dependencies & Constraints

- The strict validator/test `lib/loaders/__tests__/certification-data.test.ts`
  must keep passing; topic weights must continue to sum to 100.
- Changes touch: `lib/types/certification.ts` (types),
  `lib/loaders/certification-loader.ts` (loader + validators),
  all three certs' `topics.json`
  (`snowpro-core`, `aws-developer-associate`, `aws-data-engineer-associate`),
  the topics UI (`app/topics/components/TopicCard.tsx`,
  `app/topics/[topicId]/page.tsx`), and the git-ignored study-materials
  authoring tooling (`study-materials/author-topics.mjs` (new),
  `study-materials/mappings/*`, and however topics are authored).
- New subtopic fields must be **optional** to avoid a mandatory backfill and to
  keep the strict test green.
- Question counts are **derived at runtime** from `questions.json`, not stored.
- Rendering markdown requires a markdown renderer in the topics UI; this repo
  is a Next.js app whose conventions differ from common defaults — consult
  `node_modules/next/dist/docs/` before adding rendering dependencies or
  components.
- Subtopic `difficulty` reuses `DifficultyLevel` (`easy | medium | hard`).

## Out of Scope

- Backfilling enriched content for every subtopic across all three certs (only
  a representative sample is authored here).
- Storing question counts in `topics.json`.
- Changing the question schema, the quiz/simulator, or the tutor experience.
- Reworking topic `weight`/`order` semantics or the config schema.
- Adding new certifications.

## Notes

- The `references` shape intentionally mirrors `Question.references: string[]`
  for consistency.
- The `difficulty` scale intentionally reuses question `DifficultyLevel` rather
  than the config metadata `beginner | intermediate | advanced` scale, for
  schema consistency.
- Topics currently appear hand-maintained; `author-questions.mjs` +
  `mappings/*` only produce `questions.json`. The new `author-topics.mjs`
  brings topic enrichment under the same tooling pattern.

# Plan: Topics Schema Enrichment

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Topics Schema Enrichment           |
| **Spec**     | specs/topics-schema-enrichment.md  |
| **Type**     | feature                            |
| **Branch**   | feat/topics-schema-enrichment      |
| **Created**  | 2026-07-21 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The certification topics model is shallow (`Subtopic` only has `id`, `name`,
`description`, `keyPoints`), the topics UI shows little depth, and no question
counts are surfaced anywhere. This plan extends `Subtopic` with optional study
fields, derives per-topic/per-subtopic question counts at runtime from
`questions.json`, enriches the topics UI (including markdown rendering), and
adds an `author-topics.mjs` authoring tool — all while keeping the strict data
test green.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/topics-schema-enrichment`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/topics-schema-enrichment
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one
commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (Vitest, single run) |
| Build  | `npm run build` (Next.js) |
| Lint   | `npm run lint` (ESLint) |

## Tasks

### Task 1: Extend the `Subtopic` type with optional study fields `[S]`

**Goal**: Add the new optional fields to the `Subtopic` interface so all other
work has types to build on.

**Files**:

| File                            | Action | Description                          |
|---------------------------------|--------|--------------------------------------|
| `lib/types/certification.ts`    | modify | Add optional fields to `Subtopic`    |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/types/certification.ts`  | Existing `DifficultyLevel` type (`easy \| medium \| hard`); `Question.references: string[]` shape |

**Steps**:

1. In the `Subtopic` interface, add: `content?: string`,
   `references?: string[]`, `difficulty?: DifficultyLevel`,
   `estimatedStudyMinutes?: number`. Leave `id`, `name`, `description`,
   `keyPoints` unchanged.
2. `DifficultyLevel` is already declared in the same file — reuse it directly;
   do not introduce a new scale.

**Tests**:

- No dedicated test; this is a type-only change verified by `tsc`/build and by
  downstream tasks. Existing tests must still compile.

**Acceptance criteria covered**: Subtopic gains optional fields; difficulty
reuses `DifficultyLevel`.

**Commit**: `feat(types): add optional study fields to Subtopic`

---

### Task 2: Validate the new optional subtopic fields in the loader `[M]`

**Goal**: Extend topic validation so the new fields are checked **only when
present**, with unit coverage.

**Files**:

| File                                                    | Action | Description                                            |
|---------------------------------------------------------|--------|--------------------------------------------------------|
| `lib/loaders/certification-loader.ts`                   | modify | Add per-subtopic field validation inside `validateTopics` (or a helper it calls) |
| `lib/loaders/__tests__/certification-loader.test.ts`    | modify | Add cases for valid/invalid new fields                 |

**Reuse**:

| File                                    | What to reuse                                      |
|-----------------------------------------|----------------------------------------------------|
| `lib/loaders/certification-loader.ts`   | `validateTopics` structure, `ValidationError`/`ValidationWarning` push pattern, the `['easy','medium','hard'].includes(...)` check already used in `validateQuestion` |
| `test/helpers/mock-data.ts`             | `mockTopicsData` / `invalidTopicsData` fixtures     |

**Steps**:

1. In `validateTopics`, within the per-subtopic loop (currently topics only
   validate `id`/`name`/`weight`/`subtopics`), iterate subtopics and, when a
   new field is present, validate it:
   - `difficulty` present → must be one of `easy | medium | hard`, else error.
   - `estimatedStudyMinutes` present → must be a number `>= 0`, else error.
   - `references` present → must be an array of strings, else error.
   - `content` present → must be a string (optional: warn if empty).
2. Absent fields must add **no** errors or warnings (graceful optionality).
3. Keep the existing weight-sum warning and subtopics-array checks intact.
4. Add unit tests: a subtopic with all new fields valid passes; each invalid
   variant (bad difficulty, negative minutes, non-array references) produces
   the expected error; a subtopic with none of the new fields still passes.

**Tests**:

- `lib/loaders/__tests__/certification-loader.test.ts`: extend the
  `validateTopics` describe block with the scenarios above.

**Acceptance criteria covered**: validator checks new fields only when present;
missing fields produce no errors.

**Commit**: `feat(loader): validate optional subtopic study fields`

---

### Task 3: Add derived question-count helpers `[M]`

**Goal**: Provide loader helpers that compute per-topic and per-subtopic
question counts by joining a `QuestionsData`, with unit coverage.

**Files**:

| File                                                    | Action | Description                                       |
|---------------------------------------------------------|--------|---------------------------------------------------|
| `lib/loaders/certification-loader.ts`                   | modify | Add `countQuestionsByTopic` / `countQuestionsBySubtopic` (names TBD) helpers |
| `lib/loaders/__tests__/certification-loader.test.ts`    | modify | Unit tests for the new helpers                    |

**Reuse**:

| File                                    | What to reuse                                          |
|-----------------------------------------|--------------------------------------------------------|
| `lib/loaders/certification-loader.ts`   | Existing `getQuestionsByTopic(topicId, questions)` in the HELPER FUNCTIONS section; place new helpers alongside it |
| `test/helpers/mock-data.ts`             | `mockQuestionsData`, `mockTopicsData`                  |

**Steps**:

1. Add a helper that returns a per-topic count map:
   `countQuestionsByTopic(questions: QuestionsData): Record<string, number>`
   grouping by `q.topicId`.
2. Add a helper that returns per-subtopic counts, e.g.
   `countQuestionsBySubtopic(questions: QuestionsData): Record<string, Record<string, number>>`
   keyed by `topicId` then `subtopicId` (or a flat `topicId:subtopicId` key —
   choose the shape the UI in Tasks 5–6 consumes most cleanly).
3. Counts derive purely from `questions.json`; do not read/write `topics.json`.
   Topics/subtopics with zero questions simply return `0` (or absent key → the
   UI treats missing as `0`).
4. Add unit tests covering: multiple questions across topics/subtopics, a topic
   with zero questions, and an empty questions array.

**Tests**:

- `lib/loaders/__tests__/certification-loader.test.ts`: new describe block for
  the count helpers.

**Acceptance criteria covered**: derived per-topic/per-subtopic counts from
`questions.json`, not stored.

**Commit**: `feat(loader): add derived question-count helpers`

---

### Task 4: Extract shared markdown renderer components `[S]`

**Goal**: Move the existing `markdownComponents` map into a reusable module so
the topic detail page can render subtopic `content` consistently with the rest
of the app.

**Files**:

| File                                                       | Action | Description                                        |
|------------------------------------------------------------|--------|----------------------------------------------------|
| `app/topics/[topicId]/components/markdown-components.tsx`  | create | Export the shared `markdownComponents` map (and `CodeRendererProps`) |
| `app/topics/[topicId]/components/DeepDiveButton.tsx`       | modify | Import the shared map instead of defining it inline |

**Reuse**:

| File                                                    | What to reuse                                                        |
|---------------------------------------------------------|----------------------------------------------------------------------|
| `app/topics/[topicId]/components/DeepDiveButton.tsx`    | The existing `markdownComponents` object (lines ~54–83) and `CodeRendererProps` type — move verbatim; `react-markdown` + `remark-gfm` are already dependencies |

**Steps**:

1. Create `markdown-components.tsx` exporting the `markdownComponents` map and
   the `CodeRendererProps` type currently inline in `DeepDiveButton.tsx`.
2. Update `DeepDiveButton.tsx` to import from the new module; remove the inline
   definition. Behaviour is unchanged.
3. No new dependency is needed (`react-markdown`, `remark-gfm`, `rehype-raw`
   already in `package.json`).

**Tests**:

- Existing `DeepDiveButton.test.tsx` must still pass unchanged, confirming the
  refactor is behaviour-preserving.

**Acceptance criteria covered**: enables markdown rendering on the detail page
(supports the criterion satisfied in Task 6).

**Commit**: `refactor(topics): extract shared markdown components`

---

### Task 5: Show per-topic question count on the topic list `[M]`

**Goal**: Surface a per-topic question count on `TopicCard`, loading questions
on the topics list page to compute counts.

**Files**:

| File                                                    | Action | Description                                            |
|---------------------------------------------------------|--------|--------------------------------------------------------|
| `app/topics/components/TopicCard.tsx`                   | modify | Accept an optional `questionCount` prop and render it next to the subtopic count |
| `app/topics/page.tsx`                                   | modify | Load questions alongside topics; compute counts; pass to `TopicCard` |
| `app/topics/components/__tests__/TopicCard.test.tsx`    | modify | Add tests for the question-count display incl. `0`     |

**Reuse**:

| File                                          | What to reuse                                                  |
|-----------------------------------------------|----------------------------------------------------------------|
| `lib/loaders/certification-loader.ts`         | `loadCertificationQuestions` and the count helper from Task 3  |
| `app/topics/page.tsx`                          | Existing `useEffect` load pattern and `useSettings()` for `currentCertificationId` |
| `app/topics/components/TopicCard.tsx`          | Existing footer/count markup and icon styling                  |

**Steps**:

1. Add an optional prop to `TopicCard`, e.g.
   `questionCount?: number`, and render it in the footer beside the subtopic
   count (mirroring the existing subtopic-count markup/icon). Show `0`
   gracefully (e.g. "0 questions").
2. In `app/topics/page.tsx`, load questions in the same `useEffect`
   (`loadCertificationQuestions(currentCertificationId)`), compute the
   per-topic count map via the Task 3 helper, and pass
   `questionCount={counts[topic.id] ?? 0}` to each `TopicCard`.
3. Keep the count optional so `TopicCard` remains usable without it (existing
   tests pass a bare `topic`).
4. Update `TopicCard.test.tsx`: assert the count renders when provided, handles
   singular/plural, and shows `0` when zero; existing no-prop tests remain
   valid.

**Tests**:

- `app/topics/components/__tests__/TopicCard.test.tsx`: new cases for the
  `questionCount` prop.

**Acceptance criteria covered**: `TopicCard` displays a per-topic question
count in addition to the subtopic count.

**Commit**: `feat(topics): show per-topic question count on topic cards`

---

### Task 6: Enrich the topic detail page `[M]`

**Goal**: Render subtopic `content` as markdown, `references` as links,
`difficulty`, `estimatedStudyMinutes`, and per-subtopic question counts — all
degrading gracefully when absent.

**Files**:

| File                                             | Action | Description                                            |
|--------------------------------------------------|--------|--------------------------------------------------------|
| `app/topics/[topicId]/page.tsx`                  | modify | Load questions; render new subtopic fields + per-subtopic counts |
| `app/topics/[topicId]/__tests__/page.test.tsx`   | modify | Add tests for enriched rendering and graceful degradation |

**Reuse**:

| File                                                       | What to reuse                                                    |
|------------------------------------------------------------|------------------------------------------------------------------|
| `app/topics/[topicId]/components/markdown-components.tsx`  | Shared `markdownComponents` from Task 4                          |
| `app/topics/[topicId]/page.tsx`                            | Existing subtopic card markup, `keyPoints` list, `useEffect`/`useSettings` load pattern |
| `lib/loaders/certification-loader.ts`                      | `loadCertificationQuestions` + Task 3 per-subtopic count helper  |

**Steps**:

1. In `page.tsx`, also load questions for `currentCertificationId` and compute
   the per-subtopic count map (Task 3 helper).
2. In each subtopic card:
   - When `subtopic.content` is present, render it with `ReactMarkdown`
     (`remarkPlugins={[remarkGfm]}`, `components={markdownComponents}`) inside a
     `prose` wrapper as in `DeepDiveButton`.
   - When `subtopic.references?.length`, render a "References" list of external
     links (`target="_blank" rel="noopener noreferrer"`).
   - When `subtopic.difficulty` is present, render a difficulty badge.
   - When `subtopic.estimatedStudyMinutes` is present (including `0`), render an
     estimated-time label; omit only when the field is absent/undefined.
   - Render the per-subtopic question count (show `0` gracefully).
   - Keep the existing "Key Points" block; render it only when `keyPoints`
     is non-empty (already the case).
3. Ensure subtopics with none of the new fields render exactly as before.
4. Untrusted markup: keep rendering via `react-markdown` (no `rehype-raw` for
   authored subtopic content) so raw HTML in `content` is not injected — matches
   the DeepDiveButton setup, which uses only `remark-gfm`.

**Tests**:

- `app/topics/[topicId]/__tests__/page.test.tsx`: a subtopic with all new
  fields renders content/references/difficulty/time/count; a bare subtopic
  renders as before (no crash, key points still shown).

**Acceptance criteria covered**: detail page renders content as markdown,
references as links, difficulty, estimatedStudyMinutes, and per-subtopic
question count when available; graceful degradation.

**Commit**: `feat(topics): render enriched subtopic detail`

---

### Task 7: Add `author-topics.mjs` authoring tool `[M]`

**Goal**: Add a study-materials script that scaffolds/enriches `topics.json`
with the new optional fields, mirroring `author-questions.mjs` and using
per-cert mapping support.

**Files**:

| File                                              | Action        | Description                                          |
|---------------------------------------------------|---------------|------------------------------------------------------|
| `study-materials/author-topics.mjs`               | create        | New authoring script                                 |
| `study-materials/mappings/<certId>.mjs`           | modify (opt.) | Add optional topic-enrichment export(s) if the script consumes mappings |

**Reuse**:

| File                                        | What to reuse                                                     |
|---------------------------------------------|-------------------------------------------------------------------|
| `study-materials/author-questions.mjs`      | CLI arg parsing, `readFile`/`writeFile`, `__dirname` via `fileURLToPath`, dynamic `import(pathToFileURL(...))` of the mapping module, output-path construction under `public/data/certifications/<certId>/`, and the trailing-newline JSON write style |
| `study-materials/mappings/snowpro-core.mjs` | Existing `assign`/`fallback`/`tagsFor` export pattern             |

**Steps**:

1. Create `author-topics.mjs` that: reads the existing
   `public/data/certifications/<certId>/topics.json`, and for each subtopic
   merges in the new optional fields, preserving existing fields and never
   removing `keyPoints`/`description`.
2. Source of enrichment: load an optional per-cert enrichment map from
   `study-materials/mappings/<certId>.mjs` (a new optional export, e.g.
   `enrichSubtopic(topic, subtopic)` returning partial fields) so authoring
   stays cert-specific and reusable — mirroring how `author-questions.mjs`
   imports `assign`/`fallback`/`tagsFor`.
3. Preserve the invariant that topic `weight`s and ids are untouched (the tool
   only enriches subtopic fields), so the strict test stays green.
4. Write back to the same `topics.json` with the existing 2-space +
   trailing-newline formatting used by `author-questions.mjs`.
5. Document usage in a header comment mirroring `author-questions.mjs`
   (e.g. `node study-materials/author-topics.mjs <certId>`).

**Tests**:

- `study-materials/` is git-ignored tooling; no Vitest coverage. Verify by
  running the script against one cert and confirming
  `npm run test:run` still passes (weights/ids/references intact).

**Acceptance criteria covered**: new `author-topics.mjs` with per-cert mapping
support can scaffold/enrich `topics.json`.

**Commit**: `feat(tooling): add author-topics enrichment script`

---

### Task 8: Backfill a representative sample of enriched content `[M]`

**Goal**: Populate real enriched content for a representative sample (at least
one certification) to prove the pipeline end to end, keeping the strict test
green.

**Files**:

| File                                                                 | Action | Description                                      |
|----------------------------------------------------------------------|--------|--------------------------------------------------|
| `public/data/certifications/snowpro-core/topics.json`               | modify | Add new optional fields to a sample of subtopics |
| `public/data/certifications/aws-developer-associate/topics.json`    | modify | (Optional) spot-check a subtopic or two          |
| `public/data/certifications/aws-data-engineer-associate/topics.json`| modify | (Optional) spot-check a subtopic or two          |

**Reuse**:

| File                                    | What to reuse                                          |
|-----------------------------------------|--------------------------------------------------------|
| `study-materials/author-topics.mjs`     | Task 7 script to generate/apply the enrichment         |
| `public/data/certifications/*/topics.json` | Existing structure; only add optional fields         |

**Steps**:

1. Pick one certification (`snowpro-core`, 5 topics / 19 subtopics) as the
   primary sample and author real `content` (markdown), `references`,
   `difficulty`, and `estimatedStudyMinutes` for its subtopics via the Task 7
   tool (hand-tune as needed).
2. Optionally enrich a couple of subtopics in the other two certs to confirm
   the UI/loader handle a mix of enriched and bare subtopics.
3. Do not alter topic `weight`s (must still sum to 100), ids, or any
   `topicId`/`subtopicId` referenced by questions.
4. Run `npm run test:run` to confirm the strict data test still passes.

**Tests**:

- `lib/loaders/__tests__/certification-data.test.ts` must pass unchanged in
  intent: weights sum to 100, ids unique, all question references resolve for
  all three certs.

**Acceptance criteria covered**: representative sample backfilled across at
least one certification; strict test still passes.

**Commit**: `feat(data): backfill enriched subtopic content sample`

---

**Task ordering**: Task 1 first (types). Tasks 2 and 3 depend on Task 1 and are
independent of each other. Task 4 is independent (refactor) and precedes Task 6.
Task 5 depends on Tasks 1 and 3. Task 6 depends on Tasks 1, 3, and 4. Task 7
depends on Task 1. Task 8 depends on Task 7 (and exercises Tasks 2, 5, 6).
Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

## Edge Cases & Error Handling

- Subtopic with none of the new fields: renders as today; no validation
  errors. (Tasks 2, 6)
- Subtopic with `content` but empty/missing `keyPoints`: markdown renders, Key
  Points section omitted. (Task 6)
- Topic/subtopic with zero questions: count shows `0`. (Tasks 3, 5, 6)
- `estimatedStudyMinutes` of `0` vs missing: `0` is valid and displayed;
  missing is not displayed. (Tasks 2, 6)
- Invalid `difficulty` / negative `estimatedStudyMinutes` in `topics.json`:
  caught as validation errors. (Task 2)
- Markdown `content` with raw HTML: rendered via `react-markdown` + `remark-gfm`
  only (no `rehype-raw`), so raw HTML is not injected. (Task 6)
- Question counts stay correct if a question's `topicId`/`subtopicId` changes,
  since they are computed at load time from `questions.json`. (Tasks 3, 5, 6)

## Verification

1. `npm run test:run` — all Vitest suites pass, including the strict
   `certification-data.test.ts` (weights sum to 100, ids unique, references
   resolve) and the extended loader/UI tests.
2. `npm run lint` and `npm run build` — no type or lint errors from the schema
   and UI changes.
3. Manually load `/topics` and a topic detail page for the enriched cert:
   confirm per-topic and per-subtopic question counts, rendered markdown
   `content`, reference links, difficulty badge, and estimated study time all
   appear; confirm a non-enriched cert/subtopic still renders as before.

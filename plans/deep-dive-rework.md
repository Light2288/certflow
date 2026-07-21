# Plan: Deep Dive Rework

| Field        | Value                                    |
|--------------|------------------------------------------|
| **Title**    | Deep Dive Rework                         |
| **Spec**     | specs/deep-dive-rework.md                |
| **Type**     | refactor                                 |
| **Branch**   | refactor/deep-dive-rework                |
| **Created**  | 2026-07-22 00:00:00                      |
| **Status**   | IMPLEMENTED                              |

## Context

"Deep Dive with AI" currently asks the model for a generic four-section
markdown essay from a topic's name/description, with no persistence and
heavy overlap with the tutor. This rework grounds the dive in the topic's
real `keyPoints` and real practice questions (few-shot), reuses the
certification-grounding system-prompt pattern from
`tutor-certification-grounding`, produces an actionable **structured**
result (targeted practice questions + common exam traps), and persists
dives to `localStorage` per topic so they are revisitable and not
regenerated on every click.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `refactor/deep-dive-rework`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b refactor/deep-dive-rework
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

| Action | Command          |
|--------|------------------|
| Test   | `npm run test:run` |
| Build  | `npm run build`  |
| Lint   | `npm run lint`   |

## Tasks

### Task 1: Define the structured deep-dive types `[S]`

**Goal**: Introduce the `DeepDive` structured shape (sections + targeted
practice questions + common exam traps) plus persistence metadata, so the
rest of the feature is typed against a stable contract.

**Files**:

| File                              | Action | Description                                              |
|-----------------------------------|--------|----------------------------------------------------------|
| `lib/ai/deep-dive/types.ts`       | create | Define `DeepDive`, `DeepDiveSection`, `DeepDiveTrap`, and a `PracticeQuestion` shape (or reuse `Question`), plus a stored-entry wrapper with `certId`, `topicId`, `generatedAt`. |

**Reuse**:

| File                                    | What to reuse                                             |
|-----------------------------------------|-----------------------------------------------------------|
| `lib/types/certification.ts`            | `Question`, `Topic` types for grounding and practice-question shape. |
| `lib/ai/generator/types.ts`             | Naming/structure conventions for AI-produced types.       |

**Steps**:

1. Define `DeepDiveSection { heading: string; body: string }` for the
   explanatory prose sections (markdown body).
2. Define `DeepDiveTrap { trap: string; why: string; relatedQuestionId?: string }`
   for the "common exam traps" tied to the domain's questions.
3. Define the targeted practice question shape — reuse `Question` where
   possible; if the model output is looser, define a minimal
   `DeepDivePracticeQuestion` with `question`, `options`, `correctAnswer`,
   `explanation`.
4. Define `DeepDive { topicId: string; sections: DeepDiveSection[];
   practiceQuestions: DeepDivePracticeQuestion[]; traps: DeepDiveTrap[] }`.
5. Define the persisted entry wrapper `StoredDeepDive { certId: string;
   topicId: string; generatedAt: number; dive: DeepDive }`.

**Tests**:

- No dedicated test file (pure types). Covered transitively by later
  tasks' tests.

**Acceptance criteria covered**: Structured-object output shape (sections
+ practice questions + traps).

**Commit**: `refactor(deep-dive): add structured DeepDive types`

---

### Task 2: Add the localStorage deep-dive store `[S]`

**Goal**: Persist and retrieve generated dives per topic, mirroring
`question-store.ts` conventions.

**Files**:

| File                                              | Action | Description                                       |
|---------------------------------------------------|--------|---------------------------------------------------|
| `lib/ai/deep-dive/deep-dive-store.ts`             | create | `get`, `set`, `clear`, key builder, storage guard.|
| `lib/ai/deep-dive/__tests__/deep-dive-store.test.ts` | create | Unit tests for the store.                         |

**Reuse**:

| File                                      | What to reuse                                                        |
|-------------------------------------------|----------------------------------------------------------------------|
| `lib/ai/generator/question-store.ts`      | `KEY_PREFIX` pattern, `hasStorage()` guard, defensive `JSON.parse`, swallowed write failures, `clear`. |

**Steps**:

1. Add `KEY_PREFIX = 'certflow:deep-dive:'` and
   `deepDiveKey(certId, topicId)` returning
   `${KEY_PREFIX}${certId}:${topicId}` (per-topic granularity, confirmed).
2. Add `hasStorage()` guard identical to `question-store.ts`.
3. Implement `getDeepDive(certId, topicId): StoredDeepDive | null` —
   returns `null` on missing/corrupt/unavailable storage; validate the
   parsed object has the expected shape (drop corrupt entries defensively).
4. Implement `setDeepDive(entry: StoredDeepDive): void` — writes JSON,
   swallows quota/serialization errors.
5. Implement `clearDeepDive(certId, topicId): void`.

**Tests**:

- Returns `null` when nothing stored / storage unavailable / corrupt JSON.
- Round-trips a valid `StoredDeepDive` via `set` then `get`.
- `clear` removes only the given topic's entry.
- Write failure (mock `setItem` throwing) does not throw.

**Acceptance criteria covered**: Persist to `localStorage` keyed per
topic via a store mirroring `question-store.ts`; corrupt-entry and
storage-failure edge cases.

**Commit**: `feat(deep-dive): add localStorage store for generated dives`

---

### Task 3: Rework the prompt builder (cert-grounding + keyPoints + few-shot + structured output) `[M]`

**Goal**: Build a certification-grounded, structured-JSON deep-dive prompt
that injects the topic's real key points and a few real practice questions
as few-shot examples.

**Files**:

| File                                        | Action | Description                                                       |
|---------------------------------------------|--------|-------------------------------------------------------------------|
| `lib/ai/deep-dive/prompts.ts`               | modify | Replace the four-section essay prompt with a structured, grounded prompt + few-shot; add a strict-JSON system prompt. |

**Reuse**:

| File                                      | What to reuse                                                              |
|-------------------------------------------|----------------------------------------------------------------------------|
| `lib/ai/tutor/prompts.ts`                 | `buildTutorSystemPrompt` framing pattern (role + injected cert context: name/code/examDetails/domains/weights/keyPoints). |
| `lib/ai/generator/prompts.ts`             | `GENERATOR_SYSTEM_PROMPT` / `STRICT_JSON_RETRY_INSTRUCTION` strict-JSON output framing. |
| `lib/loaders/certification-loader.ts`     | `getQuestionsByTopic`, `getRandomQuestions` to sample few-shot questions.  |

**Steps**:

1. Add `DEEP_DIVE_SYSTEM_PROMPT` framing the model as a cert tutor that
   returns a **single JSON object** matching the `DeepDive` schema
   (sections, practiceQuestions, traps) — no prose outside the JSON.
   Mirror the cert-grounding intent of `TUTOR_SYSTEM_PROMPT`.
2. Add a `buildDeepDiveSystemPrompt(config, topics)` helper (or reuse
   `buildTutorSystemPrompt`'s domain-block assembly) so the system prompt
   carries certification context; accept the case where config/topics are
   unavailable (topic-only fallback).
3. Rework `buildDeepDivePrompt` to accept the `Topic` plus an optional
   array of sampled real practice `Question`s. Inject:
   - Topic name/description and its real `keyPoints` (from subtopics,
     including enriched `content` where present).
   - A "few-shot examples" section listing the sampled real questions
     (question text, options, correct answer, explanation) so generated
     output matches the exam's style/difficulty.
   - Explicit instruction to produce targeted practice questions and
     "common exam traps" tied to the domain's questions, as the JSON
     schema.
4. Omit the few-shot section entirely when no questions are supplied
   (empty-pool edge case).
5. Add a `STRICT_JSON_RETRY_INSTRUCTION`-equivalent for one retry on
   unparseable output (used by the service in Task 4).

**Tests**:

- Update/extend `deep-dive-service.test.ts` prompt assertions (or add a
  `prompts.test.ts`): prompt contains topic name, real key points, and
  requests structured JSON with practice-questions and traps.
- Few-shot questions appear in the prompt when supplied; absent when not.
- Cert context (name/code/domains) appears when config/topics supplied.

**Acceptance criteria covered**: Grounded in real key points; few-shot
real questions; reuses cert-grounding system-prompt pattern; requests
structured output; empty-pool edge case.

**Commit**: `refactor(deep-dive): ground prompt in key points, few-shot questions, and cert context`

---

### Task 4: Rework the service to return a parsed structured DeepDive `[M]`

**Goal**: Have `generateDeepDive` build the grounded prompt, call the
provider with the cert-grounded system message, and defensively parse the
JSON into a `DeepDive`.

**Files**:

| File                                      | Action | Description                                                        |
|-------------------------------------------|--------|--------------------------------------------------------------------|
| `lib/ai/deep-dive/deep-dive-service.ts`   | modify | New signature returning `DeepDive`; prepend system message; parse + validate JSON; retry once; preserve `EMPTY_RESPONSE`. |
| `lib/ai/deep-dive/index.ts`               | modify | Export new types, store, and updated service/prompt symbols.       |

**Reuse**:

| File                                      | What to reuse                                                        |
|-------------------------------------------|----------------------------------------------------------------------|
| `lib/ai/generator/question-generator.ts`  | `callAi` pattern (prepend `system` `ChatMessage`, one retry on unparseable output) and `parseCandidates` defensive JSON extraction. |
| `lib/ai/` (`AIService`, `AIServiceError`) | Provider call + error codes (`EMPTY_RESPONSE`).                      |

**Steps**:

1. Change `generateDeepDive` to accept the topic, the AI service, sampled
   few-shot questions, and an optional built cert system prompt.
2. Build the user prompt via the reworked `buildDeepDivePrompt`; prepend a
   `system`-role `ChatMessage` (cert-grounded prompt, or the base
   `DEEP_DIVE_SYSTEM_PROMPT` when cert context is unavailable), mirroring
   `question-generator.ts` `callAi`.
3. On empty/whitespace content, keep throwing `AIServiceError` with code
   `EMPTY_RESPONSE`.
4. Add a `parseDeepDive(content): DeepDive | null` that extracts the JSON
   object defensively (mirror `parseCandidates`' brace-slice + `try/catch`)
   and checks required fields.
5. If parsing fails, do one retry with the strict-JSON instruction; if it
   still fails, throw an `AIServiceError` (e.g. `EMPTY_RESPONSE` or a
   parse-specific code) so the caller does not persist a corrupt entry.
6. Update `index.ts` exports (`DeepDive` types, store functions, updated
   prompt/service symbols).

**Tests**:

- Update `deep-dive-service.test.ts`: `generateDeepDive` returns a parsed
  `DeepDive` on valid JSON; passes topic context + few-shot into the call;
  prepends the system message.
- Blank content → `EMPTY_RESPONSE`.
- Malformed JSON → retry, then failure (no corrupt object returned).
- Thrown `AIServiceError` propagates unchanged.

**Acceptance criteria covered**: Structured object output; no provider
interface change; `EMPTY_RESPONSE` preserved; malformed-output edge case;
existing tests updated and green.

**Commit**: `refactor(deep-dive): return parsed structured DeepDive from service`

---

### Task 5: Rework DeepDiveButton for grounding, caching, and structured rendering `[M]`

**Goal**: Load cached dives from the store, sample real few-shot questions
+ build the cert system prompt, generate on demand, render the structured
output, and offer explicit regeneration.

**Files**:

| File                                                              | Action | Description                                                            |
|-------------------------------------------------------------------|--------|------------------------------------------------------------------------|
| `app/topics/[topicId]/components/DeepDiveButton.tsx`              | modify | Cache-first load; sample questions + cert prompt; call service (client + `/api/chat` paths); render structured dive; regenerate button. |

**Reuse**:

| File                                            | What to reuse                                                        |
|-------------------------------------------------|----------------------------------------------------------------------|
| `lib/ai/deep-dive/deep-dive-store.ts`           | `getDeepDive` / `setDeepDive` / `clearDeepDive`.                     |
| `lib/ai/tutor/use-tutor-system-prompt.ts`       | Pattern for loading cert config/topics and building a memoized cert system prompt (fall back to `null`). |
| `lib/loaders/certification-loader.ts`           | `loadCertificationQuestions`, `getQuestionsByTopic`, `getRandomQuestions` for few-shot sampling. |
| existing `DeepDiveButton.tsx`                   | `getErrorMessage`, `AIService` memo, `/api/chat` routing, retry UI, `markdownComponents` rendering. |

**Steps**:

1. Read `currentCertificationId` from `useSettings()`; on open, first call
   `getDeepDive(certId, topic.id)` and render the cached dive without
   calling the provider if present.
2. On cache miss (or explicit regenerate), load the certification's
   questions, filter to this topic (`getQuestionsByTopic`), sample a few
   (`getRandomQuestions`), and build the cert-grounded system prompt
   (loading config/topics like `use-tutor-system-prompt`; fall back to
   topic-only on failure — log, no hard error).
3. Client-side providers: call `generateDeepDive(...)`. Ollama/custom:
   POST to `/api/chat` with the built user prompt as `message` and the
   cert system message prepended into `history` (mirror the tutor page and
   the recent `/api/chat` routing), then parse the returned content into a
   `DeepDive` (reuse the service's `parseDeepDive`).
4. On success, `setDeepDive(...)` to persist; render sections (markdown),
   practice questions, and exam traps. If storage is unavailable, still
   show the in-session dive (graceful degrade).
5. Add a "Regenerate" control that calls `clearDeepDive(...)` and re-runs
   generation, replacing the cached entry.
6. Preserve existing error handling / retry UI and `EMPTY_RESPONSE`
   fallback.

**Tests**:

- Add/extend a component test (React Testing Library, mirroring
  `app/tutor/__tests__/page.test.tsx` mocking approach): cached dive
  renders without a provider call; cache miss triggers generation and
  persistence; regenerate clears + re-generates; structured sections /
  practice questions / traps render; no-cert fallback path works.

**Acceptance criteria covered**: Cache-first load without provider call;
explicit regenerate; grounded generation (key points + few-shot + cert
context); Ollama via `/api/chat` (no regression); structured rendering;
no-cert and storage-unavailable edge cases.

**Commit**: `refactor(deep-dive): cache dives and render grounded structured output in DeepDiveButton`

---

**Task ordering**: Sequential. Task 1 (types) underpins 2–5. Task 2
(store) and Task 3 (prompts) are independent of each other but both feed
Task 4 (service). Task 5 (component) depends on 2, 3, and 4. This whole
spec is intended to land **after** `topics-schema-enrichment` and
`tutor-certification-grounding` (the latter is already `IMPLEMENTED`).

## Edge Cases & Error Handling

- No practice questions for the topic: skip few-shot section (Task 3);
  component samples an empty array (Task 5).
- No certification selected / cert data fails to load: topic-only
  fallback, logged, no hard error (Tasks 3, 5).
- Empty/whitespace provider response: `EMPTY_RESPONSE` `AIServiceError`
  preserved (Task 4).
- Malformed structured output: defensive parse + one retry, then fail
  without persisting a corrupt entry (Task 4).
- Corrupt cached entry: dropped defensively on read, regenerated (Task 2).
- localStorage unavailable / write fails: show in-session dive without
  persisting (Tasks 2, 5).

## Verification

1. `npm run test:run` — all deep-dive unit tests (store, prompts,
   service) and the `DeepDiveButton` component test pass; existing suites
   stay green.
2. `npm run lint` and `npm run build` succeed.
3. Manual: open a topic, click Deep Dive → grounded structured dive
   (sections + practice questions + traps) is generated and persisted;
   reopen → served from cache without a provider call; Regenerate →
   replaces the cached dive; verify Ollama path still routes through
   `/api/chat`.
4. Confirm each acceptance criterion in `specs/deep-dive-rework.md` is
   satisfied.

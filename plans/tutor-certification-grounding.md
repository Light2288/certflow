# Plan: Tutor Certification Grounding

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Tutor Certification Grounding      |
| **Spec**     | specs/tutor-certification-grounding.md |
| **Type**     | feature                            |
| **Branch**   | feat/tutor-certification-grounding |
| **Created**  | 2026-07-14 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The AI Tutor sends only the raw user message plus prior chat history to the
provider — no system prompt and no certification context — so answers are
generic and disconnected from the selected exam. This plan adds a
certification-grounded system prompt (built from `config.json` and
`topics.json` for `currentCertificationId`) and injects it as the first
`system`-role message on both the client-side `aiService.chat(...)` path and
the Ollama `POST /api/chat` path, mirroring the generator's prompt pattern.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/tutor-certification-grounding`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/tutor-certification-grounding
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

## Tasks

### Task 1: Add tutor system-prompt builder `[S]`

**Goal**: Create a pure function that builds a certification-grounded system
prompt from a `CertificationConfig` and `TopicsData`, mirroring the
generator's prompt pattern.

**Files**:

| File                              | Action | Description                                   |
|-----------------------------------|--------|-----------------------------------------------|
| `lib/ai/tutor/prompts.ts`         | create | `TUTOR_SYSTEM_PROMPT` framing constant + `buildTutorSystemPrompt(config, topics)` |

**Reuse**:

| File                                   | What to reuse                                             |
|----------------------------------------|-----------------------------------------------------------|
| `lib/ai/generator/prompts.ts`          | Pattern: a framing system-prompt constant plus a `build...` function that assembles context via `sections.join('\n\n')` |
| `lib/types/certification.ts`           | `CertificationConfig`, `ExamDetails`, `TopicsData`, `Topic`, `Subtopic` types |

**Steps**:

1. Add a `TUTOR_SYSTEM_PROMPT` string that frames the model as an expert,
   patient certification study tutor for a specific exam: explain concepts,
   give exam-relevant guidance, and stay grounded in the certification's
   domains. (Free-form prose answers — do NOT impose the strict-JSON schema
   the generator uses.)
2. Add `buildTutorSystemPrompt(config: CertificationConfig, topics:
   TopicsData): string` that assembles sections mirroring
   `buildGenerationPrompt`:
   - Certification identity: `config.name`, `config.code`.
   - Exam details from `config.examDetails` (duration, questionCount,
     passingScore, scoreRange).
   - For each `topics.topics` entry: domain `name`, `weight` (as a
     percentage), and its subtopics with `name` and `keyPoints`.
   - Prepend the `TUTOR_SYSTEM_PROMPT` framing, then join sections with
     `\n\n`.
3. Keep the function pure (no fetching) so it is trivially unit-testable and
   reusable on client and server.

**Tests**:

- Create `lib/ai/tutor/__tests__/prompts.test.ts` (mirroring
  `lib/ai/generator/__tests__/prompts.test.ts` structure with inline
  `CertificationConfig`/`TopicsData` fixtures).
- Assert the built prompt contains the cert name, code, exam detail values,
  each domain name + weight, and subtopic key points.
- Assert the `TUTOR_SYSTEM_PROMPT` framing text is present.

**Acceptance criteria covered**: "system-prompt builder produces a
certification-grounded system prompt from config.json and topics.json".

**Commit**: `feat(tutor): add certification-grounded system prompt builder`

---

### Task 2: Add a hook to load and memoize the tutor system prompt `[M]`

**Goal**: Provide a hook that reads `currentCertificationId`, loads the
certification config + topics once per cert id, builds the system prompt, and
returns it memoized — falling back to `null` on missing cert or load failure.

**Files**:

| File                              | Action | Description                                        |
|-----------------------------------|--------|----------------------------------------------------|
| `lib/ai/tutor/use-tutor-system-prompt.ts` | create | `useTutorSystemPrompt()` hook returning `string \| null` |

**Reuse**:

| File                                        | What to reuse                                              |
|---------------------------------------------|------------------------------------------------------------|
| `lib/contexts/settings-context.tsx`         | `useSettings()` → `currentCertificationId`                 |
| `lib/loaders/certification-loader.ts`       | `loadCertificationConfig`, `loadCertificationTopics` (already resolve base URL client/server) |
| `lib/ai/tutor/prompts.ts`                   | `buildTutorSystemPrompt` (Task 1)                          |

**Steps**:

1. Read `currentCertificationId` from `useSettings()`.
2. In an effect keyed on `currentCertificationId`, if the id is non-empty,
   `Promise.all([loadCertificationConfig(id), loadCertificationTopics(id)])`,
   then `buildTutorSystemPrompt(...)` and store the result in state.
3. Guard against races (ignore stale results if the id changed) and against
   failures: on any rejection or empty id, set the prompt to `null`, log a
   warning via `console.warn`, and do not throw.
4. Return the memoized prompt string (or `null`). The prompt is rebuilt only
   when `currentCertificationId` changes.

**Tests**:

- Create `lib/ai/tutor/__tests__/use-tutor-system-prompt.test.tsx` using
  `@testing-library/react` `renderHook`, wrapped in `SettingsProvider`.
- Mock `certification-loader` functions: assert prompt is built when loaders
  resolve; assert `null` when a loader rejects; assert loaders are called
  once per cert id (memoization) and re-called when the id changes.

**Acceptance criteria covered**: reads `currentCertificationId`; loaded once
per certification and memoized, rebuilt only on cert change; fallback to no
prompt on empty id or load failure (logged, not surfaced).

**Task ordering**: depends on Task 1.

**Commit**: `feat(tutor): add hook to load and memoize certification system prompt`

---

### Task 3: Inject the system prompt on both tutor request paths `[M]`

**Goal**: Wire the memoized system prompt into `app/tutor/page.tsx` so it is
prepended as the first `history` element for both the client-side
`aiService.chat(...)` call and the Ollama `POST /api/chat` request body.

**Files**:

| File                       | Action | Description                                                        |
|----------------------------|--------|--------------------------------------------------------------------|
| `app/tutor/page.tsx`       | modify | Use `useTutorSystemPrompt()`; prepend a `system` `ChatMessage` to the outgoing history on both paths |

**Reuse**:

| File                                        | What to reuse                                              |
|---------------------------------------------|------------------------------------------------------------|
| `lib/ai/generator/question-generator.ts`    | `callAi(...)` pattern: build a `{ role: 'system', content, timestamp }` `ChatMessage` and pass it as `history[0]` |
| `lib/ai/types.ts`                           | `ChatMessage` (already supports the `system` role)         |
| `lib/ai/tutor/use-tutor-system-prompt.ts`   | `useTutorSystemPrompt()` (Task 2)                          |

**Steps**:

1. Call `const systemPrompt = useTutorSystemPrompt();` in `TutorPage`.
2. In `handleSendMessage`, after building `history`, compute
   `outgoingHistory`: if `systemPrompt` is a non-empty string, prepend
   `{ role: 'system', content: systemPrompt, timestamp: new Date() }`;
   otherwise use `history` unchanged.
3. Client-side path (`else` branch): pass `outgoingHistory` to
   `aiService.chat(content, outgoingHistory)`.
4. Ollama path (`if provider === 'ollama'`): send `history: outgoingHistory`
   in the `POST /api/chat` body. No new request field is added — the system
   message travels inside the existing `history` array, so
   `app/api/chat/route.ts` needs no changes.
5. Ensure the retry path (`handleRetry` → `handleSendMessage(..., true)`)
   naturally reuses the same `systemPrompt`, since it is read from the hook
   on each send.

**Tests**:

- Extend `app/tutor/__tests__/page.test.tsx`:
  - Add a test that mocks `useTutorSystemPrompt` (or the loader functions) to
    return a known prompt and asserts `mockChat` was called with a history
    whose first element is `{ role: 'system', content: <prompt> }`.
  - Add a test for the Ollama path: spy on `fetch`, send a message with
    `provider: 'ollama'`, and assert the request body `history[0].role ===
    'system'`.
  - Add a test that when the system prompt is `null` (loaders reject / no
    cert), `mockChat` is called with history containing no `system` message
    (preserves current behaviour).
- Confirm all existing tutor tests still pass unchanged (they clear
  `localStorage`; loaders will reject in the test env, yielding a `null`
  prompt and the current behaviour).

**Acceptance criteria covered**: reads `currentCertificationId`; system
message prepended on client path; same message in Ollama request body with
route unchanged; retry carries the prompt; no `AIProvider` interface change;
existing tutor tests remain green.

**Task ordering**: depends on Tasks 1 and 2.

**Commit**: `feat(tutor): inject certification system prompt on chat requests`

---

**Task ordering**: Task 1 → Task 2 → Task 3 (strictly sequential; each builds
on the prior). No dependencies outside this plan.

## Edge Cases & Error Handling

- **No certification selected / empty id**: hook returns `null`; page sends
  history with no system message (Task 2, Task 3).
- **`config.json` / `topics.json` fail to load**: hook catches the rejection,
  logs a `console.warn`, returns `null`; no error surfaced to the user
  (Task 2).
- **Certification switched mid-conversation**: hook effect re-runs on the new
  `currentCertificationId`, rebuilding and memoizing the new prompt;
  subsequent sends use it (Task 2, Task 3).
- **Retry path**: `handleRetry` re-invokes `handleSendMessage`, which reads
  the current memoized prompt, so retries carry the same system prompt
  (Task 3).
- **Provider interface**: no change — the system message rides inside the
  existing `history` array, and `app/api/chat/route.ts` forwards it as-is
  (Task 3).

## Verification

1. Run `npm run test:run` — all existing and new tests pass (tutor page,
   tutor prompt builder, tutor hook).
2. Run `npm run build` — type-checks and compiles cleanly (no
   `AIProvider`/`AIConfig` shape changes, no new deps).
3. Manually: with a certification selected, ask the tutor a generic question
   (e.g. "give me study tips") using a real provider and confirm the answer
   references the selected exam's domains; switch certification and confirm
   subsequent answers reflect the new exam.
4. Confirm the Ollama path (`provider: 'ollama'`) sends `history[0]` with
   `role: 'system'` in the `POST /api/chat` body (network inspector or a
   temporary log).

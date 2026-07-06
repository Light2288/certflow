# Plan: Topic Deep Dive with AI

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Topic Deep Dive with AI            |
| **Spec**     | specs/topic-deep-dive.md           |
| **Type**     | feature                            |
| **Branch**   | feat/topic-deep-dive               |
| **Created**  | 2026-07-07 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The "Deep Dive with AI" button on the topic detail page is a stub that only
fires an `alert()` and ignores its `topicId`. This plan replaces it with a real
feature: a focused deep-dive helper builds a topic-grounded prompt, calls the
user's configured AI provider via the existing AI layer, and renders the
markdown response in an inline expandable panel with loading, per-error-code,
and retry states — mirroring the AI Tutor's proven patterns.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/topic-deep-dive`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/topic-deep-dive
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

Branch type mapping:

- feature → `feat/<slug>`

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (watch: `npm test`; coverage: `npm run test:coverage`) |
| Lint   | `npm run lint` |
| Build  | `npm run build` |

> Note: this machine uses nvm — run `source ~/.nvm/nvm.sh && nvm use` before
> `npm` commands if the Node version is not already active.

## Tasks

### Task 1: Deep-dive prompt + service helper `[M]`

**Goal**: Add a focused module under `lib/ai/deep-dive/` that builds a
topic-grounded prompt and returns the AI's markdown deep-dive.

**Files**:

| File                                   | Action | Description                                              |
|----------------------------------------|--------|----------------------------------------------------------|
| `lib/ai/deep-dive/prompts.ts`          | create | System prompt + `buildDeepDivePrompt(topic)` user-prompt builder |
| `lib/ai/deep-dive/deep-dive-service.ts`| create | `generateDeepDive(topic, service)` — calls the AI service, returns markdown string |
| `lib/ai/deep-dive/index.ts`            | create | Public exports for the module                            |

**Reuse**:

| File                          | What to reuse                                              |
|-------------------------------|-----------------------------------------------------------|
| `lib/ai/ai-service.ts`        | `AIService.chat(message, history?, options?)` call contract |
| `lib/ai/types.ts`             | `AIServiceError` (re-thrown as-is), `ChatResponse` shape  |
| `lib/types/certification.ts`  | `Topic` / `Subtopic` types                                |

**Steps**:

1. In `prompts.ts`, define a system prompt framing the model as an expert
   certification tutor asked to produce a structured markdown deep-dive with
   four sections: **Overview**, **Worked Examples**, **Real-World Context**,
   and **Exam Tips**.
2. Add `buildDeepDivePrompt(topic: Topic): string` that injects `topic.name`,
   `topic.description`, and the aggregated key points. **Note:** `keyPoints`
   live on `Subtopic`, not `Topic` (per `lib/types/certification.ts`), so
   aggregate them from `topic.subtopics.flatMap(s => s.keyPoints)`. Handle a
   topic with no/empty subtopics or key points gracefully (omit that section,
   still produce a valid prompt from name + description).
3. In `deep-dive-service.ts`, export
   `generateDeepDive(topic: Topic, service: AIService): Promise<string>` that
   builds the prompt, calls `service.chat(prompt)`, and returns
   `response.content`. If the returned content is empty/whitespace, throw an
   `AIServiceError` with a dedicated code (e.g. `EMPTY_RESPONSE`) so the UI can
   show a friendly fallback. Let genuine `AIServiceError`s propagate unchanged.
4. In `index.ts`, re-export `generateDeepDive` and the prompt builder.

**Tests**:

- `lib/ai/deep-dive/__tests__/deep-dive-service.test.ts`:
  - Prompt includes topic name, description, and key points aggregated from
    subtopics.
  - Topic with no key points still yields a valid prompt (no crash).
  - `generateDeepDive` returns the provider's markdown content on success.
  - Empty AI content surfaces an `AIServiceError` (`EMPTY_RESPONSE`).
  - A thrown `AIServiceError` from the service propagates unchanged.
  - Uses a stub/mock `AIService`; never hits the network.

**Acceptance criteria covered**: AC1 (prompt includes name/description/keyPoints),
partial AC2 (requests overview/examples/real-world/exam-tips), empty-response
edge case, empty-keyPoints edge case.

**Commit**: `feat(ai): add topic deep-dive prompt and service helper`

---

### Task 2: Rewrite `DeepDiveButton` into an interactive deep-dive panel `[M]`

**Goal**: Replace the `alert()` stub with a button that triggers the deep-dive
call and renders the markdown result in an inline expandable panel with
loading, error, and retry states, plus in-memory caching.

**Files**:

| File                                                        | Action | Description                                        |
|-------------------------------------------------------------|--------|----------------------------------------------------|
| `app/topics/[topicId]/components/DeepDiveButton.tsx`        | modify | Full rewrite: state, AI call, inline panel, error/retry |

**Reuse**:

| File                                       | What to reuse                                                        |
|--------------------------------------------|----------------------------------------------------------------------|
| `app/tutor/components/ChatMessage.tsx`     | The `react-markdown` + `remark-gfm` renderer config for AI markdown  |
| `app/tutor/page.tsx`                        | The `getErrorMessage(error)` per-`AIServiceError`-code mapping and 3-retry pattern |
| `lib/contexts/settings-context.tsx`         | `useSettings()` → `settings` for building the `AIService` config     |
| `lib/ai` (index)                            | `AIService`, `AIServiceError`                                        |
| `lib/ai/deep-dive`                          | `generateDeepDive` from Task 1                                       |

**Steps**:

1. Change the component's props to accept the full `topic: Topic` (the parent
   already has it) instead of just `topicId`/`topicName`, so the prompt can use
   description + subtopic key points. Update the prop interface accordingly.
2. Add local state: `isOpen`, `isLoading`, `content` (cached markdown or null),
   `error` (friendly message or null), `retryCount`.
3. Build an `AIService` from `useSettings().settings` via `useMemo` (mirror
   `app/tutor/page.tsx` lines 20–29).
4. On button click: toggle the panel open; if `content` is already cached, show
   it without re-calling (satisfies in-memory caching). Otherwise call
   `generateDeepDive(topic, aiService)`, setting loading/error/content.
5. Port a local `getErrorMessage(error)` covering `MISSING_API_KEY`,
   `INVALID_API_KEY`, `RATE_LIMIT`, `QUOTA_EXCEEDED`, `NETWORK_ERROR`,
   `MODEL_NOT_FOUND`, the `EMPTY_RESPONSE` fallback, and a generic default —
   adapted from `app/tutor/page.tsx`. (If the mapping is large, consider a
   shared helper — see Task 3 note; default is to inline it here.)
6. Render an inline expandable panel below the button (not a modal): loading
   spinner while `isLoading`; on success render `content` via the same
   `react-markdown` + `remark-gfm` config used in `ChatMessage.tsx`; on error
   render the friendly message with a **Retry** button capped at 3 attempts.
7. Remove the `alert()` entirely.

**Tests**:

- `app/topics/[topicId]/components/__tests__/DeepDiveButton.test.tsx`:
  - Clicking the button fires the deep-dive call with topic context (assert via
    a mocked `@/lib/ai` `AIService.chat`, mirroring the tutor test mock at
    `app/tutor/__tests__/page.test.tsx` lines 19–36).
  - Loading state appears while the call is in flight.
  - Success renders the markdown response in the panel.
  - An error path (e.g. `MISSING_API_KEY`) renders a friendly message, not an
    `alert()`; a Retry affordance is present.
  - Re-opening the panel after a successful load does not trigger a second call
    (caching).
  - Wrap renders in `SettingsProvider`; mock `next/link` as the tutor test does;
    never hit the network.

**Acceptance criteria covered**: AC1, AC2 (markdown render), AC3 (inline panel),
AC4 (loading), AC5 (per-code errors + retry, no alert), AC6 (mock provider works
without network), AC7 (in-memory cache), AC8 (no alert remains), AC9 (component
test with MockAIProvider). All error-handling edge cases.

**Commit**: `feat(topics): replace deep-dive stub with AI-backed panel`

---

### Task 3: Wire the new component into the topic detail page `[S]`

**Goal**: Pass the loaded `topic` object into `DeepDiveButton` from the topic
detail page so the deep-dive is grounded in real topic data.

**Files**:

| File                                  | Action | Description                                          |
|---------------------------------------|--------|------------------------------------------------------|
| `app/topics/[topicId]/page.tsx`       | modify | Update the `<DeepDiveButton>` usage (line ~138) to pass `topic` |

**Reuse**:

| File                              | What to reuse                                     |
|-----------------------------------|---------------------------------------------------|
| `app/topics/[topicId]/page.tsx`   | The already-loaded `topic` state (line 16, 35)    |

**Steps**:

1. Replace `<DeepDiveButton topicId={topic.id} topicName={topic.name} />` with
   the new prop contract from Task 2 (e.g. `<DeepDiveButton topic={topic} />`).
2. Confirm no other call sites reference `DeepDiveButton` (grep confirms it is
   only used here); no further wiring needed since the page already guards for
   `loading`/`error`/`!topic` before rendering.

**Tests**:

- If a page-level test exists or is added under
  `app/topics/[topicId]/__tests__/`, assert the button renders on a loaded
  topic. (No such test file exists today; a minimal smoke render is optional and
  can be folded into Task 2's component coverage. Prefer the component test as
  the primary safety net.)

**Acceptance criteria covered**: AC6 (feature wired into the detail page using
already-loaded topic data).

**Commit**: `feat(topics): pass topic data into deep-dive panel`

---

**Task ordering**: Task 1 → Task 2 → Task 3. Task 2 depends on Task 1's
`generateDeepDive`; Task 3 depends on Task 2's new prop contract.

## Edge Cases & Error Handling

- Missing/invalid API key (`MISSING_API_KEY`, `INVALID_API_KEY`): friendly
  message pointing to Settings + retry (Task 2).
- Rate limit / quota (`RATE_LIMIT`, `QUOTA_EXCEEDED`): specific message + retry
  (Task 2).
- Network / model errors (`NETWORK_ERROR`, `MODEL_NOT_FOUND`): specific message
  + retry (Task 2).
- Empty/malformed AI response: `generateDeepDive` throws `EMPTY_RESPONSE`; UI
  shows a friendly fallback (Tasks 1 & 2).
- Re-opening the panel in the same visit: cached in-memory content served, no
  new call (Task 2).
- Topic with no/empty `keyPoints`: prompt built from name + description only,
  no crash (Task 1).

## Verification

1. Run `npm run test:run` — all existing tests plus the two new test files pass;
   deep-dive module and component meet coverage.
2. Run `npm run lint` — zero warnings; no `alert()` and no stray `any` in the
   touched files.
3. Manual smoke: on `/topics/<id>` with the mock provider, click "Deep Dive with
   AI" → an inline panel opens, shows loading, then renders a canned markdown
   deep-dive with no network call; re-clicking re-uses the cached content.
4. Manual smoke: set an invalid/absent key for a real provider → the panel shows
   the matching friendly error (not an alert) with a working Retry button.
5. Confirm each spec acceptance criterion in `specs/topic-deep-dive.md` is met.

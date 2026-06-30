# Plan: AI-Enhanced Simulator

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | AI-Enhanced Simulator              |
| **Spec**     | specs/ai-enhanced-simulator.md     |
| **Type**     | feature                            |
| **Branch**   | feat/ai-enhanced-simulator         |
| **Created**  | 2026-06-29 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The simulator can only draw from the 15 curated `aws-ml` questions, so realistic
exam-sized quizzes (e.g. 50 questions) are impossible. Phases 8 (`QuestionValidator`)
and 9 (`QuestionGenerator` + `mix()` + `question-store`) are already implemented.
This plan wires those services into the existing simulator UX: a `use-question-pool`
hook bridges loader + generator, a `generating` view-mode shows progress, generated
pools persist in the session for reload-safety, and review distinguishes AI-generated
items — all while keeping the mock-provider path network-free.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/ai-enhanced-simulator`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/ai-enhanced-simulator
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (single run) / `npm test` (watch) |
| Coverage | `npm run test:coverage` |
| Lint   | `npm run lint` |
| Build  | `npm run build` |

> Note: this machine uses nvm — run `source ~/.nvm/nvm.sh && nvm use` before npm.

## Tasks

### Task 1: `use-question-pool` hook (loader + generator bridge) `[M]`

**Goal**: Add a client hook that produces the final question pool, optionally
augmenting the curated set with AI-generated, validated questions via `mix()`.

**Files**:

| File                                       | Action | Description                                   |
|--------------------------------------------|--------|-----------------------------------------------|
| `lib/quiz/use-question-pool.ts`            | create | Hook orchestrating loader → generator → mix() |

**Reuse**:

| File                                            | What to reuse                                              |
|-------------------------------------------------|------------------------------------------------------------|
| `lib/loaders/certification-loader.ts`           | `getQuestionsByTopic`, `getQuestionsByDifficulty`, `getRandomQuestions`, `getTopicById`, `getSubtopicById` |
| `lib/ai/generator/` (`index.ts`)                | `QuestionGenerator`, `GenerationRequest`, `GenerationResult`, `GenerationStats` |
| `lib/ai/validator/` (`index.ts`)                | `QuestionValidator` (to construct the generator)           |
| `lib/ai/ai-service.ts`                          | `new AIService({...})` config-from-settings pattern (see `app/tutor/page.tsx` lines 20–29) |
| `lib/types/ai-settings.ts`                      | `AISettings`, `AI_PROVIDERS`                               |

**Steps**:

1. Define a `useQuestionPool` hook accepting `{ certificationData, topicId, difficulty, requestedCount, aiSettings, augment }` and returning `{ questions, isGenerating, generationStats, error, stage }`.
2. Compute the curated pool by filtering `certificationData.questions.questions` by topic/difficulty (mirror `QuizSetup` filter logic; reuse loader helpers where they fit).
3. When `augment` is false OR curated pool already satisfies `requestedCount`, return the curated selection directly with `isGenerating=false` (no generation).
4. When augmenting and the curated pool is short: build an `AIService` from `aiSettings` (provider/apiKey/model/baseUrl/temperature/maxTokens), construct `QuestionValidator` + `QuestionGenerator`, build a `GenerationRequest` (topic, optional subtopic, difficulty, gap count, `existingQuestionIds` = curated ids), call `generate()`, then `mix(seed, generated, 0.3, sessionSeed)`.
5. Expose a `stage` value (`'idle' | 'drafting' | 'validating' | 'mixing' | 'done'`) updated as generation proceeds, and surface `GenerationResult.error` as the hook `error` while falling back to the curated pool.
6. Accept an `AbortSignal` (or expose a `cancel()` callback) so the UI can request a best-effort abort; on cancel, settle to the curated pool.

**Tests**:

- `lib/quiz/__tests__/use-question-pool.test.ts` (new). Use `@testing-library/react`'s `renderHook`. Inject a mock `AIService`/canned generator path (mock provider + canned validator JSON). Cover: no-augment passthrough, curated-pool-already-sufficient (no generation), gap-fill mix ratio, generation error → curated fallback, dedup against existing ids, cancel path. Never hit a network.

**Acceptance criteria covered**: hook contract + return shape; generation fills the gap; graceful degradation; mock path network-free.

**Commit**: `feat(simulator): add use-question-pool hook bridging loader and generator`

---

### Task 2: Persist generated pool in the quiz session `[S]`

**Goal**: Carry provenance through the session so reloads mid-quiz resume with the
same AI-generated questions and review can distinguish them.

**Files**:

| File                                  | Action | Description                                              |
|---------------------------------------|--------|----------------------------------------------------------|
| `lib/quiz/quiz-session-manager.ts`    | modify | Allow sessions to store `GeneratedQuestion[]` (questions carrying optional `generationMeta`) |

**Reuse**:

| File                              | What to reuse                                             |
|-----------------------------------|----------------------------------------------------------|
| `lib/ai/generator/types.ts`       | `GeneratedQuestion` (extends `Question` with `generationMeta`) |

**Steps**:

1. Confirm `QuizSessionState.questions: Question[]` already accepts `GeneratedQuestion` (it does — structurally assignable). Verify the existing `createSession`/`saveSession`/`loadSession` JSON round-trip preserves the optional `generationMeta` field (no code change needed beyond a type allowance/import).
2. If needed, widen the relevant types/imports so the manager can be passed `GeneratedQuestion[]` without casting, keeping the existing public API otherwise unchanged.
3. Do not change persistence keys or recovery logic — `loadActiveSession` must continue to restore the full pool including `generationMeta`.

**Tests**:

- Extend `lib/quiz/__tests__/quiz-session-manager.test.ts`: a session created with questions carrying `generationMeta` survives `saveSession` → `loadSession` (and `loadActiveSession`) with `generationMeta` intact.

**Acceptance criteria covered**: generated pool persisted into the session; reload resumes correctly (storage half).

**Commit**: `feat(simulator): preserve generated-question provenance in quiz sessions`

---

### Task 3: `GenerationProgress` component `[S]`

**Goal**: A view shown between Start and Quiz that displays per-stage progress and
a best-effort Cancel button.

**Files**:

| File                                                   | Action | Description                          |
|--------------------------------------------------------|--------|--------------------------------------|
| `app/simulator/components/GenerationProgress.tsx`      | create | Stage indicator + Cancel button      |

**Reuse**:

| File                                          | What to reuse                                        |
|-----------------------------------------------|------------------------------------------------------|
| `app/simulator/page.tsx` (loading spinner)    | Existing Tailwind spinner + dark-mode card styles    |
| `lib/ai/generator/types.ts`                   | `GenerationStats` (optional, to show counts)         |

**Steps**:

1. Build a presentational component with props `{ stage, stats?, onCancel }` where `stage` is `'drafting' | 'validating' | 'mixing'`.
2. Render a stage list (drafting → validating → mixing) highlighting the active stage, reusing the existing spinner and card classes for visual consistency and dark mode.
3. Render a Cancel button wired to `onCancel`.

**Tests**:

- `app/simulator/components/__tests__/GenerationProgress.test.tsx` (new): renders each stage state, shows optional stats, and fires `onCancel` on click.

**Acceptance criteria covered**: progress visible per stage; Cancel affordance.

**Commit**: `feat(simulator): add GenerationProgress stage view with cancel`

---

### Task 4: Augment toggle in `QuizSetup` `[M]`

**Goal**: Let users opt into AI augmentation and choose a target count uncapped by
the curated pool, with the provider-aware default.

**Files**:

| File                                         | Action | Description                                                 |
|----------------------------------------------|--------|-------------------------------------------------------------|
| `app/simulator/components/QuizSetup.tsx`     | modify | Add augment toggle; uncap count when ON; pass config upward |

**Reuse**:

| File                                  | What to reuse                                          |
|---------------------------------------|--------------------------------------------------------|
| `lib/contexts/settings-context.tsx`   | `useSettings` to read `settings.provider`              |
| `lib/types/ai-settings.ts`            | `AI_PROVIDERS` for provider metadata                   |

**Steps**:

1. Add an "Augment with AI-generated questions" toggle. Default ON when `settings.provider !== 'mock'`, OFF for `mock`.
2. When the toggle is ON, raise the count slider's max above the curated pool size (use the spec-required ceiling, e.g. 50) instead of `Math.min(maxQuestions, 50)`; when OFF keep the curated cap.
3. Change `onStartQuiz` so it passes the chosen config (count, difficulty, topic, `augment`) up to the page rather than slicing curated questions itself — the page/hook now owns pool construction. (Keep the curated-only path working for `augment=false`.)
4. Update the "questions available" info copy to reflect that AI augmentation can exceed the curated count.

**Tests**:

- Update `app/simulator/components/__tests__/QuizSetup.test.tsx`: toggle defaults (mock OFF, non-mock ON), count uncapped when ON, and the start callback emits the augment config. Wrap renders in `SettingsProvider` (or a mock) per the tutor test pattern.

**Acceptance criteria covered**: augment toggle with provider-aware default; uncapped target count when ON.

**Commit**: `feat(simulator): add AI augmentation toggle to quiz setup`

---

### Task 5: Wire `generating` view-mode into the simulator page `[M]`

**Goal**: Insert the `generating` mode between `setup` and `quiz`, drive it with the
hook, persist the resulting pool, and handle cancel/error/skip.

**Files**:

| File                       | Action | Description                                                       |
|----------------------------|--------|-------------------------------------------------------------------|
| `app/simulator/page.tsx`   | modify | Add `'generating'` to `ViewMode`; orchestrate hook + transitions  |

**Reuse**:

| File                                              | What to reuse                                  |
|---------------------------------------------------|------------------------------------------------|
| `lib/quiz/use-question-pool.ts` (Task 1)          | Pool construction + stage/stats/error          |
| `app/simulator/components/GenerationProgress.tsx` (Task 3) | Progress UI                          |
| `lib/quiz/quiz-session-manager.ts` (Task 2)       | `createSession` with generated pool            |
| `lib/contexts/settings-context.tsx`               | `useSettings` for `aiSettings`                 |

**Steps**:

1. Extend `ViewMode` to `'setup' | 'generating' | 'quiz' | 'results' | 'review'`.
2. On start: if augment is OFF or curated pool already satisfies the count, go straight to `quiz` (no generating view). Otherwise switch to `generating` and invoke the hook.
3. When the hook settles (`stage === 'done'`), create the session with the final pool and switch to `quiz`. On hook `error`, fall back to the curated pool, show a friendly inline message, and proceed to `quiz`.
4. Wire the `GenerationProgress` Cancel button to the hook's cancel/abort; on cancel, return to `setup` without starting a quiz.
5. Preserve existing active-session recovery: `loadActiveSession` on mount still restores an in-flight quiz (including AI-generated pool) directly to `quiz`.

**Tests**:

- Covered by the integration test in Task 6 (page-level flow); keep this task's diff focused on orchestration.

**Acceptance criteria covered**: `generating` view-mode inserted; pool persisted into session; generation never blocks (async hook); cancel/error/skip handling; reload resumes.

**Commit**: `feat(simulator): add generating view-mode to the simulator flow`

---

### Task 6: Provenance badge in `AnswerReview` + E2E-lite flow test `[M]`

**Goal**: Show "AI-generated"/"Curated" badges and validator scores in review, and
prove the whole setup → generating → quiz → results flow with the mock provider.

**Files**:

| File                                            | Action | Description                                            |
|-------------------------------------------------|--------|--------------------------------------------------------|
| `app/simulator/components/AnswerReview.tsx`     | modify | Provenance badge + validator score for generated items |

**Reuse**:

| File                              | What to reuse                                                   |
|-----------------------------------|-----------------------------------------------------------------|
| `lib/ai/generator/types.ts`       | `GeneratedQuestion.generationMeta` (`verdict`, `validatorScore`, `confidence`) |
| `app/simulator/components/AnswerReview.tsx` | Existing badge/pill styling for the new badge         |

**Steps**:

1. In each reviewed question, detect provenance: treat a question with `generationMeta` (or `metadata.source === 'ai-generated'`) as AI-generated, else "Curated".
2. Render a small pill (reuse existing pill classes): "AI-generated" with the validator `overall` score, or "Curated".
3. Add a unit test update for `AnswerReview` covering both badge states.
4. Add the E2E-lite integration test `app/simulator/__tests__/page.test.tsx` (new): with a mock AI provider via `SettingsProvider`, configure a count exceeding the 15 curated questions, drive setup → generating → quiz (answer questions) → results, asserting the generating view appears and the quiz runs to results. No network.

**Tests**:

- `app/simulator/components/__tests__/AnswerReview.test.tsx`: AI-generated badge + score render; curated badge renders.
- `app/simulator/__tests__/page.test.tsx`: full mock-provider flow to results; assert a >15-question quiz is achievable on `aws-ml`.

**Acceptance criteria covered**: provenance badge + validator score; E2E-lite required test; 50-question quiz on `aws-ml`; mock path end-to-end network-free; reload-resume validated via session persistence (Task 2/5).

**Commit**: `feat(simulator): show question provenance in review and add flow test`

---

**Task ordering**: Sequential where dependent — Task 1 (hook) and Task 2 (session)
are independent foundations; Task 3 (progress UI) is independent; Task 4 (setup)
depends on settings only; Task 5 depends on Tasks 1–4; Task 6 depends on Tasks 2 & 5
(needs the session provenance and the wired flow). Recommended order: 1, 2, 3, 4, 5, 6.

## Edge Cases & Error Handling

- Mock provider selected → augment defaults OFF; if enabled, uses canned mock output, no network (Tasks 1, 4, 6).
- Curated pool already satisfies count → skip the `generating` view, go straight to quiz (Tasks 1, 5).
- Partial gap fill → `mix()` degrades gracefully, quiz runs with what's available (Task 1).
- Generation fails entirely (`GenerationResult.error`) → fall back to curated pool, surface friendly message (Tasks 1, 5).
- User cancels during generation → best-effort abort returns to setup (Tasks 1, 3, 5).
- Reload mid-quiz with AI-generated questions → session restores full pool incl. `generationMeta` (Tasks 2, 5).

## Verification

1. `source ~/.nvm/nvm.sh && nvm use` then `npm run test:run` — all suites green, including new `use-question-pool`, `GenerationProgress`, updated `QuizSetup`/`AnswerReview`, and the page flow test.
2. `npm run test:coverage` — confirm `lib/quiz/use-question-pool.ts` meets business-logic coverage (≥85%) and components meet ≥60%.
3. `npm run lint` — zero warnings.
4. `npm run build` — production build succeeds.
5. Manual smoke (mock provider): on `/simulator`, enable augmentation, request 50 questions, confirm the generating view appears, the quiz reaches 50 items, review shows "AI-generated" badges with scores, and a mid-quiz reload resumes.

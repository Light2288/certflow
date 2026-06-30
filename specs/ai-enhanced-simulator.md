# AI-Enhanced Simulator

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | AI-Enhanced Simulator                                  |
| **Type**      | feature                                                |
| **Scope**     | app/simulator + lib/quiz                               |
| **Created**   | 2026-06-29 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The simulator can only draw from the curated question pool. The sole shipped
certification (`aws-ml`) has just 15 curated questions, so a user cannot run a
realistically sized exam simulation (e.g. 50 questions). Phase 8
(`ai-validator-agent`) and Phase 9 (`ai-question-generation`) are already
implemented and provide a `QuestionValidator` and a `QuestionGenerator` that can
draft and validate questions on demand. What is missing is the wiring that
connects those services into the existing simulator UX so users get richer,
on-demand question pools without changing the basic quiz experience.

## Desired Outcome

When a user starts a simulation whose requested count exceeds the curated pool
(and a real AI provider is configured), the simulator fills the gap by generating
and validating questions via the Phase 9 generator, blends them with curated
questions using `mix()`, and then runs the quiz exactly as today. A new
`generating` view-mode shows progress between setup and the quiz. AI-generated
items are visually distinguished during review and the generated pool is
persisted into the session so a reload mid-quiz resumes correctly. The mock
provider path continues to work end-to-end with no network access.

## Acceptance Criteria

- [ ] A user can run a 50-question quiz on `aws-ml` even though only 15 curated
      questions exist, with the gap filled by AI-generated, validated questions.
- [ ] A new `lib/quiz/use-question-pool.ts` hook accepts cert id, topic filter,
      difficulty, requested count, and `aiSettings`, and returns
      `{ questions, isGenerating, generationStats, error }`. It pulls seed
      questions from `lib/loaders/certification-loader.ts`, asks the
      `QuestionGenerator` to fill any gap, and applies `mix()`.
- [ ] `app/simulator/components/QuizSetup.tsx` gains an "Augment with
      AI-generated questions" toggle that defaults ON when a non-mock provider
      is configured and OFF for the mock provider. When ON, the target count is
      not capped by the curated pool size.
- [ ] A new `app/simulator/components/GenerationProgress.tsx` is shown between
      "Start" and "Quiz" while generation runs, displaying progress per stage
      (drafting -> validating -> mixing) with a best-effort Cancel button.
- [ ] `app/simulator/page.tsx` inserts a `generating` view-mode between `setup`
      and `quiz` and persists the generated pool into the session
      (`lib/quiz/quiz-session-manager.ts`) so reloads resume correctly.
- [ ] `app/simulator/components/AnswerReview.tsx` shows an "AI-generated" /
      "Curated" provenance badge and the validator score for AI-generated items.
- [ ] Generation never blocks the UI thread; progress is visible throughout.
- [ ] The mock provider path works end-to-end without any network call.
- [ ] An E2E-lite vitest test drives the page through
      setup -> generating -> quiz -> results using the mock AI provider and
      passes. Tests for `use-question-pool.ts` and `GenerationProgress.tsx` are
      added, and existing simulator component tests are updated. No test hits a
      real network.

## Edge Cases & Error Handling

- **Mock provider selected**: augment toggle defaults OFF; if the user enables
  it, generation uses the mock provider's canned questions with no network.
- **Curated pool already satisfies the requested count**: no generation runs;
  the `generating` view-mode is skipped (or passes through instantly).
- **Generation partially fills the gap** (fewer approved than requested): run
  the quiz with what is available; the `mix()` degrades gracefully when one
  pool is too small (per Phase 9 behaviour).
- **Generation fails entirely** (`GenerationResult.error` populated): fall back
  to the curated pool and surface a friendly message rather than crashing.
- **User cancels during generation**: best-effort abort returns to setup
  without starting a quiz.
- **Reload during a quiz containing AI-generated questions**: the persisted
  generated pool in the session is restored and the quiz resumes correctly.

## Dependencies & Constraints

- Depends on Phase 8 (`ai-validator-agent`) and Phase 9
  (`ai-question-generation`), both already implemented under `lib/ai/validator/`
  and `lib/ai/generator/`.
- Must honor existing contracts:
  - `QuizSessionManager` / `QuizSessionState` / `QuizSessionResult` in
    `lib/quiz/quiz-session-manager.ts`.
  - `SettingsProvider` / `useSettings` in `lib/contexts/settings-context.tsx`.
  - The generator API in `lib/ai/generator/` (`QuestionGenerator`,
    `GenerationRequest`, `GenerationResult`, `GenerationStats`,
    `GeneratedQuestion` with optional `generationMeta`) and the validator API in
    `lib/ai/validator/`.
  - The loader helpers in `lib/loaders/certification-loader.ts`.
- AI-generated questions remain structurally assignable to `Question`
  (`GeneratedQuestion` extends `Question` with an optional `generationMeta`),
  so the quiz flow needs no schema change.
- Tests use `MockAIProvider` and canned-response providers only; never a real
  network. Coverage standards from the plan apply (business logic >= 85%,
  components >= 60%).

## Out of Scope

- Progress tracking and weakness detection (Phase 11).
- Multi-certification selection UI and de-hardcoding the cert id (Phase 12).
- Changes to generation/validation behaviour itself (Phases 8-9 are fixed
  contracts here).
- Server-side persistence of generated questions.

## Notes

- The augment toggle default (ON for non-mock, OFF for mock), faithful
  adherence to the embedded Phase 10 spec-define prompt, and the E2E-lite test
  being a required (not optional) acceptance criterion were all confirmed with
  the user.
- Derived from the embedded spec-define prompt for Phase 10 of
  `IMPLEMENTATION_PLAN_UPDATED.md`.

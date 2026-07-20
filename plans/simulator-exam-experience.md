# Plan: Simulator Exam Experience

| Field        | Value                                   |
|--------------|-----------------------------------------|
| **Title**    | Simulator Exam Experience               |
| **Spec**     | specs/simulator-exam-experience.md      |
| **Type**     | feature                                 |
| **Branch**   | feat/simulator-exam-experience          |
| **Created**  | 2026-07-15 00:00:00                     |
| **Status**   | IMPLEMENTED                             |

## Context

The exam simulator works but doesn't feel like a real certification exam. This
plan adds a real-exam default question count, a generated-vs-pool provenance
badge on the live card, a user-controllable pool↔generated ratio, a choice of
exam modality (all-at-once vs. immediate feedback), per-question mark-for-review
with navigator filtering, a live countdown timer with auto-submit, and
deterministic (seeded) reproducible sessions. It builds directly on top of the
already-merged `simulator-navigator-fixes` (clickable navigator with
answered/visited coloring and `session.visited`).

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/simulator-exam-experience`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/simulator-exam-experience
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

Branch type mapping: feature → `feat/<slug>`

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm test` (or `npm run test:run` for a single non-watch pass) |
| Build  | `npm run build` |
| Lint   | `npm run lint` |

## Key Findings From Exploration

- **`simulator-navigator-fixes` is already merged** (commits `14c6767`,
  `cf23f9d`, `315b107`). `QuizProgress.tsx` already renders a clickable,
  colored navigator and `QuizSessionState` already has `visited: number[]`.
  This plan extends that navigator; no rework of it is needed.
- **`mix()` already accepts `ratio` (fraction *curated*, default `0.3`) and a
  `sessionSeed`** (`lib/ai/generator/question-generator.ts`). The UI control is
  "target % AI-generated"; per the confirmed decision, we pass
  `ratio = 1 - targetAiPct/100` (literal). The exported seeded `shuffle(items, seed)`
  helper already exists there and will be reused for curated selection.
- **Provenance rendering already exists in `AnswerReview.tsx`** via
  `getGenerationMeta()` / `isAIGenerated()`; the badge on `QuestionCard` should
  mirror that markup for consistency. These helpers will be extracted to a
  shared module (Task 2) so both components use one implementation.
- **`use-question-pool.ts` currently uses `Math.random()`** in its local
  `shuffle()` and calls `generator.mix(curated, generated)` with no ratio/seed.
- **Timer/`duration`** is currently unused by the simulator;
  `config.examDetails.duration` is in minutes.

## Tasks

### Task 1: Default question count to the cert's exam size `[S]`

**Goal**: Default the QuizSetup count slider to `config.examDetails.questionCount`
instead of the hardcoded `10`, while keeping it user-adjustable and within slider bounds.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizSetup.tsx` | modify | Accept an `examQuestionCount` prop (or `examDetails`) and seed `questionCount` state from it, clamped to the slider min/max/step. |
| `app/simulator/page.tsx` | modify | Pass `certificationData.config.examDetails.questionCount` into `QuizSetup`. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `app/simulator/page.tsx` | `certificationData.config.examDetails` is already loaded. |

**Steps**:

1. Add an `examQuestionCount: number` prop to `QuizSetupProps`.
2. Initialise `questionCount` state from a helper that clamps the exam count
   into `[5, sliderMax]` and snaps to the nearest valid `step=5` value; fall
   back to `10` when the value is missing/invalid (0).
3. Pass `certificationData.config.examDetails.questionCount` from `page.tsx`.

**Tests**:

- `app/simulator/components/__tests__/QuizSetup.test.tsx`: slider defaults to the
  provided exam count (clamped/snapped); user can still change it; falls back to a
  sane default when the exam count is 0/undefined.

**Acceptance criteria covered**: "count slider defaults to `examDetails.questionCount`".

**Commit**: `feat(simulator): default question count to cert exam size`

---

### Task 2: Extract shared question-provenance helpers `[S]`

**Goal**: Move `isAIGenerated()` / `getGenerationMeta()` out of `AnswerReview.tsx`
into a shared module so `QuestionCard` (Task 3) and `AnswerReview` share one
implementation.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `lib/quiz/question-provenance.ts` | create | Export `getGenerationMeta(question)` and `isAIGenerated(question)` (moved verbatim from `AnswerReview.tsx`). |
| `app/simulator/components/AnswerReview.tsx` | modify | Import the helpers from the shared module; delete the local copies. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `app/simulator/components/AnswerReview.tsx` (lines 13–22) | Existing helper bodies moved as-is. |

**Steps**:

1. Create `lib/quiz/question-provenance.ts` with the two functions and their
   `GeneratedQuestion` import.
2. Replace the local definitions in `AnswerReview.tsx` with an import.
3. Confirm `AnswerReview` still renders identical output (no behaviour change).

**Tests**:

- `lib/quiz/__tests__/question-provenance.test.ts` (new): `isAIGenerated` true for
  `metadata.source === 'ai-generated'` and for a question carrying `generationMeta`;
  false for curated; `getGenerationMeta` returns meta when present.
- Existing `AnswerReview.test.tsx` must remain green (no output change).

**Acceptance criteria covered**: supports the badge criterion; "consistent with `AnswerReview.tsx`".

**Commit**: `refactor(simulator): extract shared question-provenance helpers`

---

### Task 3: Generated-vs-pool badge on the live QuestionCard `[S]`

**Goal**: Show an "AI-generated" (with validator score when present) or "Curated"
badge in the live `QuestionCard` header, matching `AnswerReview`'s styling.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuestionCard.tsx` | modify | Add a provenance badge in the header badge row using the shared helpers. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `lib/quiz/question-provenance.ts` | `isAIGenerated`, `getGenerationMeta` from Task 2. |
| `app/simulator/components/AnswerReview.tsx` (lines 95–108) | Badge markup/classes to copy for visual parity. |

**Steps**:

1. Import the shared helpers into `QuestionCard`.
2. In the existing header badge row (after the Question/Difficulty/type badges),
   render the purple "AI-generated (+ score/10)" badge or the gray "Curated" badge.

**Tests**:

- `app/simulator/components/__tests__/QuestionCard.test.tsx`: renders "Curated" for a
  curated question; renders "AI-generated" (and validator score when `generationMeta`
  present) for a generated question.

**Acceptance criteria covered**: "live `QuestionCard.tsx` renders a badge indicating AI-generated vs. curated pool".

**Commit**: `feat(simulator): show generated-vs-pool badge on question card`

---

### Task 4: Add session fields — seed and flagged set `[S]`

**Goal**: Extend `QuizSessionState` and the session manager with a per-session
`seed` and a `flagged` set, plus toggle logic and backward-compatible loading.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `lib/quiz/quiz-session-manager.ts` | modify | Add `seed: string` and `flagged: number[]` to `QuizSessionState`; accept an optional `seed` in `QuizSessionOptions`/`createSession` (auto-generate when absent); add `toggleFlag(session, index)`; normalize missing `flagged`/`seed` on load. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `lib/quiz/quiz-session-manager.ts` | `generateSessionId()` pattern; `addVisited()` clamp/dedupe pattern for `toggleFlag`; existing `loadSession` normalization block for `visited`. |

**Steps**:

1. Add `seed: string` and `flagged: number[]` to `QuizSessionState`.
2. `createSession`: accept optional `seed`; when absent, auto-generate a stable
   seed (reuse the `Date.now()+random36` id style). Initialise `flagged: []`.
3. Add static `toggleFlag(session, index)` mirroring `addVisited`'s clamp/dedupe,
   removing the index when already present; save and return the updated session.
4. In `loadSession`, normalize `flagged` to `[]` and `seed` to a generated value
   when missing (older persisted sessions).

**Tests**:

- `lib/quiz/__tests__/quiz-session-manager.test.ts`: `createSession` sets a seed and
  empty `flagged`; a passed seed is preserved; `toggleFlag` adds then removes; out-of-range
  indices ignored; loading a session without `flagged`/`seed` normalizes them.

**Acceptance criteria covered**: "flagged state stored on the session"; "seed auto-generated and stored on the session"; "seed persistence".

**Commit**: `feat(quiz): add session seed and flagged-for-review set`

---

### Task 5: Deterministic seeded curated selection in the pool hook `[M]`

**Goal**: Replace `Math.random()` curated selection with the seeded `shuffle`,
pass the target-% ratio and session seed through to `mix()`, and thread the seed
through the page so the same seed reproduces the same selection.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `lib/quiz/use-question-pool.ts` | modify | Accept `seed: string` and `targetAiPercent: number` options; use the generator's exported seeded `shuffle` for curated selection; call `generator.mix(curated, generated, 1 - targetAiPercent/100, seed)`. |
| `app/simulator/page.tsx` | modify | Generate a session seed once per start, pass it (and the target %) into `useQuestionPool`, and pass the same seed into `QuizSessionManager.createSession` in `beginQuiz`. Also apply the seeded shuffle on the curated-only path (replacing the `Math.random()` sort in `handleStartQuiz`). |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `lib/ai/generator/question-generator.ts` | Exported `shuffle(items, seed)`; `mix(seed, generated, ratio, sessionSeed)` signature (unchanged). |

**Steps**:

1. Add `seed: string` and `targetAiPercent: number` to `UseQuestionPoolOptions`.
2. Import `shuffle` from `@/lib/ai/generator` (or its module) and replace the
   local `Math.random()` `shuffle`; derive `curatedSelection` with
   `shuffle(curated, seed).slice(0, requestedCount)`.
3. In `build()`, call `generator.mix(curated, generated, 1 - targetAiPercent/100, seed)`.
4. In `page.tsx`: create the seed when the user starts (store in state so it is
   stable across the generating→quiz transition), pass it + target % into the hook,
   apply the seeded shuffle on the curated-only path, and pass the seed into
   `beginQuiz`/`createSession`.

**Tests**:

- `lib/quiz/__tests__/use-question-pool.test.ts`: same seed + inputs yields the same
  curated order (deterministic); `mix` is called with the derived curated ratio
  (`1 - targetAiPercent/100`) and the seed; existing generation/fallback tests stay green.

**Acceptance criteria covered**: "curated selection uses a seeded shuffle (no `Math.random()`)"; "seed reproduces the same curated selection and generation order"; "pass chosen target % through to `mix()`"; graceful fallback preserved.

**Commit**: `feat(simulator): seed curated selection and wire target ratio to mix`

---

### Task 6: Target-% AI-generated control in QuizSetup `[M]`

**Goal**: Add a "target % AI-generated" control (0–100%, default 30%) shown/active
only when the augment toggle is on, and surface it through `QuizStartConfig`.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizSetup.tsx` | modify | Add `targetAiPercent` state (default 30); render a slider/number input gated behind `augment`; include `targetAiPercent` in the emitted `QuizStartConfig`. |
| `app/simulator/page.tsx` | modify | Read `startConfig.targetAiPercent` and pass it into `useQuestionPool` (from Task 5). |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `app/simulator/components/QuizSetup.tsx` | Existing slider markup/classes (question-count) and the `augment` toggle block. |

**Steps**:

1. Add `targetAiPercent: number` to `QuizStartConfig` and a `targetAiPercent`
   state (default `30`) in `QuizSetup`.
2. Render the control only when `augment` is true (hidden/disabled otherwise),
   labelled "Target % AI-generated" with a 0–100 range.
3. Include `targetAiPercent` in the `onStartQuiz` payload; default sensibly when
   augment is off (value ignored downstream).
4. Wire it through `page.tsx` into the pool hook.

**Tests**:

- `app/simulator/components/__tests__/QuizSetup.test.tsx`: control hidden/disabled when
  augment off; visible when on; default 30; emitted config carries `targetAiPercent`.

**Acceptance criteria covered**: "target % AI-generated control (0–100%) defaulting to 30%, shown/active only when augmentation enabled"; "augmentation off → control hidden/disabled".

**Commit**: `feat(simulator): add target-% AI-generated control to setup`

---

### Task 7: Mark-for-review flagging + navigator styling and filter `[M]`

**Goal**: Let the user flag/unflag the current question, style flagged cells in
the navigator, and provide a way to filter/jump to flagged questions.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuestionCard.tsx` | modify | Add a "Flag for review"/"Unflag" toggle button; accept `isFlagged` + `onToggleFlag` props. |
| `app/simulator/components/QuizProgress.tsx` | modify | Accept `flaggedIndices`; add flag styling/marker to cells; add a "flagged only" filter (and/or a "jump to next flagged" affordance) that uses `onQuestionSelect`. |
| `app/simulator/page.tsx` | modify | Track flags via `QuizSessionManager.toggleFlag`; pass `flagged` down to both components. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `lib/quiz/quiz-session-manager.ts` | `toggleFlag` and `session.flagged` from Task 4. |
| `app/simulator/components/QuizProgress.tsx` | Existing status-grid cell rendering, precedence logic, and legend. |

**Steps**:

1. `QuestionCard`: add `isFlagged` + `onToggleFlag` props and a header/navigation
   toggle button reflecting state.
2. `page.tsx`: add `handleToggleFlag` calling `QuizSessionManager.toggleFlag`,
   pass `isFlagged={session.flagged.includes(currentIndex)}` and `flagged` to the navigator.
3. `QuizProgress`: accept `flaggedIndices`; add a distinct marker (e.g. a corner
   dot / ring) layered on cells and a legend entry; add a "Show flagged only"
   toggle that, combined with `onQuestionSelect`, lets the user jump between flags.

**Tests**:

- `QuestionCard.test.tsx`: flag button toggles label and fires `onToggleFlag`.
- `QuizProgress.test.tsx`: flagged cells show the marker; the filter narrows/jumps
  to flagged questions.

**Acceptance criteria covered**: "each question can be flagged/unflagged"; "navigator visually distinguishes flagged questions and provides a way to filter/jump".

**Commit**: `feat(simulator): add mark-for-review flagging and navigator filter`

---

### Task 8: Exam modality — immediate feedback per question `[M]`

**Goal**: Let the user choose "answer all, then results" (current) vs. "immediate
feedback per question", and in the latter show correct/incorrect + inline
explanation after answering before advancing.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizSetup.tsx` | modify | Add a modality choice (`answer-all` \| `immediate`) to `QuizStartConfig`. |
| `app/simulator/components/QuestionCard.tsx` | modify | Accept `modality` (+ optional `revealed`/`onReveal`); in immediate mode, after answering show correct/incorrect marking on options and the question's explanation inline, gating "Next" until the answer is revealed. |
| `app/simulator/page.tsx` | modify | Store the chosen modality and pass it to `QuestionCard`. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `lib/quiz/quiz-session-manager.ts` | `checkAnswer(question, answer)` for correctness. |
| `app/simulator/components/AnswerReview.tsx` (options + explanation blocks, lines 116–217) | Correct/incorrect option styling and explanation markup to mirror inline. |

**Steps**:

1. Add `modality: 'answer-all' | 'immediate'` to `QuizSetup` (default
   `answer-all`) and to `QuizStartConfig`.
2. `QuestionCard`: accept `modality`; in immediate mode, after the user answers,
   reveal per-option correct/incorrect styling (via `checkAnswer`/`correctAnswer`)
   and the explanation, mirroring `AnswerReview`'s markup; gate advancing on reveal.
3. `page.tsx`: thread modality through to `QuestionCard`.

**Tests**:

- `QuestionCard.test.tsx`: in `answer-all` mode no correctness/explanation shown
  after answering (current behaviour); in `immediate` mode, answering reveals
  correct/incorrect and the explanation, and gates Next until revealed.
- `QuizSetup.test.tsx`: modality selection emitted in config.

**Acceptance criteria covered**: "user can choose exam modality"; "immediate-feedback shows correct/incorrect + explanation inline before advancing"; "advancing gated on having answered".

**Commit**: `feat(simulator): add immediate-feedback exam modality`

---

### Task 9: Live countdown timer with auto-submit `[M]`

**Goal**: Add a "timed exam" toggle (default on) in setup and a live countdown
during the quiz based on `config.examDetails.duration`; when it reaches zero,
auto-submit.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizSetup.tsx` | modify | Add a "Timed exam" toggle (default on) to `QuizStartConfig`. |
| `app/simulator/components/QuizTimer.tsx` | create | Presentational countdown: given `durationMinutes` and an `onExpire` callback, renders mm:ss and counts down. |
| `app/simulator/page.tsx` | modify | Render `QuizTimer` in the quiz view when timing is enabled; on expire call `handleSubmit`. |

**Reuse**:

| File | What to reuse |
|------|----------------|
| `app/simulator/page.tsx` | Existing `handleSubmit` as the expiry action. |
| `app/simulator/components/QuizProgress.tsx` | Placement pattern in the sidebar column. |

**Steps**:

1. Add `timed: boolean` (default true) to `QuizSetup`/`QuizStartConfig`.
2. Create `QuizTimer` using an interval; compute remaining from a start
   timestamp (robust to re-renders); call `onExpire` exactly once at zero;
   show a low-time visual state near the end.
3. `page.tsx`: when `timed`, render `QuizTimer` with
   `certificationData.config.examDetails.duration`; wire `onExpire` → `handleSubmit`.
   Skip rendering entirely when untimed.

**Tests**:

- `app/simulator/components/__tests__/QuizTimer.test.tsx` (new): renders mm:ss;
  counts down with fake timers; fires `onExpire` once at zero. Use
  `vi.useFakeTimers()` (vitest is the framework).
- `QuizSetup.test.tsx`: timed toggle defaults on and is emitted in config.

**Acceptance criteria covered**: "timed exam toggle (default on) + live countdown based on `examDetails.duration`"; "auto-submit at zero"; "timer disabled → no countdown/no auto-submit".

**Commit**: `feat(simulator): add live countdown timer with auto-submit`

---

**Task ordering**:

- Task 2 precedes Task 3 (shared helpers).
- Task 4 precedes Tasks 5 and 7 (session seed + flagged fields).
- Task 5 precedes Task 6 (ratio/seed wiring before the control feeds it).
- Tasks 1, 8, and 9 are largely independent (Task 8 lightly reuses
  `AnswerReview` markup and `checkAnswer`; Task 9 reuses `handleSubmit`).
- Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

## Edge Cases & Error Handling

- **Exam count exceeds available/slider max**: clamped/snapped in Task 1; pool
  degrades to what's available (existing hook behaviour). (Task 1, Task 5)
- **Augmentation off**: target-% control hidden/disabled and value ignored
  downstream. (Task 6)
- **Generator fails/cancelled**: existing graceful fallback to curated pool is
  preserved; target % has no effect on the fallback path. (Task 5)
- **Timer disabled**: no countdown UI, no auto-submit. (Task 9)
- **Timer reaches zero mid-question**: `onExpire` calls `handleSubmit`, which
  captures whatever answers exist. (Task 9)
- **Immediate mode, unanswered question**: advancing gated until an answer is
  submitted and revealed. (Task 8)
- **Flagged questions at submit**: flags are informational; they never block
  submission and ride along in the session record. (Task 4, Task 7)
- **Seed persistence on reload**: `loadSession` normalizes/keeps `seed` so the
  restored session stays stable. (Task 4)
- **Ratio semantics**: UI is literal "target % AI-generated"; pass
  `ratio = 1 - targetAiPercent/100` to `mix()` (fraction curated). This changes
  the effective default blend vs. today's hardcoded `ratio=0.3`. (Task 5, Task 6)

## Verification

1. `npm run test:run` — all simulator/quiz/generator tests green (spec constraint:
   keep simulator tests green), including the new tests added per task.
2. `npm run lint` and `npm run build` — no type or lint regressions.
3. Manual: start a quiz and confirm the count defaults to the cert's exam size;
   the live card shows a Curated/AI-generated badge; with augment on, the
   target-% control appears and changing it shifts the mix; choosing immediate
   feedback reveals correctness + explanation and gates Next; flag a question and
   confirm the navigator marks it and can filter/jump to it; enable the timer and
   confirm the countdown auto-submits at zero; re-running with the same stored
   seed reproduces the same curated selection order.

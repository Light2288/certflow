# Plan: Simulator Navigator Fixes

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Simulator Navigator Fixes          |
| **Spec**     | specs/simulator-navigator-fixes.md |
| **Type**     | bug                                |
| **Branch**   | fix/simulator-navigator-fixes      |
| **Created**  | 2026-07-14 10:30:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The simulator question navigator (`QuizProgress`) colors boxes from a raw
`answeredCount` (`i < answeredCount`) instead of the actual answered set, so
skipping Q1 and answering Q2 wrongly greens box 1. The navigator also lacks a
"visited" state and its boxes are non-clickable despite
`QuizSessionManager.goToQuestion()` already existing. This plan fixes the
coloring, adds a persisted visited state, and wires click-to-jump.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `fix/simulator-navigator-fixes`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b fix/simulator-navigator-fixes
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task below maps to exactly one commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (or `npm test` for watch mode) |
| Build  | `npm run build` |

## Tasks

### Task 1: Add persisted `visited` state to QuizSessionManager `[M]`

**Goal**: Track which question indices have been visited in session state so it
survives navigation and localStorage restore.

**Files**:

| File                                        | Action | Description                                              |
|---------------------------------------------|--------|----------------------------------------------------------|
| `lib/quiz/quiz-session-manager.ts`          | modify | Add `visited` to `QuizSessionState`; seed and update it. |
| `lib/quiz/__tests__/quiz-session-manager.test.ts` | modify | Add tests for visited seeding, marking, clamping, restore. |

**Reuse**:

| File                               | What to reuse                                                        |
|------------------------------------|----------------------------------------------------------------------|
| `lib/quiz/quiz-session-manager.ts` | Existing static-method + immutable-copy + `saveSession()` pattern; existing `goToQuestion` clamping. |

**Steps**:

1. Add `visited: number[]` to the `QuizSessionState` interface (a sorted/unique
   list of visited question indices).
2. In `createSession()`, seed `visited: [0]` (the first question is shown
   immediately on start).
3. Add a private/static helper `markVisited(session, index)` that returns an
   immutable copy with `index` added to `visited` (deduplicated, clamped to
   `[0, questions.length - 1]`), and persists via `saveSession()`. Keep it a
   no-op-copy when the index is already present.
4. Update `nextQuestion()`, `previousQuestion()`, and `goToQuestion()` to mark
   their destination index visited (compose with `markVisited`, keeping a single
   `saveSession()` call per operation to match existing behavior).
5. In `loadSession()`, defensively normalize a missing/invalid `visited` field
   on restored (older) sessions to `[]` without throwing, so legacy persisted
   sessions load cleanly.

**Tests**:

- `createSession` seeds `visited` with `[0]`.
- `nextQuestion` / `previousQuestion` / `goToQuestion` add the destination index
  to `visited` and persist it (verify via `loadSession`).
- `goToQuestion` visited-marking respects the existing clamp (out-of-range index
  does not corrupt `visited`).
- Revisiting an already-visited index does not duplicate entries.
- `loadSession` on a stored session lacking `visited` returns `visited: []`
  (no throw).

**Acceptance criteria covered**: visited persistence; restored-session-without-
visited edge case.

**Commit**: `feat(quiz): track visited questions in session state`

---

### Task 2: Fix per-question coloring and add visited/clickable states in QuizProgress `[M]`

**Goal**: Make `QuizProgress` color each box from the actual answered set, render
four distinguishable states, and invoke a callback when a box is clicked.

**Files**:

| File                                                | Action | Description                                          |
|-----------------------------------------------------|--------|------------------------------------------------------|
| `app/simulator/components/QuizProgress.tsx`         | modify | New props; per-index coloring; visited style; clickable boxes; legend. |
| `app/simulator/components/__tests__/QuizProgress.test.tsx` | modify | Update old count-based assertions; add fixed-coloring + click cases. |

**Reuse**:

| File                                          | What to reuse                                              |
|-----------------------------------------------|------------------------------------------------------------|
| `app/simulator/components/QuizProgress.tsx`   | Existing grid/legend markup and Tailwind class conventions. |

**Steps**:

1. Extend `QuizProgressProps` with:
   - `answeredIndices: number[]` (0-based indices of answered questions),
   - `visitedIndices: number[]` (0-based indices of visited questions),
   - `onQuestionSelect?: (index: number) => void` (jump handler).
   Keep `currentQuestion`, `totalQuestions`, `answeredCount` for the counter/bar.
2. Build lookup sets from `answeredIndices` / `visitedIndices` for O(1) checks.
3. Replace `const isAnswered = i < answeredCount` with
   `const isAnswered = answeredSet.has(i)`; add `const isVisited = visitedSet.has(i)`.
4. Apply a clear precedence for the box style: **current > answered > visited >
   default**. Give visited-but-unanswered a distinct style (e.g. a subtle
   border/tint that differs from both green and default gray) and update the
   `title` text accordingly.
5. Render each box as a `<button type="button">` (keeping the same visual
   classes) that calls `onQuestionSelect(i)` on click; when `onQuestionSelect`
   is omitted, render non-interactive (disabled) boxes so the component degrades
   gracefully and existing render-only tests stay valid.
6. Add a fourth legend entry for the visited state; keep Current/Answered/
   Unanswered wording so existing legend assertions still pass.

**Tests**:

- Skip-Q1/answer-Q2 scenario: with `answeredIndices=[1]`, box 0 is default and
  box 1 is green (the core bug fix).
- Answered style appears iff the index is in `answeredIndices`, independent of
  order/count.
- Current box keeps its highlight and takes precedence over answered/visited.
- Visited-but-unanswered box renders the distinct visited style.
- Clicking a box calls `onQuestionSelect` with the correct 0-based index
  (use `@testing-library/user-event`, already a dependency).
- Legend shows all four states.
- Update the existing count-based tests (`shows answered questions in green`,
  `shows unanswered questions in gray`) to drive off the new props.

**Acceptance criteria covered**: correct per-question coloring; four visual
states + legend; clickable boxes invoke a jump callback; existing tests remain
green with new cases; answered-precedence and click-current edge cases.

**Commit**: `fix(simulator): color navigator per answered question and support jumps`

---

### Task 3: Wire answered set, visited set, and jump handler from the page `[S]`

**Goal**: Derive the answered/visited data from the session and pass it — plus a
jump handler backed by `goToQuestion()` — into `QuizProgress`.

**Files**:

| File                        | Action | Description                                                        |
|-----------------------------|--------|--------------------------------------------------------------------|
| `app/simulator/page.tsx`    | modify | Derive `answeredIndices`/`visitedIndices`; add `handleGoToQuestion`; pass new props. |

**Reuse**:

| File                               | What to reuse                                                       |
|------------------------------------|---------------------------------------------------------------------|
| `lib/quiz/quiz-session-manager.ts` | `QuizSessionManager.goToQuestion()`; `session.visited`.             |
| `app/simulator/page.tsx`           | Existing `handlePrevious` / `handleNext` handler pattern and state update flow. |

**Steps**:

1. Add `handleGoToQuestion(index)` mirroring `handleNext`/`handlePrevious`:
   guard on `session`, call `QuizSessionManager.goToQuestion(session, index)`,
   then `setSession(...)`.
2. In the quiz-view render (`viewMode === 'quiz'`, ~lines 327–333), derive
   `answeredIndices` from
   `session.questions.map((q, i) => (session.answers[q.id] != null ? i : -1)).filter(i => i >= 0)`
   and `visitedIndices` from `session.visited ?? []`.
3. Pass `answeredIndices`, `visitedIndices`, and `onQuestionSelect={handleGoToQuestion}`
   into `<QuizProgress />`, keeping the existing scalar props unchanged.
4. Confirm the mount-restore path (~line 87) needs no change since `visited` now
   travels with the persisted session.

**Tests**:

- No new automated test file is required for the page (no existing
  `page.test.tsx`); correctness is covered by Tasks 1–2 unit tests plus the
  manual verification below. (If the implementer opts to add a page test, follow
  the existing `@testing-library/react` conventions.)

**Acceptance criteria covered**: page derives answered set from `session.answers`
and passes it plus the jump handler and visited data; Previous/Next unchanged.

**Commit**: `fix(simulator): pass answered/visited sets and jump handler to navigator`

---

**Task ordering**: Sequential. Task 2 consumes the `visited` field added in
Task 1; Task 3 wires the props added in Task 2. Each task keeps the suite green
on its own.

## Edge Cases & Error Handling

- Answered/visited/current on the same box resolve via precedence
  current > answered > visited > default (Task 2).
- Clicking the current box calls `goToQuestion` with the same index; `goToQuestion`
  clamps and returns an equivalent state — effectively a safe no-op (Tasks 1–3).
- Out-of-range indices are clamped by `goToQuestion` (Task 1); UI only passes
  valid indices (Task 3).
- Empty/single-question sessions render without errors; `visited` seeded to `[0]`
  covers the single-question case (Tasks 1–2).
- Restored session lacking `visited` normalizes to `[]` without throwing (Task 1).

## Verification

1. Run `npm run test:run` — all existing and new `QuizProgress` and
   `QuizSessionManager` tests pass.
2. Run `npm run build` — type-check/build succeeds with the new props/field.
3. Manual: start a quiz, skip Q1, answer Q2 — box 2 is green and box 1 is not;
   navigate and confirm visited boxes show the distinct visited style; click a
   navigator box and confirm it jumps to that question; reload mid-quiz and
   confirm visited/answered states persist; Previous/Next still work.

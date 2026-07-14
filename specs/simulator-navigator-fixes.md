# Simulator Navigator Fixes

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Simulator Navigator Fixes                              |
| **Type**      | bug                                                    |
| **Scope**     | simulator question navigator (QuizProgress)            |
| **Created**   | 2026-07-14 10:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The question navigator in the exam simulator colors its per-question boxes
based on a raw count rather than the actual set of answered questions, so the
green "answered" indicators do not correspond to the questions the user has
answered. The navigator also lacks a "visited" indicator and is not clickable,
even though the underlying jump-to-question logic already exists. This makes the
navigator misleading and under-powered as a navigation aid.

## Current Behavior

- `app/simulator/components/QuizProgress.tsx` receives only scalar props:
  `currentQuestion`, `totalQuestions`, and `answeredCount`.
- Each box computes `isAnswered = i < answeredCount` (line 59) — a raw count,
  not membership in the actual answered set. If the user skips Q1 and answers
  Q2, box 1 turns green and box 2 stays gray.
- The component never receives the `session.answers` map, so it cannot know
  which specific questions are answered.
- There is no "visited" concept anywhere: `QuizSessionState`
  (`lib/quiz/quiz-session-manager.ts`) has no visited field, and the component
  renders no visited state.
- The navigator boxes are plain, non-clickable `<div>`s. `handlePrevious` /
  `handleNext` in `app/simulator/page.tsx` work, but there is no way to jump
  directly to a question. `QuizSessionManager.goToQuestion()`
  (`lib/quiz/quiz-session-manager.ts`, ~lines 203–219) already exists and is
  correct, but is not wired to any UI.

## Desired Outcome

- `QuizProgress` colors each box based on the actual answered set derived from
  `session.answers`, so box N is green only when question N has an answer.
- The navigator tracks and displays a "visited" state distinct from answered
  and current, giving four visual states: **answered**, **current**,
  **visited (but unanswered)**, and **default (unvisited/unanswered)**.
- The navigator boxes are clickable and jump the quiz to the selected question
  by wiring `QuizSessionManager.goToQuestion()` through `app/simulator/page.tsx`.
- Existing Previous/Next behavior is unchanged.

## Proposed Approach

- **Answered data:** Derive an answered set (question indices, or a boolean map
  keyed by index) from `session.answers` in `app/simulator/page.tsx` and pass it
  to `QuizProgress` as a new prop. `QuizProgress` remains a presentational
  component receiving explicit props, consistent with its current design; it
  does not import the session manager itself.
- **Visited state:** Track "visited" in session state
  (`QuizSessionState.visited`, e.g. a set/array of visited question indices or
  IDs) so it persists across navigation, survives the active-session restore on
  mount (`app/simulator/page.tsx` ~line 87), and is saved to localStorage
  alongside the rest of the session. The current question is marked visited on
  navigation (initial question, Previous, Next, and jump-to).
- **Click-to-jump:** Add a jump handler in `app/simulator/page.tsx` that calls
  `QuizSessionManager.goToQuestion(session, index)` and updates state, and pass
  it into `QuizProgress` so each box invokes it on click.

## Acceptance Criteria

- [ ] Given a session where Q1 is skipped and Q2 is answered, box 1 renders in
      the default (unanswered) style and box 2 renders in the answered (green)
      style.
- [ ] A box renders the answered style if and only if the corresponding question
      has an entry in `session.answers`, regardless of the order in which
      questions were answered.
- [ ] The navigator renders four distinguishable states: answered, current,
      visited-but-unanswered, and default (unvisited/unanswered), with a legend
      that reflects them.
- [ ] Visited state is tracked in session state and persists across
      Previous/Next navigation and across an active-session reload/restore.
- [ ] Clicking a navigator box jumps the quiz to that question via
      `QuizSessionManager.goToQuestion()`, updating the displayed question and
      the current-question highlight.
- [ ] Previous and Next navigation continue to work exactly as before.
- [ ] `app/simulator/page.tsx` derives the answered set from `session.answers`
      and passes it (plus the jump handler and visited data) into `QuizProgress`.
- [ ] Existing `QuizProgress` tests remain green, with new test cases covering
      the corrected per-question coloring (including the skip-Q1/answer-Q2
      scenario) and the click-to-jump interaction.

## Edge Cases & Error Handling

- **Answered precedence over visited/current:** A box that is both answered and
  current, or answered and visited, resolves to a single unambiguous style
  (define a clear precedence, e.g. current > answered > visited > default).
- **Clicking the current question's box:** Is a no-op (or safely re-selects the
  same question) and does not corrupt state.
- **Out-of-range / boundary indices:** `goToQuestion()` already clamps indices;
  the UI must only ever pass valid box indices.
- **Empty or single-question sessions:** Navigator renders correctly with no
  runtime errors.
- **Restored session without a `visited` field** (older persisted sessions):
  Treat missing visited data as "no questions visited yet" without throwing.

## Dependencies & Constraints

- Must keep the existing `simulator` / `QuizProgress` test suite green; add new
  cases rather than weakening existing ones.
- `QuizProgress` should remain a presentational component driven by explicit
  props (no direct session-manager import).
- Reuse the existing `QuizSessionManager.goToQuestion()`; do not reimplement
  jump logic.
- Follow the project's Next.js conventions (see `AGENTS.md`).

## Out of Scope

- Exam modality (belongs to `simulator-exam-experience`).
- Mark-for-review (belongs to `simulator-exam-experience`).
- Timer (belongs to `simulator-exam-experience`).

## Notes

- Relevant files: `app/simulator/components/QuizProgress.tsx`,
  `app/simulator/page.tsx`, `lib/quiz/quiz-session-manager.ts`.
- `session.answers` is keyed by `question.id`; the answered set for box N is
  determined by whether `session.answers[session.questions[N].id]` is present.
- Precise state-precedence order and exact color choices for the
  visited-but-unanswered style can be finalized during implementation, as long
  as the four states are visually distinguishable and reflected in the legend.

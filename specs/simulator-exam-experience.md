# Simulator Exam Experience

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Simulator Exam Experience                              |
| **Type**      | feature                                                |
| **Scope**     | app/simulator/, lib/quiz/, lib/ai/generator/           |
| **Created**   | 2026-07-15 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The exam simulator works but does not yet feel like a real certification exam.
Several affordances that candidates expect are missing or hardcoded: the
question count defaults to an arbitrary 10 rather than the cert's real exam
size, there is no live countdown, no way to mark questions for later review,
no choice of exam modality (all-at-once vs. immediate feedback), and no
visibility into whether a live question is AI-generated or from the curated
pool. The pool↔generated mix is hardcoded and the curated selection is
non-deterministic, so sessions cannot be reproduced. This work makes the
simulator behave more like the real exam and gives the user meaningful control
over the session.

## Current Behavior

- **Question count:** `QuizSetup.tsx` defaults the count slider to a hardcoded
  `10`, ignoring `config.examDetails.questionCount`.
- **Provenance badge:** Provenance already exists on questions
  (`metadata.source === 'ai-generated'` and `generationMeta`). `AnswerReview.tsx`
  renders it, but the live `QuestionCard.tsx` does not.
- **Pool↔generated ratio:** `QuestionGenerator.mix()` in
  `lib/ai/generator/question-generator.ts` accepts a ratio parameter, but
  `lib/quiz/use-question-pool.ts` calls it without exposing that value (ratio
  effectively hardcoded to `0.3`).
- **Modality:** The simulator only supports "answer all, then see results"
  (`handleSubmit` in `page.tsx`). There is no per-question immediate feedback.
- **Mark-for-review:** No per-question flag exists; the session has no flagged
  set and the navigator offers no way to flag, filter, or jump to flagged
  questions.
- **Timer:** Only end-of-quiz `timeSpent` is computed in
  `quiz-session-manager.ts`. There is no live countdown UI and
  `config.examDetails.duration` is unused by the simulator.
- **Determinism:** Curated selection uses `Math.random()` (`shuffle()` in
  `use-question-pool.ts`) while generation uses a seeded shuffle, so sessions
  are not reproducible.

## Desired Outcome

The simulator setup and runtime give the user a real-exam-like, configurable,
and reproducible experience:

1. **Real-exam default count** — the count slider defaults to the cert's
   `config.examDetails.questionCount` (the user can still change it).
2. **Generated-vs-pool badge** — the live `QuestionCard` shows whether the
   current question is AI-generated or from the curated pool, using the
   existing provenance signals, consistent with `AnswerReview`.
3. **User-controllable ratio** — a "target % AI-generated" control (0–100%,
   defaulting to the current 30%) that is only visible/active when AI
   augmentation is enabled. `use-question-pool.ts` passes this value to
   `mix()`. When the pool or generator cannot fill the requested quota, the
   mix degrades gracefully toward whatever is available (existing fallback
   behavior preserved).
4. **Exam modality** — the user chooses between:
   - "Answer all, then see results" (current behavior), or
   - "Immediate feedback per question": after answering, the user sees
     correct/incorrect **and** the question's explanation inline before
     advancing.
5. **Mark-for-review** — a per-question flag stored on the session, with
   navigator styling for flagged questions and a way to filter/jump to them.
6. **Live timer** — an optional countdown using `config.examDetails.duration`,
   toggled on in `QuizSetup` (defaulting to on). When enabled and the
   countdown reaches zero, the quiz auto-submits (equivalent to `handleSubmit`).
7. **Reproducible sessions** — both curated selection and generation use a
   seeded shuffle. A seed is auto-generated per session and stored on the
   session so the same seed reproduces the same curated selection and
   generation order. No seed input is surfaced in the UI.

## Acceptance Criteria

- [ ] The count slider in `QuizSetup.tsx` defaults to
      `config.examDetails.questionCount` and the user can still adjust it.
- [ ] The live `QuestionCard.tsx` renders a badge indicating AI-generated vs.
      curated pool, derived from `metadata.source === 'ai-generated'` /
      `generationMeta`, consistent with `AnswerReview.tsx`.
- [ ] `QuizSetup` exposes a "target % AI-generated" control (0–100%) defaulting
      to 30%, shown/active only when AI augmentation is enabled.
- [ ] `use-question-pool.ts` passes the chosen target % through to
      `QuestionGenerator.mix()` instead of the hardcoded value.
- [ ] When the pool or generator cannot satisfy the target quota, the session
      still builds using whatever questions are available (graceful fallback),
      without error to the user beyond existing surfacing.
- [ ] The user can choose exam modality in setup: "answer all, then results"
      vs. "immediate feedback per question".
- [ ] In immediate-feedback mode, after answering a question the user sees
      correct/incorrect status and the question's explanation inline before
      advancing.
- [ ] Each question can be flagged/unflagged for review; the flagged state is
      stored on the session.
- [ ] The navigator visually distinguishes flagged questions and provides a way
      to filter and/or jump to flagged questions.
- [ ] `QuizSetup` provides a "timed exam" toggle (defaulting to on); when on, a
      live countdown based on `config.examDetails.duration` is displayed during
      the quiz.
- [ ] When the timer is enabled and reaches zero, the quiz auto-submits.
- [ ] Curated selection uses a seeded shuffle (no `Math.random()`), and a seed
      is auto-generated and stored on the session so the same seed reproduces
      the same curated selection and generation order.
- [ ] All existing simulator tests remain green.

## Edge Cases & Error Handling

- **`config.examDetails.questionCount` exceeds available questions:** count
  defaults to the cert value but the effective session degrades gracefully to
  what the pool + generation can provide.
- **Augmentation off:** the target-% control is hidden/disabled; the session is
  entirely curated pool.
- **Generator fails or is cancelled:** existing graceful fallback to the curated
  pool is preserved; target % has no effect on the fallback path.
- **Timer disabled (untimed practice):** no countdown UI, no auto-submit; the
  session runs with unlimited time.
- **Timer reaches zero mid-question:** in-progress selection is captured as-is
  and the quiz auto-submits with whatever has been answered.
- **Immediate-feedback mode with an unanswered question:** advancing is gated on
  having answered (feedback is shown after an answer is submitted).
- **Flagged questions at submit:** flags are informational; they do not block
  submission and are reflected in the session record.
- **Seed persistence:** reloading/restoring a session reuses the stored seed so
  the selection stays stable.

## Dependencies & Constraints

- **Depends on / overlaps with `simulator-navigator-fixes`** (clickable
  navigator, correct answered-question coloring). This spec assumes that work
  may already be done. If it is not, the navigator changes here (flagged
  styling, filter/jump) must coordinate with — and avoid conflicting with —
  that spec's navigator changes; note the overlap during planning/implementation.
- Provenance signals (`metadata.source`, `generationMeta`) already exist and
  must be reused rather than re-derived.
- `QuestionGenerator.mix()` already accepts a ratio parameter; wire it through
  rather than changing its signature unnecessarily.
- Keep all existing simulator tests green.

## Out of Scope

- Surfacing or accepting a user-entered seed in the UI (auto seed only).
- Changing the generator's validation, prompting, or scoring logic.
- New certification config fields beyond the existing
  `examDetails.questionCount` and `examDetails.duration`.
- Persisting sessions to a backend or cross-device sync.
- Redesigning `AnswerReview` or the end-of-quiz results beyond what parity with
  the new badge/feedback requires.

## Notes

- Item (b) badge should visually match how `AnswerReview.tsx` already presents
  provenance for consistency.
- Item (c) framing confirmed as "target % AI-generated", where 30% corresponds
  to the current hardcoded `0.3`.
- Item (d) immediate feedback confirmed as correct/incorrect **plus** the
  question's explanation inline.
- Item (f) timer confirmed as user-toggleable (default on) with auto-submit at
  zero.
- Determinism confirmed as auto seed stored on the session, no UI seed input.

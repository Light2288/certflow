# Progress Tracking & Weakness Detection

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Progress Tracking & Weakness Detection                 |
| **Type**      | feature                                                |
| **Scope**     | `lib/progress`, simulator results, new `/progress` dashboard, navigation |
| **Created**   | 2026-06-30 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow currently has no progress-tracking persistence. Quiz performance
lives only inside the active session and is discarded once a quiz ends —
there is no per-topic or per-subtopic history, no notion of trends over
time, and no way for a learner to see which areas are weakest and need
practice. This is Phase 11 of `IMPLEMENTATION_PLAN_UPDATED.md` and the
first half of "adaptive" learning (adaptive *question selection* is
explicitly deferred). It consumes existing quiz results only and does not
depend on the AI generation chain (Phases 8–10), so it can be built in
parallel with them.

## Desired Outcome

After a quiz is completed, CertFlow records the result and recomputes
per-topic and per-subtopic aggregates, persisted in `localStorage` keyed
by certification id. A new `/progress` dashboard surfaces the learner's
weakest topics, recent sessions, and per-topic trends, with a one-click
deeplink to practise a weak topic in the simulator. The quiz results
screen also gains an all-time "Topic performance" view referencing
lifetime scores, not just the current session. Resetting progress clears
tracking state without touching AI provider settings.

## Acceptance Criteria

- [ ] A new `lib/progress/types.ts` defines `TopicPerformance` (`topicId`,
      `attempted`, `correct`, `averageScore`, `lastPracticed` ISO string,
      `trend: 'up' | 'down' | 'flat'`) and `UserProgress`
      (`certificationId`, `sessions`, `topicPerformance:
      Record<string, TopicPerformance>`, `subtopicPerformance:
      Record<string, TopicPerformance>`, `lastActivity`).
- [ ] Stored `sessions` are **lightweight per-session summaries** (e.g.
      `sessionId`, `certificationId`, `score`, `correctAnswers`,
      `incorrectAnswers`, `unanswered`, `totalQuestions`, `timeSpent`,
      `completedAt`, and per-topic correct/total counts) — **not** the
      full `QuizSessionResult` with all `questions` and `answers` arrays —
      to keep `localStorage` small.
- [ ] `lib/progress/progress-storage.ts` is `localStorage`-backed, keyed
      per certification id, and exposes `recordSession(result)`,
      `getProgress(certId)`, `reset(certId)`, `export()`, and `import()`.
- [ ] `recordSession` recomputes aggregates and `trend` by deriving
      per-topic/subtopic correct/total from the result's questions
      (each `Question` carries `topicId` and `subtopicId`) and answers.
- [ ] `trend` for a topic is computed by comparing the most recent
      attempt's score against the previous attempt's score, with a small
      flat threshold so near-equal scores read as `'flat'`. The
      computation is deterministic and unit-tested.
- [ ] `app/simulator/page.tsx` records the session on quiz completion via
      the progress storage layer.
- [ ] `app/simulator/components/QuizResults.tsx` shows an all-time "Topic
      performance" section referencing lifetime scores (not just the
      current session).
- [ ] A new `app/progress/page.tsx` dashboard shows top weak topics,
      recent sessions, trend indicators, and a per-topic breakdown.
- [ ] Weak topics are ranked by `averageScore` ascending, considering only
      topics with at least a minimum number of attempts (an
      attempts floor) so single-question samples do not dominate.
- [ ] Each per-topic breakdown row links to "Practice this topic" via
      `/simulator?topic=<topicId>`; the simulator's `QuizSetup` reads that
      query param on load and pre-selects the matching topic filter.
- [ ] A new `app/progress/components/TopicPerformanceCard.tsx` renders a
      single topic's performance (attempted, correct, average, trend).
- [ ] A "Progress" link is added to `app/components/Navigation.tsx`,
      following existing navigation patterns (active highlighting, ARIA,
      mobile menu).
- [ ] `reset(certId)` clears progress state without affecting AI settings.
- [ ] Unit/component tests cover storage round-trip, aggregate math, trend
      computation, and `TopicPerformanceCard`; coverage ≥ 80% on
      `lib/progress`.

## Edge Cases & Error Handling

- **No prior progress for a cert**: `getProgress(certId)` returns a valid
  empty `UserProgress` (empty maps, empty sessions) rather than `null`.
- **Topic with very few attempts**: excluded from "weak topics" ranking by
  the attempts floor, but still shown in the full per-topic breakdown.
- **Unanswered questions**: counted toward `attempted` per the result's
  totals only as defined by the existing results math; they must not be
  miscounted as correct.
- **Single attempt (no previous score)**: `trend` resolves to `'flat'`.
- **Corrupt / unparseable `localStorage` entry**: storage layer degrades
  gracefully (logs and falls back to empty progress), never crashes the app.
- **SSR / `window` undefined**: storage methods guard for `typeof window`
  like the existing session manager and return safe defaults.
- **Deeplink to a topic that does not exist** in the current cert: the
  simulator ignores the unknown filter and falls back to the default setup.
- **`import()` of malformed data**: validated/rejected without overwriting
  existing good progress.

## Dependencies & Constraints

- Consumes existing quiz results; **no new external dependencies**.
- Must honor existing contracts: the `QuizSession*` types and
  `QuizSessionManager` in `lib/quiz/quiz-session-manager.ts`, and the
  `Topic`/`Subtopic`/`Question` types in `lib/types/certification.ts`
  (per-topic/subtopic data is derived from `Question.topicId` /
  `Question.subtopicId`, since `QuizSessionResult` is not pre-aggregated
  by topic).
- Persistence is `localStorage` with JSON serialization, keyed by
  certification id (consistent with Architecture Decision 4 and forward
  compatible with Phase 12 multi-cert switching).
- Follows feature-based organisation: `lib/progress/` for logic,
  `app/progress/components/` for UI, co-located `__tests__/`.
- Tests must never hit a real network and must keep the existing suite green.

## Out of Scope

- Adaptive question selection (choosing questions based on weakness).
- AI-based weakness analysis or recommendations.
- Multi-certification switching UI (Phase 12) — though progress storage is
  already keyed by cert id to support it.
- Server-side persistence of progress.
- Changes to the AI generation/validation chain (Phases 8–10).

## Notes

- Slug confirmed: `progress-tracking` → `specs/progress-tracking.md`.
- Decisions captured during definition:
  - Session history is stored as lightweight summaries, not full
    `QuizSessionResult` objects.
  - Trend = comparison of the last two attempts' scores with a flat
    threshold.
  - Weak topics = lowest `averageScore` with a minimum-attempts floor.
  - Practice deeplink format = `/simulator?topic=<topicId>`, with the
    simulator wired to read it.
- Source: Phase 11 of `IMPLEMENTATION_PLAN_UPDATED.md` (embedded
  spec-define prompt, lines 699–745).

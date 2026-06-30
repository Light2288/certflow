# Plan: Progress Tracking & Weakness Detection

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Progress Tracking & Weakness Detection |
| **Spec**     | specs/progress-tracking.md         |
| **Type**     | feature                            |
| **Branch**   | feat/progress-tracking             |
| **Created**  | 2026-06-30 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

CertFlow discards quiz performance once a session ends, so learners cannot
see per-topic history, trends, or weak areas. This plan adds a
`localStorage`-backed progress layer (`lib/progress/`), wires it into quiz
completion, surfaces lifetime topic performance on the results screen, adds
a `/progress` dashboard, and lets the simulator pre-select a topic via a
`?topic=<id>` deeplink. It consumes existing quiz results only and adds no
new dependencies.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/progress-tracking`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/progress-tracking
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

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (single run) / `npm test` (watch) |
| Coverage | `npm run test:coverage` |
| Lint   | `npm run lint` |
| Build  | `npm run build` |

> Note: this machine uses nvm — run `source ~/.nvm/nvm.sh && nvm use`
> before npm commands if the Node version is not active.

## Tasks

### Task 1: Progress types & aggregation helpers `[S]`

**Goal**: Define the progress data model and pure, testable helpers for
deriving per-topic/subtopic stats and trends from a completed quiz result.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `lib/progress/types.ts` | create | `TopicPerformance`, `UserProgress`, `SessionSummary`, `ProgressStorageResult` types and tuning constants. |
| `lib/progress/aggregate.ts` | create | Pure functions: derive per-question correctness, build per-topic/subtopic counts from a `QuizSessionResult`, compute `averageScore`, `trend`, and weak-topic ranking. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `lib/quiz/quiz-session-manager.ts` | `QuizSessionResult` shape, `QuizSessionManager.checkAnswer` for per-question correctness. |
| `lib/types/certification.ts` | `Question.topicId` / `Question.subtopicId` for grouping. |

**Steps**:

1. In `types.ts` define `TopicPerformance { topicId, attempted, correct,
   averageScore, lastPracticed, trend: 'up' | 'down' | 'flat' }` and
   `UserProgress { certificationId, sessions: SessionSummary[],
   topicPerformance: Record<string, TopicPerformance>, subtopicPerformance:
   Record<string, TopicPerformance>, lastActivity }`.
2. Define `SessionSummary` as a lightweight record: `sessionId`,
   `certificationId`, `score`, `correctAnswers`, `incorrectAnswers`,
   `unanswered`, `totalQuestions`, `timeSpent`, `completedAt`, and
   `topicBreakdown: Record<string, { correct: number; total: number }>`
   (and the equivalent for subtopics). No `questions`/`answers` arrays.
3. Export tuning constants: `WEAK_TOPIC_MIN_ATTEMPTS` (attempts floor) and
   `TREND_FLAT_THRESHOLD` (score delta below which trend is `'flat'`).
4. In `aggregate.ts` add pure helpers:
   - `summarizeSession(result): SessionSummary` — uses
     `QuizSessionManager.checkAnswer` to bucket each question into its
     `topicId`/`subtopicId` correct/total tallies.
   - `recomputePerformance(sessions): { topicPerformance, subtopicPerformance }`
     — aggregates attempted/correct, derives `averageScore`, sets
     `lastPracticed`, and computes `trend` by comparing the last two
     attempts' per-topic scores against `TREND_FLAT_THRESHOLD` (single
     attempt → `'flat'`).
   - `rankWeakTopics(topicPerformance): TopicPerformance[]` — ascending by
     `averageScore`, excluding topics with `attempted < WEAK_TOPIC_MIN_ATTEMPTS`.

**Tests**:

- `lib/progress/__tests__/aggregate.test.ts`: per-topic/subtopic bucketing,
  unanswered counted as not-correct, `averageScore` math, trend up/down/flat
  including single-attempt → flat, weak-topic ranking with attempts floor.

**Acceptance criteria covered**: types definition; lightweight summaries;
aggregate derivation from questions; deterministic trend; weak-topic ranking
with attempts floor; unanswered handling.

**Commit**: `feat(progress): add progress types and aggregation helpers`

---

### Task 2: Progress storage service `[M]`

**Goal**: Persist progress in `localStorage` keyed by certification id, with
record/get/reset/export/import and graceful degradation.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `lib/progress/progress-storage.ts` | create | `ProgressStorage` static class + convenience exports. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `lib/settings/settings-storage.ts` | Static-class + `StorageResult<T>` pattern, `typeof window` guards, try/catch logging, export/import shape. |
| `lib/progress/aggregate.ts` | `summarizeSession`, `recomputePerformance` from Task 1. |

**Steps**:

1. Use a per-cert key, e.g. `certflow_progress_<certId>`, mirroring the
   `STORAGE_KEY` convention. Guard every method with `typeof window`.
2. `getProgress(certId): UserProgress` — returns a valid **empty**
   `UserProgress` (empty maps/sessions) when nothing is stored or when the
   stored JSON is corrupt (log + fall back, never throw).
3. `recordSession(result)` — reads existing progress for
   `result` cert id, appends `summarizeSession(result)`, recomputes
   performance via `recomputePerformance`, updates `lastActivity`, persists.
4. `reset(certId)` — removes only that cert's progress key; must not touch
   `certflow_ai_settings`.
5. `export(certId?)` / `import(json)` — serialize/parse with validation;
   `import` rejects malformed data without overwriting existing good data.
6. Add a `private static isValidProgress(obj): obj is UserProgress` guard.

**Tests**:

- `lib/progress/__tests__/progress-storage.test.ts`: round-trip
  record→get; multi-session aggregation; per-cert isolation; empty default
  for unknown cert; corrupt entry → empty fallback; `reset` leaves AI
  settings key intact; `import` rejects malformed JSON without clobbering.
  Use `localStorage.clear()` in `beforeEach`/`afterEach` per existing tests.

**Acceptance criteria covered**: storage API surface; per-cert keying;
recompute on record; reset preserves AI settings; corrupt-entry and malformed
import edge cases; coverage on `lib/progress`.

**Commit**: `feat(progress): add localStorage-backed progress storage`

---

### Task 3: Record sessions on quiz completion `[S]`

**Goal**: Persist progress when a quiz finishes.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/page.tsx` | modify | Call `ProgressStorage.recordSession` in `handleSubmit` after computing results. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `lib/progress/progress-storage.ts` | `recordSession` from Task 2. |
| `app/simulator/page.tsx` | Existing `handleSubmit` flow; `certificationData.config.id` for the cert id (no de-hardcoding needed). |

**Steps**:

1. Import `ProgressStorage`. In `handleSubmit`, after
   `calculateResults`, call `ProgressStorage.recordSession(sessionResults)`
   (the `QuizSessionResult` already carries `sessionId` and `questions`;
   ensure cert id is available — derive from `completedSession.certificationId`).
2. Wrap in a try/catch or rely on the storage layer's internal guarding so a
   storage failure never blocks showing results.

**Tests**:

- Update `app/simulator/__tests__/page.test.tsx` (or add a focused test) to
  assert that completing a quiz invokes recording (spy on `ProgressStorage`
  / assert `localStorage` progress key is written) under the mock provider.

**Acceptance criteria covered**: simulator records session on completion.

**Commit**: `feat(simulator): record progress on quiz completion`

---

### Task 4: All-time topic performance on results screen `[S]`

**Goal**: Show lifetime per-topic performance on the results view, not just
the current session.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizResults.tsx` | modify | Add a "Topic performance (all-time)" section reading `ProgressStorage.getProgress(certId)`. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `lib/progress/progress-storage.ts` | `getProgress`. |
| `lib/loaders/certification-loader.ts` | `getTopicById` for topic display names. |

**Steps**:

1. Pass the cert id (and topics, available from `certificationData`) into
   `QuizResults` via a new prop, or read progress inside the component on
   mount via `useEffect` keyed by cert id. Prefer passing `certificationId`
   + `topics` as props from `page.tsx` to keep the component testable.
2. Render an all-time section listing per-topic `attempted`/`correct`/
   `averageScore` with topic names resolved via `getTopicById`. Keep
   existing per-session statistics unchanged.

**Tests**:

- Update `app/simulator/components/__tests__/QuizResults.test.tsx`: with
  seeded progress in `localStorage`, the all-time section renders lifetime
  scores; with no progress, it degrades gracefully (empty/hidden).

**Acceptance criteria covered**: results screen shows all-time topic
performance.

**Commit**: `feat(simulator): show all-time topic performance in results`

---

### Task 5: TopicPerformanceCard component `[S]`

**Goal**: A reusable card rendering one topic's performance with a trend
indicator and a practice deeplink.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/progress/components/TopicPerformanceCard.tsx` | create | Renders topic name, attempted, correct, averageScore, trend badge, and a "Practice this topic" link to `/simulator?topic=<topicId>`. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `app/topics/components/TopicCard.tsx` | Card styling/dark-mode/`next/link` conventions. |
| `lib/progress/types.ts` | `TopicPerformance` prop type. |

**Steps**:

1. Accept `performance: TopicPerformance` and `topicName: string` props.
2. Render stats and a trend badge (`up`/`down`/`flat` with distinct color +
   accessible label).
3. Render a `Link` to `/simulator?topic=<topicId>` labelled "Practice this
   topic".

**Tests**:

- `app/progress/components/__tests__/TopicPerformanceCard.test.tsx`
  (mock `next/link` per `TopicCard.test.tsx`): renders stats, correct trend
  badge per value, and deeplink `href` includes the topic id.

**Acceptance criteria covered**: `TopicPerformanceCard` renders performance;
deeplink format; component test coverage.

**Commit**: `feat(progress): add TopicPerformanceCard component`

---

### Task 6: Progress dashboard page `[M]`

**Goal**: A `/progress` page showing top weak topics, recent sessions, and a
per-topic breakdown.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/progress/page.tsx` | create | Client page loading current cert + progress, rendering weak topics, recent sessions, and per-topic breakdown via `TopicPerformanceCard`. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `app/topics/page.tsx` | Page shell, loading/error states, cert-loading pattern (`loadCertification('aws-ml')`). |
| `lib/progress/progress-storage.ts` | `getProgress`. |
| `lib/progress/aggregate.ts` | `rankWeakTopics`. |
| `lib/loaders/certification-loader.ts` | `loadCertification`, `getTopicById`. |
| `app/progress/components/TopicPerformanceCard.tsx` | Per-topic rows (Task 5). |

**Steps**:

1. Load certification data (cert id `'aws-ml'`, consistent with current
   simulator/topics — multi-cert is Phase 12) and `getProgress(certId)`.
2. Render: a "Weak topics" section using `rankWeakTopics`; a "Recent
   sessions" list from `progress.sessions` (most recent first, score +
   date); a full per-topic breakdown of `topicPerformance` using
   `TopicPerformanceCard`.
3. Handle the empty state (no sessions yet) with a friendly prompt linking to
   the simulator. Include dark-mode styling consistent with other pages.

**Tests**:

- `app/progress/__tests__/page.test.tsx`: with seeded progress, weak topics
  and recent sessions render; empty-state renders when no progress exists.

**Acceptance criteria covered**: dashboard with weak topics, recent sessions,
trend indicators, per-topic breakdown; empty-progress edge case.

**Commit**: `feat(progress): add progress dashboard page`

---

### Task 7: Add Progress link to navigation `[S]`

**Goal**: Make the dashboard reachable within one click from anywhere.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/components/Navigation.tsx` | modify | Add `{ name: 'Progress', href: '/progress', icon: '📊' }` to `navItems`. |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `app/components/Navigation.tsx` | Existing `navItems` array, active-highlight, ARIA, mobile-menu rendering (all driven by the array). |

**Steps**:

1. Insert the Progress entry into `navItems` (e.g. after Topics). No other
   changes needed — desktop/mobile rendering and active state are
   array-driven.

**Tests**:

- Update `app/components/__tests__/Navigation.test.tsx`: assert a Progress
  link to `/progress` renders in desktop and mobile menus and gets active
  styling on that route.

**Acceptance criteria covered**: Progress link added following existing
navigation patterns; weak topics reachable within one click.

**Commit**: `feat(nav): add Progress link to navigation`

---

### Task 8: Pre-select topic in simulator from deeplink `[S]`

**Goal**: Let `/simulator?topic=<topicId>` pre-select the matching topic
filter, ignoring unknown ids.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/simulator/components/QuizSetup.tsx` | modify | Initialize `selectedTopic` from a `topicId` prop / `?topic=` query param when it matches an existing topic. |
| `app/simulator/page.tsx` | modify | Read `?topic=` via `useSearchParams` and pass it down (wrapped in `Suspense` per Next.js requirements). |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `app/simulator/components/QuizSetup.tsx` | Existing `selectedTopic` state and topic `<select>`. |
| Next.js `useSearchParams` | Read the query param client-side. |

**Steps**:

1. In `page.tsx`, read `useSearchParams().get('topic')` and pass it to
   `QuizSetup` as an `initialTopicId` prop. Ensure the component using
   `useSearchParams` is wrapped in `<Suspense>` (Next.js App Router
   requirement) — consult `node_modules/next/dist/docs/` if the build warns.
2. In `QuizSetup`, initialize `selectedTopic` to `initialTopicId` only when
   it matches a `topics[].id`; otherwise keep `'all'` (unknown id ignored).

**Tests**:

- Update `app/simulator/components/__tests__/QuizSetup.test.tsx`: a valid
  `initialTopicId` pre-selects that topic; an unknown id falls back to
  `'all'`.

**Acceptance criteria covered**: deeplink pre-selects topic; unknown-topic
edge case falls back to default.

**Commit**: `feat(simulator): pre-select topic from query deeplink`

---

**Task ordering**: Tasks 1 → 2 are foundational (types/helpers, then
storage). Task 3 depends on 2. Task 4 depends on 2 (and benefits from 1).
Task 5 depends on 1. Task 6 depends on 2, 5. Task 7 is independent (can land
anytime). Task 8 is independent of the progress layer but completes the
dashboard's deeplink (pairs with Task 5/6). Recommended order: 1, 2, 3, 4, 5,
6, 7, 8.

## Edge Cases & Error Handling

- No prior progress for a cert: `getProgress` returns empty `UserProgress` (Task 2); dashboard/results render empty states (Tasks 4, 6).
- Topic with few attempts: excluded from weak ranking via attempts floor, still shown in full breakdown (Tasks 1, 6).
- Unanswered questions: bucketed as not-correct in `summarizeSession` (Task 1).
- Single attempt (no previous score): trend resolves to `'flat'` (Task 1).
- Corrupt `localStorage` entry: logged, falls back to empty progress (Task 2).
- SSR / `window` undefined: storage methods guard with `typeof window` (Task 2).
- Deeplink to non-existent topic: ignored, falls back to `'all'` (Task 8).
- Malformed `import()`: validated/rejected without overwriting good data (Task 2).

## Verification

1. `npm run test:run` — all new and existing tests pass.
2. `npm run test:coverage` — confirm `lib/progress` ≥ 80%.
3. `npm run lint` — zero warnings.
4. `npm run build` — production build succeeds (validates `useSearchParams`/`Suspense` usage).
5. Manual: run a quiz under the mock provider → confirm `/progress` shows the
   session and per-topic stats; click "Practice this topic" → simulator opens
   with that topic pre-selected; reset progress → AI settings unaffected.

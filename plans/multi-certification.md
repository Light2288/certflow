# Plan: Multi-Certification Support

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Multi-Certification Support        |
| **Spec**     | specs/multi-certification.md       |
| **Type**     | feature                            |
| **Branch**   | feat/multi-certification           |
| **Created**  | 2026-06-30 00:00:00                |
| **Status**   | PLANNED                            |

## Context

CertFlow hard-codes the certification id `'aws-ml'` across the simulator,
topics, topic-detail, and progress pages, and has no app-level concept of a
"current certification" nor any UI to choose one. This plan introduces an
app-level `currentCertificationId` setting (kept separate from AI provider
settings), a navigation-bar `CertificationSelector`, a static manifest for
discovery, de-hardcodes the feature modules, and adds a second certification
(Snowflake SnowPro Core, COF-C03) to prove the abstraction. This implements
Phase 12 of `IMPLEMENTATION_PLAN_UPDATED.md`.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/multi-certification`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/multi-certification
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
| Test   | `npm run test:run` (watch: `npm test`; coverage: `npm run test:coverage`) |
| Lint   | `npm run lint` |
| Build  | `npm run build` |

> Note: this machine uses nvm — run `source ~/.nvm/nvm.sh && nvm use` before
> npm commands if the Node version is not already active.

## Tasks

### Task 1: Add app-level certification settings type and storage `[M]`

**Goal**: Introduce a `currentCertificationId` app-level setting, persisted in
localStorage separately from `AISettings`, with default `aws-ml`.

**Files**:

| File                                         | Action | Description |
|----------------------------------------------|--------|-------------|
| `lib/types/app-settings.ts`                  | create | `AppSettings { currentCertificationId: string }`, `DEFAULT_APP_SETTINGS`, `DEFAULT_CERTIFICATION_ID = 'aws-ml'` |
| `lib/settings/app-settings-storage.ts`       | create | localStorage-backed save/load/clear for `AppSettings`, mirroring `SettingsStorage` |
| `lib/settings/__tests__/app-settings-storage.test.ts` | create | Round-trip, missing-key default, malformed-JSON fallback, invalid-shape fallback |

**Reuse**:

| File                                   | What to reuse |
|----------------------------------------|---------------|
| `lib/settings/settings-storage.ts`     | `StorageResult<T>` shape, try/catch + default-merge fallback pattern, separate storage key constant (`certflow_app_settings`) |
| `lib/types/ai-settings.ts`             | `DEFAULT_AI_SETTINGS` constant pattern |

**Steps**:

1. Create `lib/types/app-settings.ts` with `AppSettings`, a
   `DEFAULT_CERTIFICATION_ID = 'aws-ml'` constant, and
   `DEFAULT_APP_SETTINGS: AppSettings = { currentCertificationId: DEFAULT_CERTIFICATION_ID }`.
2. Create `lib/settings/app-settings-storage.ts` modelled on
   `SettingsStorage`: a separate `STORAGE_KEY = 'certflow_app_settings'`,
   `saveAppSettings`, `loadAppSettings` (returns default on missing/invalid),
   `clearAppSettings`, with the same `StorageResult<T>` return type and a
   private `isValidAppSettings` guard checking `currentCertificationId` is a
   non-empty string. Export convenience functions.
3. Do **not** touch `AISettings` or `settings-storage.ts`.

**Tests**:

- `lib/settings/__tests__/app-settings-storage.test.ts`: save→load round-trip;
  load with no stored value returns `DEFAULT_APP_SETTINGS`; malformed JSON
  falls back to default without throwing; invalid shape falls back; clear
  removes the key. Mirror assertions in the existing
  `settings-storage.test.ts`.

**Acceptance criteria covered**: AC1 (new `AppSettings` type, `AISettings`
untouched); AC2 (persisted via existing storage pattern, default `aws-ml`).

**Commit**: `feat(settings): add app-level certification settings type and storage`

---

### Task 2: Expose current certification through the settings context `[M]`

**Goal**: Surface `currentCertificationId` and an updater through
`useSettings`, loading/persisting via the Task 1 storage, without disturbing
existing AI settings behaviour.

**Files**:

| File                                              | Action | Description |
|---------------------------------------------------|--------|-------------|
| `lib/contexts/settings-context.tsx`               | modify | Add `appSettings`, `currentCertificationId`, `setCurrentCertification(id)` to context value; load/persist app settings on mount |
| `lib/contexts/__tests__/settings-context.test.tsx`| modify | Add tests for default cert id, updating it, and persistence; assert AI settings still work |

**Reuse**:

| File                                   | What to reuse |
|----------------------------------------|---------------|
| `lib/contexts/settings-context.tsx`    | Existing `useState` + `useEffect` load-on-mount + `useCallback` persist pattern used for `AISettings` |
| `lib/settings/app-settings-storage.ts` | `loadAppSettings` / `saveAppSettings` (from Task 1) |

**Steps**:

1. Import `AppSettings`, `DEFAULT_APP_SETTINGS`, `loadAppSettings`,
   `saveAppSettings`.
2. Add `appSettings` state initialised to `DEFAULT_APP_SETTINGS`; in the
   existing mount `useEffect` (or a sibling effect) load app settings and set
   state.
3. Extend `SettingsContextType` with `currentCertificationId: string` (derived
   from `appSettings`) and `setCurrentCertification: (id: string) => void`
   that updates state and persists via `saveAppSettings`.
4. Keep all existing `AISettings` fields and methods unchanged.

**Tests**:

- Extend `settings-context.test.tsx`: a consumer reads
  `currentCertificationId` defaulting to `aws-ml`; calling
  `setCurrentCertification('snowpro-core')` updates the value and writes to
  localStorage (`certflow_app_settings`); existing `updateSettings`/AI tests
  still pass.

**Acceptance criteria covered**: AC2 (exposed via `useSettings`).

**Commit**: `feat(settings): expose current certification via settings context`

---

### Task 3: Add a static certifications manifest and discovery loader `[S]`

**Goal**: Provide a static, fetchable list of available certifications and a
loader helper to read it, since `public/` has no directory-listing API.

**Files**:

| File                                                  | Action | Description |
|-------------------------------------------------------|--------|-------------|
| `public/data/certifications/index.json`               | create | `{ "certifications": [{ "id": "aws-ml", "name": "...", "code": "MLS-C01" }] }` |
| `lib/loaders/certification-loader.ts`                 | modify | Add `loadCertificationList(): Promise<CertificationSummary[]>` fetching the manifest |
| `lib/types/certification.ts`                          | modify | Add `CertificationSummary { id; name; code }` and `CertificationListData { certifications: CertificationSummary[] }` |
| `lib/loaders/__tests__/certification-loader.test.ts`  | modify | Test `loadCertificationList` parses the manifest and handles fetch failure |

**Reuse**:

| File                                  | What to reuse |
|---------------------------------------|---------------|
| `lib/loaders/certification-loader.ts` | `getBaseUrl()` and the `fetch(..., { cache: 'no-store' })` + `response.ok` error pattern used by `loadCertificationConfig` |

**Steps**:

1. Add `CertificationSummary` and `CertificationListData` to
   `lib/types/certification.ts`.
2. Seed `public/data/certifications/index.json` with the existing `aws-ml`
   entry (the SnowPro entry is added in Task 7).
3. Add `loadCertificationList()` to the loader: fetch
   `/data/certifications/index.json` via `getBaseUrl()`, check `response.ok`,
   return `data.certifications`. On non-ok, throw with a descriptive message
   consistent with the other loaders.

**Tests**:

- Extend `certification-loader.test.ts`: mock `fetch` to return a manifest and
  assert the parsed summaries; mock a non-ok response and assert it throws.

**Acceptance criteria covered**: AC3 (data source for the selector listing all
certs); supports AC9 (loader/integration test for second cert).

**Commit**: `feat(loaders): add certification manifest and list loader`

---

### Task 4: Build the CertificationSelector component `[M]`

**Goal**: A dropdown that lists certifications from the manifest and switches
the current certification, with graceful empty/error handling.

**Files**:

| File                                                            | Action | Description |
|-----------------------------------------------------------------|--------|-------------|
| `app/components/CertificationSelector.tsx`                      | create | Client component: loads manifest, renders `<select>` bound to `currentCertificationId`, calls `setCurrentCertification` on change |
| `app/components/__tests__/CertificationSelector.test.tsx`       | create | Lists certs, fires change → updates setting, renders gracefully when list empty |

**Reuse**:

| File                                            | What to reuse |
|-------------------------------------------------|---------------|
| `app/settings/components/ProviderSelector.tsx`  | `<select>` markup/Tailwind styling pattern (label + styled select) |
| `lib/contexts/settings-context.tsx`             | `useSettings()` → `currentCertificationId`, `setCurrentCertification` (Task 2) |
| `lib/loaders/certification-loader.ts`           | `loadCertificationList()` (Task 3) |

**Steps**:

1. Create a `'use client'` component that, on mount, calls
   `loadCertificationList()` into state with loading/error handling.
2. Render a labelled `<select>` (reuse ProviderSelector styling) whose value
   is `currentCertificationId` and whose `onChange` calls
   `setCurrentCertification`. Render each summary as
   `<option value={id}>{name} ({code})</option>`.
3. If the list is empty or fails to load, render nothing or a disabled select
   (no crash). Keep it compact for the nav bar; include an `aria-label`.

**Tests**:

- `CertificationSelector.test.tsx` wrapped in `SettingsProvider`, mock
  `loadCertificationList`: renders all options; selecting an option calls
  through to update the setting (assert via localStorage or a probe consumer);
  empty list renders without throwing.

**Acceptance criteria covered**: AC3 (selector lists all certs, updates
setting); AC10 (component test).

**Commit**: `feat(nav): add certification selector component`

---

### Task 5: Place the selector in the navigation bar `[S]`

**Goal**: Surface `CertificationSelector` globally in `Navigation` (desktop and
mobile menu).

**Files**:

| File                                            | Action | Description |
|-------------------------------------------------|--------|-------------|
| `app/components/Navigation.tsx`                 | modify | Render `CertificationSelector` in the desktop bar and mobile menu |
| `app/components/__tests__/Navigation.test.tsx`  | modify | Assert the selector renders within the nav (existing tests still pass) |

**Reuse**:

| File                                        | What to reuse |
|---------------------------------------------|---------------|
| `app/components/Navigation.tsx`             | Existing desktop (`hidden md:flex`) and mobile (`md:hidden`) layout slots |
| `app/components/CertificationSelector.tsx`  | The component from Task 4 |

**Steps**:

1. Import and render `CertificationSelector` in the desktop nav region (e.g.
   left of or beside the nav links) and inside the mobile menu block.
2. Ensure `SettingsProvider` already wraps the app via
   `app/layout.tsx` (it does) so `useSettings` is available — no layout change
   needed; verify only.

**Tests**:

- Extend `Navigation.test.tsx` (mock `loadCertificationList`): the selector is
  present; existing active-link/mobile-menu assertions remain green.

**Acceptance criteria covered**: AC4 (selector placed in Navigation, reachable
globally).

**Commit**: `feat(nav): show certification selector in navigation`

---

### Task 6: De-hardcode `'aws-ml'` in feature pages `[M]`

**Goal**: Make the simulator, topics, topic-detail, and progress pages read the
current cert id from `useSettings`, including reloading data when it changes.

**Files**:

| File                                  | Action | Description |
|---------------------------------------|--------|-------------|
| `app/simulator/page.tsx`              | modify | Use `currentCertificationId` for `loadCertification`; reload when it changes; reset to setup |
| `app/topics/page.tsx`                 | modify | Use `currentCertificationId` for `loadCertificationTopics`; reload on change |
| `app/topics/[topicId]/page.tsx`       | modify | Use `currentCertificationId` for `loadCertificationTopics`; reload on change |
| `app/progress/page.tsx`               | modify | Replace `const CERT_ID = 'aws-ml'` with `currentCertificationId`; load progress per cert; reload on change |

**Reuse**:

| File                                  | What to reuse |
|---------------------------------------|---------------|
| `lib/contexts/settings-context.tsx`   | `useSettings()` → `currentCertificationId` (Task 2) |
| existing page effects                 | Existing `useEffect`-based load functions; add `currentCertificationId` to deps |

**Steps**:

1. In each page, read `currentCertificationId` via `useSettings()` and pass it
   to the loader call instead of the literal `'aws-ml'`.
2. Add `currentCertificationId` to the relevant `useEffect` dependency arrays
   so switching cert reloads data. In `progress/page.tsx` also re-fetch
   `ProgressStorage.getProgress(currentCertificationId)` (already cert-keyed).
3. In `simulator/page.tsx`, when `currentCertificationId` changes, reset
   `viewMode` to `'setup'` and clear `session`/`results`/`startConfig` so the
   active session does not bleed across certs (full handling in Task 8).
4. Leave `lib/ai/generator/prompts.ts` (comment) and all test files untouched
   per spec Out of Scope.

**Tests**:

- Update the existing `app/simulator/__tests__/page.test.tsx`,
  `app/progress/__tests__/page.test.tsx`, and any topics page tests to render
  within `SettingsProvider` (or mock `useSettings`) so they still pass with the
  cert id sourced from settings. No new behaviour beyond settings sourcing here.

**Acceptance criteria covered**: AC5 (pages use current cert id); AC6 (no
hard-coded `'aws-ml'` in feature modules); AC8 (switching updates views).

**Commit**: `refactor(app): read current certification from settings`

---

### Task 7: Add the Snowflake SnowPro Core (COF-C03) certification data `[M]`

**Goal**: Add a second, minimal but schema-valid certification and register it
in the manifest.

**Files**:

| File                                                            | Action | Description |
|-----------------------------------------------------------------|--------|-------------|
| `public/data/certifications/snowpro-core/config.json`           | create | `id: "snowpro-core"`, name/code (COF-C03), valid `examDetails` |
| `public/data/certifications/snowpro-core/topics.json`           | create | ~3 topics with subtopics + keyPoints; weights summing to 100 |
| `public/data/certifications/snowpro-core/questions.json`        | create | A handful (~5–6) of questions valid per `validateQuestion` |
| `public/data/certifications/index.json`                         | modify | Add the `snowpro-core` summary entry |

**Reuse**:

| File                                                       | What to reuse |
|------------------------------------------------------------|---------------|
| `public/data/certifications/aws-ml/{config,topics,questions}.json` | Exact JSON shape to copy/adapt |
| `lib/loaders/certification-loader.ts`                      | `validateCertificationConfig`, `validateTopics`, `validateQuestion` rules to satisfy |

**Steps**:

1. Create `config.json` with positive `duration`/`questionCount`, a
   `scoreRange`, and `metadata` (difficulty one of beginner/intermediate/
   advanced).
2. Create `topics.json` with ~3 topics (each with `id`, `name`, `description`,
   `weight`, `order`, non-empty `subtopics` carrying `keyPoints`); ensure
   weights sum to 100 to avoid the validator warning.
3. Create `questions.json` with ~5–6 questions, each with valid `topicId`/
   `subtopicId` references, ≥2 options, a `correctAnswer` present in options,
   `type` and `difficulty` valid, and an `explanation.correct`.
4. Add the `snowpro-core` entry to `index.json`.

**Tests**:

- Add a loader/integration test (extend
  `lib/loaders/__tests__/certification-loader.test.ts` or its integration
  sibling) that loads `snowpro-core` and asserts it passes config/topics/
  questions validation. Tests must not hit the real network — follow the
  existing fetch-mocking approach used in the loader tests.

**Acceptance criteria covered**: AC7 (second cert added, schema-valid); AC9
(loader/integration test proving second cert loads).

**Commit**: `feat(data): add Snowflake SnowPro Core (COF-C03) certification`

---

### Task 8: Handle certification switching during an active quiz `[S]`

**Goal**: When the user switches certification while a quiz is in progress,
warn and discard the in-progress session so the new cert loads cleanly; keep
per-cert progress isolated.

**Files**:

| File                                            | Action | Description |
|-------------------------------------------------|--------|-------------|
| `app/simulator/page.tsx`                        | modify | Detect cert change with an active session; confirm + discard via `QuizSessionManager.clearActiveSession()`, reset to setup |
| `app/simulator/__tests__/page.test.tsx`         | modify | Test: active quiz + cert switch clears session and returns to setup |

**Reuse**:

| File                                   | What to reuse |
|----------------------------------------|---------------|
| `lib/quiz/quiz-session-manager.ts`     | `clearActiveSession()` (line 319) for discarding the active session |
| `app/simulator/page.tsx`               | Existing `handleStartNew` reset logic (clears session/results/startConfig, viewMode→setup) |

**Steps**:

1. Track the previous `currentCertificationId` (e.g. a `useRef`). When it
   changes and `viewMode` is `'quiz'`/`'generating'` with a live `session`,
   prompt the user (window `confirm` is acceptable, or reuse the existing reset
   flow) to discard.
2. On discard: call `QuizSessionManager.clearActiveSession()` and run the same
   reset as `handleStartNew`, then proceed to load the new cert's data (Task 6
   effect handles the reload).
3. Per-cert progress is already isolated by `ProgressStorage` keying — no
   change needed; just confirm tests cover that switching does not clear the
   other cert's progress.

**Tests**:

- Extend `app/simulator/__tests__/page.test.tsx`: start/restore an active
  session, change `currentCertificationId` via the provider, assert the active
  session is cleared and `viewMode` returns to setup. Use the mock AI provider;
  no network.

**Acceptance criteria covered**: AC8 (consistent switching); Edge case
"Switching cert during an active quiz".

**Commit**: `feat(simulator): discard active quiz when switching certification`

---

**Task ordering**: Sequential dependency chain 1 → 2 → (3,4) → 5 → 6 → 8.
Task 1 underpins Task 2; Tasks 3 and 4 both depend on earlier tasks but are
otherwise parallelizable (4 needs 2 and 3); Task 5 needs 4; Task 6 needs 2;
Task 8 needs 6. Task 7 (data + manifest entry) depends only on Task 3's
manifest existing and can be done any time after Task 3; doing it before Task 4
lets the selector show two real options during manual checks.

## Edge Cases & Error Handling

- **Switching cert during an active quiz**: warn + discard the session via
  `clearActiveSession()` and reset to setup (Task 8).
- **Persisted `currentCertificationId` no longer exists**: the page loader
  will throw on a missing cert; `loadAppSettings` returns a valid shape but the
  id may be stale. Handle by falling back to `DEFAULT_CERTIFICATION_ID` when a
  load fails, and/or validate the stored id against the manifest in the
  selector (Tasks 4 & 6 — surface the existing error UI rather than crashing).
- **No certifications discoverable / manifest fetch fails**: selector renders
  empty/disabled without crashing (Task 4).
- **Second cert data fails validation**: prevented by authoring valid JSON in
  Task 7; the loader's existing validators are the guard.
- **Progress isolation**: `ProgressStorage` is already keyed by cert id; no
  mixing occurs (verified in Task 6/8 tests).

## Verification

1. Run `npm run test:run` — all existing and new tests pass; new modules
   (`app-settings-storage`, `CertificationSelector`, loader list, simulator
   switch) are covered.
2. Run `npm run lint` — no new warnings introduced.
3. Run `npm run build` — app compiles.
4. Manually (or via the simulator E2E-lite test) confirm: the nav selector
   lists AWS ML and SnowPro Core; switching updates simulator, topics, and
   progress to the selected cert; switching mid-quiz prompts and discards the
   active session; reload preserves the selected cert.
5. Grep confirms no `'aws-ml'` literal remains in feature modules
   (`app/simulator/page.tsx`, `app/topics/page.tsx`,
   `app/topics/[topicId]/page.tsx`, `app/progress/page.tsx`).

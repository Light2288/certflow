# Multi-Certification Support

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Multi-Certification Support                            |
| **Type**      | feature                                                |
| **Scope**     | certification selection, settings, loaders, simulator/topics/progress |
| **Created**   | 2026-06-30 00:00:00                                    |
| **Status**    | PLANNED                                                |

## Problem Statement

CertFlow ships with a single certification (`aws-ml`) and the id `'aws-ml'`
is hard-coded across the feature modules — `app/simulator/page.tsx`
(line 64), `app/topics/page.tsx` (line 22), `app/topics/[topicId]/page.tsx`
(line 25), and `app/progress/page.tsx` (`const CERT_ID = 'aws-ml'`). There is
no app-level concept of a "current certification" and no UI to choose one.
The loader (`lib/loaders/certification-loader.ts`) is already
parameterised by `certificationId` and progress storage is already keyed by
cert id, so the data layer is ready — but the application can only ever
exercise one certification. This blocks the platform's core promise of being
a multi-certification study tool and leaves the loader abstraction unproven.

This implements **Phase 12** of `IMPLEMENTATION_PLAN_UPDATED.md`
(slug `multi-certification`).

## Desired Outcome

The platform supports multiple certifications selectable from the UI:

- An app-level `currentCertificationId` setting persists across reloads and
  is exposed through the existing settings context, **without** overloading
  the AI-provider-only `AISettings` type.
- A `CertificationSelector` dropdown in the navigation bar lists every
  certification discovered under `public/data/certifications/` and switches
  the current certification on selection.
- The simulator, topics, topic-detail, and progress modules all read the
  selected cert id instead of the hard-coded `'aws-ml'` literal.
- A second certification — **Snowflake SnowPro Core (COF-C03)** — exists
  under `public/data/certifications/` with a minimal but schema-valid data
  set, proving the abstraction holds.

## Acceptance Criteria

- [ ] An app-level `currentCertificationId` is modelled via a new
      `AppSettings` type (or a sibling field) — `AISettings` in
      `lib/types/ai-settings.ts` is NOT modified to carry cert state.
- [ ] The current certification is persisted via the existing storage
      pattern in `lib/settings/settings-storage.ts` and exposed through
      `lib/contexts/settings-context.tsx` (e.g. accessible/updatable via the
      `useSettings` hook), with a sensible default (`aws-ml`).
- [ ] `app/components/CertificationSelector.tsx` renders a dropdown listing
      all certifications found under `public/data/certifications/`; selecting
      one updates the current-certification setting.
- [ ] The selector is placed in `app/components/Navigation.tsx` so it is
      reachable globally on every page.
- [ ] `app/simulator/page.tsx`, `app/topics/page.tsx`,
      `app/topics/[topicId]/page.tsx`, and `app/progress/page.tsx` use the
      current cert id from settings instead of the `'aws-ml'` literal.
- [ ] No `'aws-ml'` string literal remains hard-coded in feature modules
      (test files and the few-shot example comment in
      `lib/ai/generator/prompts.ts` are exempt — see Out of Scope).
- [ ] A second certification, **Snowflake SnowPro Core (COF-C03)**, is added
      under `public/data/certifications/<id>/` with a minimal `config.json`,
      ~3 topics in `topics.json`, and a handful of questions in
      `questions.json`, all matching the schemas in
      `lib/types/certification.ts` and passing the loader's validators.
- [ ] Switching certification from the UI updates the simulator, topics, and
      progress views consistently to the newly selected certification.
- [ ] Existing test coverage on touched modules is maintained; new tests
      cover the settings round-trip for the cert setting, the
      `CertificationSelector` component, and a loader/integration test
      proving the second cert loads.

## Edge Cases & Error Handling

- **Switching cert during an active quiz:** warn the user and discard /
  reset the in-progress quiz session so the newly selected certification
  loads cleanly. Per-cert progress remains isolated and is not lost.
- **Persisted `currentCertificationId` no longer exists** (cert folder
  removed): fall back to the default certification rather than erroring.
- **No certifications discoverable** under `public/data/certifications/`:
  the selector should render gracefully (empty/disabled) without crashing.
- **Second cert data fails validation:** the loader already throws on
  invalid data; the second cert's JSON must pass the existing validators so
  this does not surface at runtime.
- **Progress isolation:** progress storage is already keyed by cert id, so
  switching certs must not mix or overwrite another cert's stored progress.

## Dependencies & Constraints

- **Contracts to honour:** `CertificationConfig`, `Topic`, `Subtopic`,
  `Question` (and related data/validation types) in
  `lib/types/certification.ts`; the loader API in
  `lib/loaders/certification-loader.ts`; `SettingsProvider` / `useSettings`
  in `lib/contexts/settings-context.tsx`; settings storage and its schema
  validation / default-merge fallback in `lib/settings/settings-storage.ts`.
- Data is loaded client-side from `public/data/certifications/<id>/`
  (served as `/data/certifications/<id>/...`); no backend dependency.
- Persistence remains localStorage + JSON, consistent with existing
  settings, sessions, and progress storage.
- Phases 9–11 (generator, question store, progress tracking) are already
  implemented and are cert-id-keyed; the refactor must keep them working
  under the selected cert id.
- The plan notes Phase 11 (progress-tracking) is helpful context but the
  storage layer is already cert-id-keyed, so this phase can proceed
  independently.

## Out of Scope

- README, docs, lint hardening, stray-doc cleanup, and optional E2E
  (these are **Phase 14 — Project Polish, Docs & Lint**).
- Generation / validation behaviour (**Phases 8–10**); this spec only
  ensures those existing modules read the selected cert id.
- Per-cert AI-provider settings or any change to the meaning of
  `AISettings` beyond leaving it untouched.
- Discovering certifications via a server endpoint or build-time manifest if
  a static list is sufficient (the implementer may choose the discovery
  mechanism, but it must surface every cert under
  `public/data/certifications/`).
- The `'aws-ml'` literals inside test files and the explanatory comment in
  `lib/ai/generator/prompts.ts` are not feature-module hard-codings and need
  not be removed.

## Notes

- Confirmed hard-coded `'aws-ml'` feature-module usages to de-hardcode:
  `app/simulator/page.tsx:64`, `app/topics/page.tsx:22`,
  `app/topics/[topicId]/page.tsx:25`, `app/progress/page.tsx:12`.
- The loader is already parameterised: `loadCertification(certificationId)`,
  `loadCertificationTopics(certificationId)`, etc. — the work is to feed it
  the selected id, not to change its signature.
- Default certification on first load should remain `aws-ml` to preserve
  current behaviour for existing users.
- Second certification fixed to **Snowflake SnowPro Core (COF-C03)** per the
  user's decision; keep it minimal (~3 topics, a handful of questions) — its
  purpose is to prove the abstraction, not to be exam-complete.
- Testing must never hit a real network, consistent with project standards.

# Plan: Project Polish, Docs & Lint

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Project Polish, Docs & Lint        |
| **Spec**     | specs/project-polish-docs.md       |
| **Type**     | chore                              |
| **Branch**   | chore/project-polish-docs          |
| **Created**  | 2026-07-07 00:00:00               |
| **Status**   | IMPLEMENTED                       |

## Context

CertFlow's application code is mature and tested, but the repository is not
contributor-ready: the README is `create-next-app` boilerplate, `npm run
lint` reports 51 problems (34 errors, 17 warnings) across many files, and
stray Cline development artefacts clutter the root. This plan closes those
housekeeping gaps — docs, lint, and cleanup — without changing any product
behaviour, plus an optional Playwright smoke suite.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `chore/project-polish-docs`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b chore/project-polish-docs
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

> **Note:** this machine uses nvm. Prefix commands with
> `source ~/.nvm/nvm.sh && nvm use` before running `npm`.

| Action | Command |
|--------|---------|
| Lint   | `npm run lint` |
| Test   | `npm run test:run` (CI) / `npm test` (watch) |
| Coverage | `npm run test:coverage` |
| Build  | `npm run build` |
| E2E (new, optional) | `npm run test:e2e` |

## Tasks

### Task 1: Ignore build artefacts in ESLint config `[S]`

**Goal**: Stop ESLint from linting generated output (the `coverage/`
directory), which currently produces an "Unused eslint-disable directive"
warning and pollutes the lint run.

**Files**:

| File                 | Action | Description                                  |
|----------------------|--------|----------------------------------------------|
| `eslint.config.mjs`  | modify | Add `coverage/**` (and any other generated dirs) to `globalIgnores` |

**Reuse**:

| File                | What to reuse                                      |
|---------------------|----------------------------------------------------|
| `eslint.config.mjs` | Existing `globalIgnores([...])` block (lines 9–15) |

**Steps**:

1. Add `"coverage/**"` to the `globalIgnores` array alongside the existing
   `.next/**`, `out/**`, `build/**`, `next-env.d.ts` entries.
2. Re-run `npm run lint` and confirm the `coverage/block-navigation.js`
   warning is gone.

**Tests**: No unit tests; verified via `npm run lint` no longer reporting
files under `coverage/`.

**Acceptance criteria covered**: Supports "npm run lint passes with zero
warnings" (removes generated-file noise first).

**Commit**: `chore(lint): ignore coverage output in eslint config`

---

### Task 2: Fix `no-explicit-any` in the chat API route `[S]`

**Goal**: Replace `catch (error: any)` in the chat route with a typed
`unknown` + narrowing, preserving the exact 500 response shape and
fallbacks — the spec's headline fix.

**Files**:

| File                     | Action | Description                                        |
|--------------------------|--------|----------------------------------------------------|
| `app/api/chat/route.ts`  | modify | Type the caught error as `unknown`, narrow before reading `.message` / `.code` / `.provider` |

**Reuse**:

| File                     | What to reuse                                             |
|--------------------------|----------------------------------------------------------|
| `lib/ai/types.ts`        | `AIServiceError` shape (`message`, `code`, `provider`) for the narrowing helper |
| `app/api/chat/route.ts`  | Existing 500 response object and fallback strings         |

**Steps**:

1. Change `catch (error: any)` (line 40) to `catch (error: unknown)`.
2. Narrow safely — e.g. read `message`/`code`/`provider` via a small
   type guard or `error instanceof Error` + optional property access on a
   narrowed record — keeping the current fallbacks (`'An error occurred'`,
   `'UNKNOWN_ERROR'`, `'unknown'`) and the `{ error, code, provider }`
   response shape unchanged.
3. Run `npm run lint` on the file; confirm the `no-explicit-any` error at
   `40:19` is resolved and the route still type-checks.

**Tests**: No dedicated test exists for this route; behaviour is unchanged.
Confirm the existing Vitest suite (`npm run test:run`) stays green.

**Acceptance criteria covered**: "chat route no longer uses `catch (error:
any)`; narrowed from `unknown`; response shape/fallbacks preserved."

**Commit**: `fix(api): type chat route error as unknown instead of any`

---

### Task 3: Remove remaining `no-explicit-any` across source and tests `[M]`

**Goal**: Eliminate the other 17 `no-explicit-any` findings so this rule is
clean repo-wide.

**Files**:

| File                                                              | Action | Description                              |
|-------------------------------------------------------------------|--------|------------------------------------------|
| `lib/types/certification.ts`                                      | modify | `value?: any` → `value?: unknown` (lines 144, 150) |
| `lib/settings/settings-storage.ts`                                | modify | `isValidSettings(obj: any)` → `unknown` (line 121) |
| `lib/ai/providers/ollama-provider.ts`                             | modify | Type the dynamic `Ollama`/`client`/`m` values (lines 13, 32, 214) |
| `app/tutor/components/ChatMessage.tsx`                            | modify | Type the `react-markdown` `code` renderer props (line 69) |
| `app/topics/[topicId]/components/DeepDiveButton.tsx`             | modify | Type the `react-markdown` `code` renderer props (line 57) |
| `lib/loaders/__tests__/certification-loader.test.ts`             | modify | Replace `as any` casts with typed partials/`unknown` (7 sites) |
| `lib/loaders/__tests__/certification-loader.integration.test.ts`| modify | `mockFetch as any` → typed cast (line 23) |
| `app/tutor/__tests__/page.test.tsx`                              | modify | `function(this: any)` → typed `this` (line 31) |
| `lib/ai/providers/__tests__/ollama-provider.test.ts`            | modify | `function(this: any)` → typed `this` (line 21) |

**Reuse**:

| File                     | What to reuse                                          |
|--------------------------|--------------------------------------------------------|
| `lib/types/certification.ts` | Existing exported interfaces to type test fixtures precisely |
| `app/tutor/components/ChatMessage.tsx` | The markdown `code` renderer pattern is duplicated in `DeepDiveButton.tsx`; type both the same way (e.g. `ExtraProps` / a local props type) |

**Steps**:

1. For non-test source, replace `any` with `unknown` (validation values),
   precise SDK/library types, or minimal local interfaces (Ollama client,
   markdown code renderer props).
2. For test files, replace `as any` with typed partial objects,
   `as unknown as <Type>`, or proper `this` typing on mock constructor
   functions.
3. Run `npm run lint` and confirm zero `no-explicit-any` remain.

**Tests**: Purely type-level changes; run `npm run test:run` to confirm all
existing tests still pass.

**Acceptance criteria covered**: "no other explicit `any` remains";
contributes to zero-warning lint.

**Commit**: `refactor(types): replace explicit any with precise types`

---

### Task 4: Resolve `react/no-unescaped-entities` in JSX `[S]`

**Goal**: Clear all 14 unescaped-entity errors so rendered copy uses proper
HTML entities.

**Files**:

| File                                            | Action | Description                          |
|-------------------------------------------------|--------|--------------------------------------|
| `app/settings/components/ModelSelector.tsx`     | modify | Escape `'` (line 200)                |
| `app/settings/page.tsx`                         | modify | Escape `"` (line 147, 2 sites)       |
| `app/topics/[topicId]/page.tsx`                 | modify | Escape `'` (line 72, 3 sites)        |
| `app/tutor/components/ChatHistory.tsx`          | modify | Escape `"` (lines 43–46, 8 sites)    |

**Steps**:

1. Replace literal `'` / `"` in JSX text with the appropriate entities
   (`&apos;` / `&quot;` or curly equivalents), leaving displayed text
   identical.
2. Run `npm run lint`; confirm no `react/no-unescaped-entities` remain.

**Tests**: Component tests assert on visible text; run affected component
tests (`npm run test:run`) to confirm queries still match. Adjust any test
that matched a raw quote character if needed.

**Acceptance criteria covered**: Contributes to zero-warning lint.

**Commit**: `fix(ui): escape literal quotes in jsx text`

---

### Task 5: Resolve `react-hooks/set-state-in-effect` errors `[S]`

**Goal**: Clear the 2 `set-state-in-effect` errors in `QuestionCard.tsx`
and `settings-context.tsx` without changing behaviour (prop→state sync and
initial settings load).

**Files**:

| File                                            | Action | Description                                        |
|-------------------------------------------------|--------|----------------------------------------------------|
| `app/simulator/components/QuestionCard.tsx`     | modify | Resolve setState-in-effect at line 39 (prop-sync)  |
| `lib/contexts/settings-context.tsx`             | modify | Resolve setState-in-effect at line 43/46 (initial load) |

**Reuse**:

| File                                        | What to reuse                                    |
|---------------------------------------------|--------------------------------------------------|
| `app/simulator/components/QuestionCard.tsx` | Existing effect deps `[currentAnswer, question.type]` inform the chosen fix |

**Steps**:

1. Choose the least-invasive compliant fix per site: for `QuestionCard`,
   the derived-state-from-prop pattern (key-reset or render-time
   derivation); for `settings-context`, keep the mount-time load but
   satisfy the rule (e.g. functional/guarded init) — or, if a genuine
   refactor is unwarranted, apply a scoped
   `// eslint-disable-next-line react-hooks/set-state-in-effect` with a
   short justification comment.
2. Confirm no runtime behaviour change (answers still sync on navigation;
   settings still load once on mount).
3. Run `npm run lint`; confirm both errors are gone.

**Tests**: Run the existing `QuestionCard` and settings-context test suites
(`npm run test:run`) to confirm behaviour is preserved.

**Acceptance criteria covered**: Contributes to zero-warning lint;
"no behavioural refactors" honoured (lint-level fix only).

**Commit**: `fix(hooks): resolve set-state-in-effect lint errors`

---

### Task 6: Clear `no-unused-vars` warnings `[S]`

**Goal**: Remove or intentionally mark the 16 unused-variable warnings
(mostly in test files, plus provider stubs).

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `app/components/__tests__/Navigation.test.tsx` | modify | Remove unused `mobileMenu` |
| `app/settings/__tests__/page.test.tsx` | modify | Remove unused `within`, `loadingText` |
| `app/settings/components/__tests__/ModelSelector.test.tsx` | modify | Remove unused `AI_PROVIDERS` import |
| `app/simulator/components/__tests__/AnswerReview.test.tsx` | modify | Remove unused `within` |
| `app/simulator/components/__tests__/QuestionCard.test.tsx` | modify | Remove unused `rerender` |
| `app/topics/components/__tests__/TopicCard.test.tsx` | modify | Remove unused `container` |
| `app/tutor/components/__tests__/ChatInput.test.tsx` | modify | Remove unused `fireEvent` |
| `lib/contexts/__tests__/settings-context.test.tsx` | modify | Remove unused `render`, `screen` |
| `lib/ai/providers/mock-provider.ts` | modify | Prefix unused `history`/`options` params with `_` or reference them |
| `lib/ai/providers/ollama-provider.ts` | modify | Handle unused `config` (line 146) and `error` (line 166) |

**Steps**:

1. Delete genuinely unused imports/variables in test files.
2. For interface-required-but-unused function params (provider stubs),
   rename to a leading-underscore form or otherwise satisfy the rule
   without breaking the `AIProvider` contract.
3. Run `npm run lint`; confirm no `no-unused-vars` warnings remain.

**Tests**: Run `npm run test:run` to confirm the touched test files still
pass after removing unused bindings.

**Acceptance criteria covered**: Contributes to zero-warning lint.

**Commit**: `chore(lint): remove unused variables and imports`

---

### Task 7: Verify a fully clean lint run `[S]`

**Goal**: Confirm the cumulative effect of Tasks 1–6 is `npm run lint`
passing with zero errors and zero warnings, and catch any residual finding.

**Files**: None (verification task). If a stray finding remains, fix it in
the most appropriate existing file and note it here.

**Steps**:

1. Run `npm run lint`; expect `0 problems`.
2. If anything remains, resolve it using the same rule-appropriate approach
   as the earlier task and re-run.

**Tests**: `npm run lint` (zero problems) and `npm run test:run` (green).

**Acceptance criteria covered**: "npm run lint passes with zero warnings."

**Commit**: `chore(lint): confirm zero lint problems repo-wide`

---

### Task 8: Archive stray Cline docs `[S]`

**Goal**: Move `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md` out of
the repo root into an `archive/` folder (preserved, not deleted), and fix
the one stale reference.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `Cline_Chat.txt` | delete (move) | Relocate to `archive/Cline_Chat.txt` |
| `CLINE_CONVERSATION_SUMMARY.md` | delete (move) | Relocate to `archive/CLINE_CONVERSATION_SUMMARY.md` |
| `archive/Cline_Chat.txt` | create | Moved content |
| `archive/CLINE_CONVERSATION_SUMMARY.md` | create | Moved content |
| `IMPLEMENTATION_PLAN_LEGACY.md` | modify | Update the link to `CLINE_CONVERSATION_SUMMARY.md` (line 15) to the new `archive/` path |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `IMPLEMENTATION_PLAN_LEGACY.md` | Existing markdown link syntax at line 15 |

**Steps**:

1. Create `archive/` and `git mv` both files into it (preserving history).
2. Update the markdown link in `IMPLEMENTATION_PLAN_LEGACY.md` (line 15) to
   point at `archive/CLINE_CONVERSATION_SUMMARY.md`.
3. Confirm no other code/doc references the old root paths (grep already
   shows only spec/plan/implementation-plan docs mention them by name).

**Tests**: None; verify links resolve and `npm run test:run` unaffected.

**Acceptance criteria covered**: "Cline docs moved into an `archive/`
folder (preserved, not deleted) and no longer in root"; "no stale
references."

**Commit**: `chore(docs): archive stray cline conversation files`

---

### Task 9: Rewrite the README `[M]`

**Goal**: Replace the `create-next-app` boilerplate `README.md` with
CertFlow-specific documentation useful to a new contributor.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `README.md` | modify | Full rewrite covering the sections below |

**Reuse**:

| File | What to reuse |
|------|---------------|
| `lib/types/certification.ts` | `CertificationConfig`, `TopicsData`/`Topic`/`Subtopic`, `QuestionsData`/`Question` schemas to document authoring |
| `public/data/certifications/aws-ml/` | Real example of the `config.json` / `topics.json` / `questions.json` layout |
| `lib/types/ai-settings.ts` | `AI_PROVIDERS` map (mock, openai, anthropic, google, ollama, custom) for the AI-setup section |
| `package.json` | Script names for the testing section (`test`, `test:run`, `test:coverage`, `lint`, `build`) |
| `DEPLOYMENT.md` | Link target for the deployment section |

**Steps**:

1. Write sections: project purpose; quick start (with the nvm note —
   `source ~/.nvm/nvm.sh && nvm use` before `npm install` / `npm run dev`);
   AI provider setup (the supported providers and where keys are set in
   Settings); certification authoring (the
   `public/data/certifications/<id>/` layout plus the three JSON schemas,
   grounded in `lib/types/certification.ts`); testing (Vitest scripts);
   deployment (link `DEPLOYMENT.md`).
2. Include a note that data lives in `public/data/` and the legacy `data/`
   path does not exist (satisfies the doc-note criterion).
3. Cross-link `IMPLEMENTATION_PLAN_UPDATED.md`.

**Tests**: None; documentation only.

**Acceptance criteria covered**: "README rewritten covering all listed
sections"; "README cross-links IMPLEMENTATION_PLAN_UPDATED.md";
"documentation clarifies data lives in `public/data/`."

**Commit**: `docs: rewrite readme with certflow project documentation`

---

### Task 10: Verify and align DEPLOYMENT.md `[S]`

**Goal**: Confirm `DEPLOYMENT.md` is accurate and the production build
works; add the `public/data/` clarification if not already covered by the
README.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `DEPLOYMENT.md` | modify | Minor corrections if the build/verify step surfaces inaccuracies |

**Steps**:

1. Run `npm run build` (and optionally `npm start`) to confirm the
   documented Vercel/production build path succeeds.
2. Reconcile any discrepancy between `DEPLOYMENT.md`, the rewritten
   `README.md`, and `IMPLEMENTATION_PLAN_UPDATED.md` (mutual consistency
   constraint).

**Tests**: `npm run build` succeeds.

**Acceptance criteria covered**: "DEPLOYMENT.md confirmed accurate (Vercel
build path verified)"; docs mutually consistent.

**Commit**: `docs: verify and align deployment guide`

---

### Task 11 (Optional / stretch): Playwright critical-path smoke tests `[M]`

**Goal**: Add a minimal Playwright E2E suite guarding the critical paths,
wired via a `test:e2e` script, using the mock AI provider so no network is
required.

**Files**:

| File | Action | Description |
|------|--------|-------------|
| `package.json` | modify | Add `@playwright/test` devDependency and `test:e2e` script |
| `playwright.config.ts` | create | Playwright config (dev server, test dir) |
| `e2e/quiz.spec.ts` | create | Quiz setup → answer → results |
| `e2e/tutor.spec.ts` | create | AI Tutor mock message round-trip |
| `e2e/settings.spec.ts` | create | Settings save → reload persistence |
| `eslint.config.mjs` | modify | Ignore `playwright-report/`, `test-results/` if generated |

**Steps**:

1. Add Playwright, a config that boots `next dev`/`next start`, and an
   `e2e/` test directory kept separate from the Vitest `__tests__`
   folders.
2. Author the three smoke specs against the mock provider (default
   settings) so they run offline.
3. Add `test:e2e` to `package.json` and a short CI-guidance note (in the
   README testing section) on running it.

**Tests**: `npm run test:e2e` green locally; ensure it does not interfere
with `npm run test:run` (Vitest must not pick up `e2e/`).

**Acceptance criteria covered**: The optional/stretch Playwright criterion.

**Commit**: `test(e2e): add playwright critical-path smoke suite`

---

**Task ordering**:

- Tasks 1–7 (lint) are sequential-ish but independent in content; Task 1
  first (removes noise), Tasks 2–6 in any order, Task 7 verifies the whole.
- Tasks 8, 9, 10 (docs/cleanup) are independent of the lint tasks and of
  each other, except Task 10 should follow Task 9 for consistency checks.
- Task 11 is optional and should come last.
- Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → (11).

## Edge Cases & Error Handling

- **Narrowing the caught error** (Task 2): preserve the exact
  `{ error, code, provider }` 500 response and fallbacks
  (`'An error occurred'`, `'UNKNOWN_ERROR'`, `'unknown'`).
- **Other lint findings** (Tasks 3–7): the repo has far more than the chat
  route — `no-explicit-any` (18), `no-unused-vars` (16),
  `no-unescaped-entities` (14), `set-state-in-effect` (2), plus lint
  scanning `coverage/`. All are lint-level fixes only; no behavioural
  refactors.
- **set-state-in-effect is a real pattern** (Task 5): prop→state sync and
  mount-time load are legitimate; prefer a compliant rewrite, fall back to
  a scoped, justified disable comment if a rewrite would change behaviour.
- **Archived-doc references** (Task 8): `IMPLEMENTATION_PLAN_LEGACY.md`
  line 15 links `CLINE_CONVERSATION_SUMMARY.md`; update it to the new path.
- **nvm not present** (Tasks 9/Build): README presents the nvm step as the
  project convention, not a hard machine assumption.
- **Vitest vs. Playwright isolation** (Task 11): keep `e2e/` out of the
  Vitest include globs so the two runners do not collide.

## Verification

1. Run `npm run lint` — expect `0 problems` (0 errors, 0 warnings).
2. Run `npm run test:run` — the existing Vitest suite stays fully green.
3. Run `npm run build` — production build succeeds (DEPLOYMENT.md path).
4. Confirm `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md` now live
   under `archive/` and the repo root is free of them; links resolve.
5. Read `README.md` — verify all required sections are present, the
   `public/data/` note is included, and `IMPLEMENTATION_PLAN_UPDATED.md` is
   cross-linked.
6. (Optional) Run `npm run test:e2e` — Playwright smoke suite green.

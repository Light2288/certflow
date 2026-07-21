# Plan: App Icon & Header Exam Indicator

| Field        | Value                                        |
|--------------|----------------------------------------------|
| **Title**    | App Icon & Header Exam Indicator             |
| **Spec**     | specs/app-icon-and-header-exam-indicator.md  |
| **Type**     | feature                                      |
| **Branch**   | feat/app-icon-and-header-exam-indicator      |
| **Created**  | 2026-07-22 00:00:00                          |
| **Status**   | IMPLEMENTED                                  |

## Context

CertFlow has an unused brand icon (`certflow_icon.svg`) and uses a generic 🎓
emoji in the header plus a plain text home-page title. This plan wires the SVG
into the header, the home page (above the title), and the browser favicon, and
adds a read-only indicator in the header showing the currently selected
certification (which remains changeable only from the home page).

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/app-icon-and-header-exam-indicator`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/app-icon-and-header-exam-indicator
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

Branch type mapping:

- feature → `feat/<slug>`

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one
commit.

## Build & Test Commands

| Action | Command          |
|--------|------------------|
| Test   | `npm run test:run` |
| Lint   | `npm run lint`   |
| Build  | `npm run build`  |

## Design Decisions (grounded in the codebase)

- **Favicon**: Next.js 16 supports the `app/icon.(svg)` file convention, which
  auto-injects `<link rel="icon" href="/icon?..." sizes="any">` into `<head>`.
  Placing the SVG at `app/icon.svg` is the idiomatic way to make it the
  favicon (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`).
  An existing `app/favicon.ico` remains; the `icon.svg` will be served
  alongside it (modern browsers prefer the SVG).
- **In-page rendering**: `next/image` is not used anywhere in the codebase, and
  configuring it for a raw SVG adds friction. The header and home page will use
  a plain `<img>` tag referencing `/certflow_icon.svg` served from `public/`.
  This keeps rendering simple and matches the project's current lack of
  `next/image` usage.
- **Exam indicator data source**: `useSettings().currentCertificationId`
  (from `lib/contexts/settings-context.tsx`) plus `loadCertificationList()`
  (from `lib/loaders/certification-loader.ts`), mirroring the existing
  `app/components/CertificationSelector.tsx`. `CertificationSummary` has
  `{ id, name, code }` (see `lib/types/certification.ts`).

## Tasks

### Task 1: Make the brand SVG available as a static asset and favicon `[S]`

**Goal**: Copy `certflow_icon.svg` into `public/` for in-app `<img>` use and
add `app/icon.svg` so Next.js serves it as the favicon.

**Files**:

| File                       | Action | Description                                            |
|----------------------------|--------|--------------------------------------------------------|
| `public/certflow_icon.svg` | create | Copy of the root `certflow_icon.svg` for `<img>` serving |
| `app/icon.svg`             | create | Same SVG, placed for the Next.js `icon` file convention (favicon) |

**Reuse**:

| File                 | What to reuse                                  |
|----------------------|------------------------------------------------|
| `certflow_icon.svg`  | Existing SVG at project root (source contents) |

**Steps**:

1. Copy the contents of the root `certflow_icon.svg` to
   `public/certflow_icon.svg` verbatim.
2. Copy the same SVG to `app/icon.svg`. Next.js 16 auto-generates the
   `<link rel="icon" ... sizes="any">` tag for `.svg` icons — no code change
   in `layout.tsx` is required.
3. Leave the existing root `certflow_icon.svg` and `app/favicon.ico` in place
   (removing them is out of scope; the spec only requires the icon be
   available under `public/` and used as favicon).

**Tests**:

- No unit test (static assets). Verified in the Verification section by
  loading `/certflow_icon.svg` and confirming the favicon `<link>` in the
  built `<head>`.

**Acceptance criteria covered**: "icon file made available under `public/`";
"icon registered as the browser favicon".

**Commit**: `chore(assets): add certflow icon as public asset and favicon`

---

### Task 2: Use the icon in the navigation header (replace emoji) `[S]`

**Goal**: Replace the `🎓` emoji in the header brand with the `certflow_icon.svg`
image, keeping the "CertFlow" text and the link to `/`.

**Files**:

| File                          | Action | Description                                   |
|-------------------------------|--------|-----------------------------------------------|
| `app/components/Navigation.tsx` | modify | Swap the `🎓` `<span>` for an `<img>` of the icon |

**Reuse**:

| File                          | What to reuse                        |
|-------------------------------|--------------------------------------|
| `public/certflow_icon.svg`    | Static asset added in Task 1         |

**Steps**:

1. In the brand `Link` (currently lines 31–40), replace
   `<span className="text-2xl">🎓</span>` with an `<img>` pointing at
   `/certflow_icon.svg`, sized to roughly match the previous emoji
   (e.g. `h-8 w-8`), with an `alt` such as `"CertFlow logo"`.
2. Keep the `<span>CertFlow</span>` text and the surrounding `Link` (href `/`)
   unchanged so the logo still links home and the accessible name stays
   "CertFlow".

**Tests**:

- Update `app/components/__tests__/Navigation.test.tsx`:
  - The test at line 65–75 ("should render navigation icons") asserts the
    `🎓` emoji via `getByText('🎓')`. Change this assertion to instead expect
    the logo image (e.g. `screen.getByAltText('CertFlow logo')`); leave the
    other emoji nav-item assertions intact.
  - Existing tests "should render the CertFlow logo" (text) and "should have
    logo link to home" must still pass.

**Acceptance criteria covered**: "icon replaces the 🎓 emoji next to the
'CertFlow' brand text; the 'CertFlow' text remains".

**Commit**: `feat(navigation): use certflow icon in header brand`

---

### Task 3: Add the icon above the title on the home page `[S]`

**Goal**: Display the icon centered above the large "CertFlow" title on the
home page, keeping the title and taglines.

**Files**:

| File           | Action | Description                                         |
|----------------|--------|-----------------------------------------------------|
| `app/page.tsx` | modify | Add an `<img>` of the icon in the header block above `<h1>` |

**Reuse**:

| File                          | What to reuse                        |
|-------------------------------|--------------------------------------|
| `public/certflow_icon.svg`    | Static asset added in Task 1         |

**Steps**:

1. In the "Header" block (currently lines 8–19), add an `<img>` referencing
   `/certflow_icon.svg` as the first child of the centered container, above
   the `<h1>CertFlow</h1>`, with a prominent size (e.g. `h-24 w-24` /
   `mx-auto`) and an `alt` such as `"CertFlow logo"`.
2. Leave the `<h1>` title and the two tagline `<p>` elements unchanged.

**Tests**:

- No existing home-page test file (`app/__tests__/page.test.tsx` does not
  exist). Adding a dedicated test is optional and out of the spec's scope;
  rely on the build/lint plus manual Verification. (If the implementer opts to
  add one, assert the logo image renders above the heading.)

**Acceptance criteria covered**: "icon displayed centered above the 'CertFlow'
title on the home page; existing title and taglines remain unchanged".

**Commit**: `feat(home): show certflow icon above the title`

---

### Task 4: Add a read-only selected-exam indicator to the header `[M]`

**Goal**: Show the currently selected certification (name/code) in the header
as a non-interactive indicator, present on all pages, sourced from the settings
context, hidden when no valid selection exists.

**Files**:

| File                                       | Action | Description                                             |
|--------------------------------------------|--------|---------------------------------------------------------|
| `app/components/CurrentExamIndicator.tsx`  | create | Read-only client component resolving the current cert   |
| `app/components/Navigation.tsx`            | modify | Render the indicator within the header                  |

**Reuse**:

| File                                        | What to reuse                                                        |
|---------------------------------------------|----------------------------------------------------------------------|
| `app/components/CertificationSelector.tsx`  | Pattern for loading list + reading `useSettings()` (adapt to read-only) |
| `lib/contexts/settings-context.tsx`         | `useSettings()` → `currentCertificationId`                           |
| `lib/loaders/certification-loader.ts`       | `loadCertificationList()`                                            |
| `lib/types/certification.ts`                | `CertificationSummary` (`id`, `name`, `code`)                        |

**Steps**:

1. Create `CurrentExamIndicator.tsx` as a `'use client'` component modeled on
   `CertificationSelector` but with **no `<select>` / no control**:
   - Load the list via `loadCertificationList()` in a `useEffect` with a
     `cancelled` guard and best-effort `catch` (same as the selector).
   - Read `currentCertificationId` from `useSettings()`.
   - Resolve the matching `CertificationSummary`. If the list is empty, no id
     is set, or the id is not found, **render `null`** (hidden).
   - Otherwise render a small, non-interactive label (e.g. a `<span>` /
     `<div>`, not a form control) showing the exam, e.g. `{cert.name} ({cert.code})`.
   - Apply `truncate` / `max-w-*` and `title={...}` so long names don't break
     the header on small widths; hide/condense sensibly on mobile if needed.
2. In `Navigation.tsx`, render `<CurrentExamIndicator />` in the header row
   (e.g. between the brand and the desktop nav, or adjacent to the nav within
   the `max-w-7xl` container) so it appears on every page (the header renders
   on all routes via `app/layout.tsx`).
3. Ensure it does not introduce a second exam control — it is display-only;
   `CertificationSelector` on the home page remains the only way to change the
   exam.

**Tests**:

- Extend `app/components/__tests__/Navigation.test.tsx` (already wraps
  `Navigation` in `SettingsProvider` and mocks `loadCertificationList` at
  lines 19–30):
  - When a certification is selected (set via context/localStorage) and the id
    matches a mocked list entry, the header shows its name/code text.
  - When no certification is selected or the id is not in the list, the
    indicator renders nothing.
  - The indicator is not a `combobox`/form control (assert no additional
    `combobox` beyond the existing "should not render the certification
    selector" expectation still holding).
- Optionally add a focused `CurrentExamIndicator.test.tsx` covering the same
  hidden/visible logic in isolation, following the existing
  `CertificationSelector.test.tsx` structure.

**Acceptance criteria covered**: "header displays the currently selected
certification"; "present on all pages"; "purely informational / cannot change
the exam"; "hidden when no exam selected"; "reflects the shared settings
context and updates on change".

**Commit**: `feat(navigation): add read-only selected-exam indicator to header`

---

**Task ordering**: Task 1 must come first (provides the asset used by Tasks 2
and 3). Tasks 2 and 3 are independent of each other. Task 4 is independent of
Tasks 2–3 but touches the same `Navigation.tsx` file as Task 2, so implement
Task 2 before Task 4 to avoid overlapping edits.

## Edge Cases & Error Handling

- **No certification selected / empty list**: `CurrentExamIndicator` renders
  `null` (Task 4), consistent with `CertificationSelector`.
- **Selected id not found in loaded list**: indicator renders `null` rather
  than showing a broken value (Task 4).
- **Icon fails to load**: `<img>` with `alt` text degrades to alt text; the
  "CertFlow" text in header/home remains and layout is unaffected (Tasks 2, 3).
- **Long certification names**: indicator uses `truncate`/`max-w-*` + `title`
  so the header layout does not break on mobile (Task 4).

## Verification

1. `npm run test:run` — all tests pass, including the updated
   `Navigation.test.tsx` (emoji assertion replaced; new indicator tests).
2. `npm run lint` — no new lint errors.
3. `npm run build` — production build succeeds.
4. `npm run dev` and manually confirm:
   - Browser tab shows the CertFlow favicon (SVG).
   - Header shows the icon (not the 🎓 emoji) next to "CertFlow"; clicking it
     navigates home.
   - Home page shows the icon centered above the "CertFlow" title, with
     taglines unchanged.
   - Selecting an exam on the home page makes the header indicator show that
     exam's name/code; navigating to Simulator/Topics/Progress/Tutor/Settings
     keeps the indicator visible; the indicator has no control to change the
     exam.
   - With no exam selected (or an unknown id), the header indicator is hidden.

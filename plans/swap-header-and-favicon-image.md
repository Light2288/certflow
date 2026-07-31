# Plan: Swap Header and Favicon Image

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Swap Header and Favicon Image      |
| **Spec**     | specs/swap-header-and-favicon-image.md |
| **Type**     | chore                              |
| **Branch**   | chore/swap-header-and-favicon-image |
| **Created**  | 2026-07-31 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The navigation header logo and the site favicon currently use
`certflow_icon.svg`. A new brand asset, `certflow_header.svg`, should replace
both, while the homepage hero image continues to use `certflow_icon.svg`.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `chore/swap-header-and-favicon-image`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b chore/swap-header-and-favicon-image
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

| Action | Command          |
|--------|------------------|
| Test   | `npm run test:run` |
| Build  | `npm run build`  |

## Tasks

### Task 1: Add the header SVG asset and swap the header logo `src` `[S]`

**Goal**: Copy `certflow_header.svg` into `public/` and point the navigation
header logo at it, keeping current sizing and the text span.

**Files**:

| File                                  | Action | Description                                    |
|---------------------------------------|--------|------------------------------------------------|
| `public/certflow_header.svg`          | create | Copy of the source asset                       |
| `app/components/Navigation.tsx`       | modify | Change header `<img>` `src` to `/certflow_header.svg` |
| `app/components/__tests__/Navigation.test.tsx` | modify | Update `src` assertion to `/certflow_header.svg` |

**Reuse**:

| File                             | What to reuse                                  |
|----------------------------------|------------------------------------------------|
| `app/components/Navigation.tsx`  | Existing `<img>` element (lines 38–42), keep `h-8 w-8` and the `CertFlow` `<span>` |

**Steps**:

1. Copy `/Users/davide/Personal/Images/Certflow/certflow_header.svg` to
   `public/certflow_header.svg`.
2. In `app/components/Navigation.tsx`, change the header `<img src>` from
   `/certflow_icon.svg` to `/certflow_header.svg`. Leave `alt`, the
   `h-8 w-8` classes, and the adjacent `<span>CertFlow</span>` unchanged.
3. In `Navigation.test.tsx` (line 71), update the expected `src` from
   `/certflow_icon.svg` to `/certflow_header.svg`.

**Tests**:

- Run `npm run test:run` and confirm `Navigation.test.tsx` passes with the
  new `src` assertion.

**Acceptance criteria covered**: `public/certflow_header.svg` exists; header
`<img>` uses `/certflow_header.svg` with unchanged sizing and text span;
header logo test updated.

**Commit**: `chore(nav): swap header logo to certflow_header.svg`

---

### Task 2: Replace the favicon assets with the new header artwork `[S]`

**Goal**: Make the new header SVG the site favicon by replacing
`app/icon.svg` and `app/favicon.ico`, while leaving the homepage hero image
untouched.

**Files**:

| File               | Action | Description                                         |
|--------------------|--------|-----------------------------------------------------|
| `app/icon.svg`     | modify | Replace contents with `certflow_header.svg` artwork |
| `app/favicon.ico`  | modify | Replace with an `.ico` derived from the header SVG  |

**Reuse**:

| File               | What to reuse                                          |
|--------------------|--------------------------------------------------------|
| `app/icon.svg`, `app/favicon.ico` | Existing Next.js file-based favicon convention (no metadata code changes needed) |

**Steps**:

1. Overwrite `app/icon.svg` with the contents of
   `/Users/davide/Personal/Images/Certflow/certflow_header.svg`.
2. Regenerate `app/favicon.ico` from the same header SVG. Note:
   `.ico` is a binary raster format and cannot be hand-authored from SVG
   text — the implementer must rasterize/convert the SVG to `.ico` (e.g. via
   an image tool or converter) and replace the existing file.
3. Confirm no changes are made to `app/page.tsx` (homepage hero stays on
   `/certflow_icon.svg`).

**Tests**:

- No unit test covers favicon delivery. Verify manually via the Verification
  section below.

**Acceptance criteria covered**: `app/icon.svg` replaced with the header
SVG; `app/favicon.ico` replaced with a header-derived version; homepage hero
unchanged.

**Commit**: `chore(favicon): replace icon.svg and favicon.ico with header artwork`

---

**Task ordering**: Tasks are independent and may be done in either order.
Task 1 handles the header logo and its test; Task 2 handles the favicon
assets.

## Edge Cases & Error Handling

- Test asserts old `src`: updated in Task 1 so the suite passes.
- Aspect-ratio distortion in the fixed `h-8 w-8` box: accepted per spec
  decision to keep current sizing (Task 1).
- `.ico` cannot be authored as text: implementer must convert the SVG to a
  raster `.ico` (Task 2).

## Verification

1. Run `npm run test:run` — all tests pass, including the updated
   `Navigation.test.tsx`.
2. Run `npm run build` — build succeeds.
3. Run `npm run dev`, load the app, and confirm the header shows the new
   `certflow_header.svg` logo beside the `CertFlow` text.
4. Confirm the browser tab favicon shows the new artwork (hard-refresh to
   bypass favicon cache).
5. Confirm the homepage hero image is unchanged (still
   `/certflow_icon.svg`).

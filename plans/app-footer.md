# Plan: App Footer

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | App Footer                         |
| **Spec**     | specs/app-footer.md                |
| **Type**     | feature                            |
| **Branch**   | feat/app-footer                    |
| **Created**  | 2026-07-22 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

CertFlow has no footer today. This adds a global footer, rendered once in
the root layout, whose primary purpose is a "Buy me a coffee" PayPal.me
donation button, rounded out with a copyright line, GitHub/source link,
MIT license link, an AI-content disclaimer, and the app version read from
`package.json`.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/app-footer`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/app-footer
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

Branch type mapping:

- feature → `feat/<slug>`

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task below maps to exactly one commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (watch: `npm test`) |
| Lint   | `npm run lint`     |
| Build  | `npm run build`    |

## Tasks

### Task 1: Create the Footer component with tests `[S]`

**Goal**: Add a presentational `Footer` component containing all required
footer content, backed by unit tests.

**Files**:

| File                                             | Action | Description                                              |
|--------------------------------------------------|--------|----------------------------------------------------------|
| `app/components/Footer.tsx`                      | create | The footer component (server component, no client hooks).|
| `app/components/__tests__/Footer.test.tsx`       | create | Vitest + Testing Library tests for the footer.           |

**Reuse**:

| File                                   | What to reuse                                                        |
|----------------------------------------|---------------------------------------------------------------------|
| `app/components/Navigation.tsx`        | Tailwind class conventions: `bg-white dark:bg-gray-900`, border, `text-gray-*`/`dark:` colors, `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` container. |
| `app/components/__tests__/Navigation.test.tsx` | Test structure: `render` from `@testing-library/react`, `screen.getByRole/getByText`, `describe/it/expect` from `vitest`. |
| `package.json`                         | Import `version` for the displayed app version.                     |
| `LICENSE`                              | MIT license + author name ("Light", 2026) for the copyright line.   |

**Steps**:

1. Consult `node_modules/next/dist/docs/` for current app-router
   component conventions before writing code (per AGENTS.md).
2. Create `app/components/Footer.tsx` as a **server component** (no
   `'use client'`; it renders static content only). Structure it as a
   semantic `<footer>` landmark.
3. Import the version: `import { version } from '../../package.json';`
   (or the path that resolves under `tsconfig` — verify `resolveJsonModule`
   is enabled; Next.js/TS default allows JSON import). Render it as
   `v{version}`. If `version` is falsy, omit the version node (graceful
   degradation).
4. Add the content nodes:
   - **Buy me a coffee** link: an `<a>` styled as a button, labelled
     "Buy me a coffee", `href="https://paypal.me/DavideAliti"`,
     `target="_blank"`, `rel="noopener noreferrer"`.
   - **Copyright line**: `© 2026 CertFlow` (author per LICENSE).
   - **GitHub link**: `<a>` to `https://github.com/Light2288/certflow`,
     `target="_blank"`, `rel="noopener noreferrer"`.
   - **License link**: `<a>` labelled "MIT License" to
     `https://github.com/Light2288/certflow/blob/main/LICENSE`,
     `target="_blank"`, `rel="noopener noreferrer"`.
   - **Disclaimer**: short text noting AI-generated content may be
     inaccurate and CertFlow is not affiliated with or endorsed by any
     certification vendor.
5. Style with Tailwind matching Navigation: light/dark backgrounds, a top
   border, muted text, and a responsive flex/grid layout that wraps on
   small screens (`flex flex-col sm:flex-row`, `flex-wrap`, `gap-*`). Keep
   it `shrink-0` friendly for the fixed-shell layout (see Task 2).
6. Add a trailing `// Made with Bob` comment to match repo convention.

**Tests** (`app/components/__tests__/Footer.test.tsx`):

- Renders a `contentinfo` landmark (`screen.getByRole('contentinfo')`).
- Renders the "Buy me a coffee" link with the correct PayPal.me href and
  `rel="noopener noreferrer"` + `target="_blank"`.
- Renders the GitHub link with the correct repo href.
- Renders the license link with the correct LICENSE href.
- Renders the copyright line text.
- Renders the disclaimer text (AI content / not affiliated).
- Renders the version string derived from `package.json` version.

**Acceptance criteria covered**: donation button + href + safe link attrs;
copyright line; GitHub link; license link; disclaimer; version from
package.json; consistent Tailwind/dark styling.

**Commit**: `feat(footer): add global footer component with donation button`

---

### Task 2: Mount the Footer in the root layout `[S]`

**Goal**: Render `Footer` on every page via `app/layout.tsx` and ensure it
fits the fixed-height flex shell.

**Files**:

| File               | Action | Description                                    |
|--------------------|--------|------------------------------------------------|
| `app/layout.tsx`   | modify | Import and render `<Footer />` after `<main>`. |

**Reuse**:

| File               | What to reuse                                                       |
|--------------------|---------------------------------------------------------------------|
| `app/layout.tsx`   | Existing `body` flex-column shell (`h-full flex flex-col overflow-hidden`) and the `<Navigation />` + `<main className="flex-1 overflow-auto">` pattern. |

**Steps**:

1. Add `import Footer from "./components/Footer";`.
2. Render `<Footer />` as a sibling **after** `<main>`, inside
   `SettingsProvider`. Because `body` is `flex flex-col overflow-hidden`
   and `main` is `flex-1 overflow-auto`, the footer sits at the bottom of
   the viewport on every page while `main` scrolls — this satisfies "not
   sticky/fixed, sits below content" without extra CSS. Ensure the footer
   itself does not grow (it is `flex-1`-free / naturally `shrink-0`).
3. Verify short pages (footer at natural bottom) and long/scrolling pages
   (footer remains visible below the scroll region) both look correct.

**Tests**:

- No new unit test file required; `app/layout.tsx` is a thin composition
  root and Next.js layouts are awkward to unit test in isolation. Coverage
  for footer content is in Task 1. Verification is via `npm run build`
  and manual/dev-server check (see Verification).

**Acceptance criteria covered**: footer renders at the bottom of every
page; included via root layout globally without per-page wiring;
non-sticky placement (edge case).

**Commit**: `feat(footer): render footer globally in root layout`

---

**Task ordering**: Task 1 must precede Task 2 (Task 2 imports the
component created in Task 1).

## Edge Cases & Error Handling

- **Missing/unresolved version**: Task 1 omits the version node when
  `version` is falsy rather than rendering an empty/broken string.
- **Small screens**: Task 1 uses responsive wrapping (`flex-col sm:flex-row`,
  `flex-wrap`) so content stays readable on mobile.
- **Short vs. long pages**: Task 2 relies on the existing flex shell so the
  footer sits at the bottom without being fixed; `main` scrolls, footer
  stays put.

## Verification

1. `npm run test:run` — all tests pass, including the new
   `Footer.test.tsx`.
2. `npm run lint` — no lint errors in new/changed files.
3. `npm run build` — production build succeeds (validates the
   `package.json` JSON import and server-component usage).
4. `npm run dev` — visit `/`, `/simulator`, `/topics`, `/progress`,
   `/tutor`, `/settings`: footer appears on every page, the "Buy me a
   coffee" button opens `https://paypal.me/DavideAliti` in a new tab, and
   GitHub + license links resolve. Check a short page and a long/scrolling
   page, plus a narrow mobile viewport for responsive wrapping.
5. Confirm each spec acceptance criterion is satisfied.

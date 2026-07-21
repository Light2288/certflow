# App Icon & Header Exam Indicator

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | App Icon & Header Exam Indicator                       |
| **Type**      | feature                                                |
| **Scope**     | app shell (Navigation header, home page, layout metadata) |
| **Created**   | 2026-07-22 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow currently uses a generic 🎓 emoji as its visual mark in the header
and shows only a plain text title on the home page. A dedicated brand icon
(`certflow_icon.svg`) already exists in the project but is not used anywhere,
nor is it wired up as the browser favicon.

Separately, once a user selects a certification/exam on the home page, there
is no persistent reminder of which exam is active while they move through the
rest of the app (Simulator, Topics, Progress, Tutor, Settings). Users can
lose track of the context they are studying under.

## Desired Outcome

- The existing `certflow_icon.svg` is used as the app's brand icon in three
  places: the navigation header, above the title on the home page, and as the
  browser favicon.
- The header shows a read-only indication of the currently selected exam so
  the active certification is always visible, on every page. The exam can
  still only be *changed* from the home page.

## Acceptance Criteria

- [ ] The icon file (currently `certflow_icon.svg` at the project root) is
      made available under `public/` so it can be served as a static asset.
- [ ] In the navigation header, the icon replaces the `🎓` emoji next to the
      "CertFlow" brand text; the "CertFlow" text remains.
- [ ] On the home page, the icon is displayed centered above the large
      "CertFlow" title; the existing title and taglines remain unchanged.
- [ ] The icon is registered as the browser favicon (visible in the browser
      tab).
- [ ] The header displays the name of the currently selected certification
      (e.g. its name and/or code) as a read-only indicator.
- [ ] The header exam indicator is present on all pages, not just the home
      page.
- [ ] The header exam indicator is purely informational — it is not a control
      and cannot be used to change the exam. Changing the exam remains
      possible only via the existing `CertificationSelector` on the home page.
- [ ] When no exam is selected, the header exam indicator renders nothing
      (is hidden) rather than showing an empty or placeholder value.
- [ ] The header indicator reflects the current selection sourced from the
      shared settings context (the same source the home-page selector writes
      to), and updates when the selection changes.

## Edge Cases & Error Handling

- **No certification selected / empty certification list**: the header
  indicator is hidden entirely (consistent with the existing selector, which
  renders nothing when there are no certifications).
- **Selected certification id not found in the loaded list**: the indicator
  should degrade gracefully (hide, rather than error or show a broken value).
- **Icon fails to load**: the header and home page should still render the
  "CertFlow" text without breaking layout.
- **Long certification names in the header**: the indicator should not break
  the header layout (e.g. truncate or wrap sensibly) on smaller/mobile widths.

## Dependencies & Constraints

- This is the modified/breaking version of Next.js. Before implementing,
  read the relevant guide under `node_modules/next/dist/docs/` for the
  correct favicon/metadata conventions and static asset handling; do not
  assume prior Next.js knowledge.
- The current certification lives in the shared settings context
  (`lib/contexts/settings-context.tsx`), exposed via `useSettings()` with
  `currentCertificationId`. The certification list is loaded via
  `loadCertificationList()` in `lib/loaders/certification-loader.ts`.
- Affected components: `app/components/Navigation.tsx` (header),
  `app/page.tsx` (home page), `app/layout.tsx` (favicon/metadata), and the
  existing `app/components/CertificationSelector.tsx` (unchanged behavior;
  remains the only place to change the exam).
- The icon is an SVG with gradients; ensure it renders at small sizes
  (header/favicon) without visual artifacts.

## Out of Scope

- Changing how the exam is selected or where the selector lives (it stays on
  the home page only).
- Redesigning the navigation, home page layout, or theming beyond adding the
  icon and the exam indicator.
- Generating additional icon formats/sizes (e.g. PNG app icons, PWA manifest
  icons, apple-touch-icon) unless required to make the favicon work.

## Notes

- The user referred to the file as `certflow.svg`; the actual file in the
  project is `certflow_icon.svg` at the project root. Per the user's
  decision, the implementer should use `certflow_icon.svg` and move/copy it
  into `public/`.

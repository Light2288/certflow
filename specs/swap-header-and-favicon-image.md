# Swap Header and Favicon Image

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Swap Header and Favicon Image                          |
| **Type**      | chore                                                  |
| **Scope**     | Navigation header logo and site favicon                |
| **Created**   | 2026-07-31 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The navigation header logo and the site favicon currently use the existing
`certflow_icon.svg` asset. A new brand asset,
`certflow_header.svg`, should be used for the header logo and the favicon
instead. The homepage hero image must remain unchanged.

## Current Behavior

- The navigation header (`app/components/Navigation.tsx`) renders an
  `<img src="/certflow_icon.svg">` at `h-8 w-8`, beside a `CertFlow`
  text span.
- The favicon is served via Next.js file conventions using
  `app/icon.svg` and `app/favicon.ico`.
- The homepage (`app/page.tsx`) renders a large hero image using
  `/certflow_icon.svg`.

## Desired Outcome

- The source asset at
  `/Users/davide/Personal/Images/Certflow/certflow_header.svg` is copied
  into the project as `public/certflow_header.svg`.
- The navigation header logo references `/certflow_header.svg`, keeping the
  current sizing (`h-8 w-8`) and the existing `CertFlow` text span; only the
  `src` changes.
- The favicon is derived from the new header SVG: both `app/icon.svg` and
  `app/favicon.ico` are replaced with versions based on
  `certflow_header.svg`.
- The homepage hero image continues to use `/certflow_icon.svg` and is not
  modified.

## Acceptance Criteria

- [ ] `public/certflow_header.svg` exists, copied from the provided source
      path.
- [ ] `app/components/Navigation.tsx` header `<img>` uses
      `src="/certflow_header.svg"` with unchanged `h-8 w-8` sizing and the
      `CertFlow` text span intact.
- [ ] `app/icon.svg` is replaced with the new header SVG so Next.js serves
      it as the favicon.
- [ ] `app/favicon.ico` is replaced with a version derived from the new
      header SVG.
- [ ] `app/page.tsx` homepage hero image still references
      `/certflow_icon.svg` and is unchanged.
- [ ] Existing tests referencing the header logo `src` are updated to expect
      `/certflow_header.svg`.

## Edge Cases & Error Handling

- The `Navigation.test.tsx` test asserts the logo `src` equals
  `/certflow_icon.svg`; this assertion must be updated to
  `/certflow_header.svg` or the suite will fail.
- If `certflow_header.svg` renders at a different aspect ratio inside the
  fixed `h-8 w-8` box, it may appear distorted; the header should still use
  the current sizing per the decision to keep it, accepting any visual
  trade-off.

## Dependencies & Constraints

- Source asset must be available at
  `/Users/davide/Personal/Images/Certflow/certflow_header.svg` at
  implementation time.
- Favicon delivery relies on Next.js file-based metadata conventions
  (`app/icon.svg`, `app/favicon.ico`).

## Out of Scope

- The homepage hero image in `app/page.tsx` (remains `/certflow_icon.svg`).
- Any redesign of the header layout beyond swapping the image `src`.
- Removing or repurposing the existing `certflow_icon.svg` asset.

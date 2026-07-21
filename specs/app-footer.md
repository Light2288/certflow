# App Footer

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | App Footer                                             |
| **Type**      | feature                                                |
| **Scope**     | app/layout, app/components                             |
| **Created**   | 2026-07-22 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow currently has no footer. A footer is a low-effort, high-trust
surface: it gives the app a finished feel, surfaces provenance (source,
license), sets expectations about AI-generated content, and provides a
way for users to support the project financially. The primary motivation
is to add a "buy me a coffee" donation button so satisfied users can
support the author; the surrounding footer content rounds it out into a
proper page footer.

## Desired Outcome

A footer appears at the bottom of every page across the app (rendered once
via the root layout, `app/layout.tsx`, so it is global). The footer
contains:

- A **"Buy me a coffee" donation button** linking to
  `https://paypal.me/DavideAliti`.
- A **copyright line** (e.g. `© 2026 CertFlow`) crediting the author.
- A **GitHub / source repository link**.
- A **license link** pointing to the project's `LICENSE`.
- A short **disclaimer note** clarifying that AI-generated content
  (questions, tutor responses, deep dives) may be inaccurate and that
  CertFlow is not affiliated with or endorsed by any certification vendor.
- The current **app version**, sourced from `package.json`.

## Acceptance Criteria

- [ ] A footer component renders at the bottom of every page in the app.
- [ ] The footer is included via the root layout so it appears globally
      without per-page wiring.
- [ ] The footer contains a clearly labelled "Buy me a coffee" button/link
      pointing to `https://paypal.me/DavideAliti`.
- [ ] The donation link opens in a new tab and uses safe link attributes
      (`rel="noopener noreferrer"`).
- [ ] The footer displays a copyright line crediting CertFlow / the author.
- [ ] The footer includes a link to the project's GitHub / source
      repository.
- [ ] The footer includes a link to the project license (the `LICENSE`
      file).
- [ ] The footer shows a disclaimer that AI-generated content may be
      inaccurate and that CertFlow is not affiliated with any certification
      vendor.
- [ ] The footer displays the current app version taken from
      `package.json` (not hard-coded).
- [ ] The footer is styled consistently with the existing app design
      (Tailwind / globals.css) and is legible in the app's theme.

## Edge Cases & Error Handling

- **Long pages / short pages**: on short pages the footer should sit at the
  natural bottom of the content; it does not need to be sticky to the
  viewport (global footer, not fixed).
- **Missing/unresolved version**: if the version cannot be read from
  `package.json`, the footer should degrade gracefully (omit the version
  rather than break the layout).
- **Small screens**: footer content should wrap responsively and remain
  readable on mobile widths.

## Dependencies & Constraints

- Next.js app-router project; the global footer belongs in
  `app/layout.tsx`, likely as a dedicated component under
  `app/components/`.
- Version must be derived from `package.json` rather than duplicated.
- This is a Next.js version with breaking changes from prior releases;
  the implementer must consult `node_modules/next/dist/docs/` before
  writing layout/component code.
- Donation link is a static PayPal.me URL; no payment integration or
  backend work is required.

## Out of Scope

- Any payment processing, PayPal API integration, or transaction handling
  beyond a simple outbound link.
- Analytics or click tracking on the donation button.
- A cookie/consent banner or full privacy policy page (the footer only
  carries a short inline disclaimer).
- Newsletter signup, social media icons, or a full sitemap-style link
  grid.

## Notes

- Donation provider decision: PayPal.me was chosen over Buy Me a Coffee
  (~5% fee) and Ko-fi for simplicity and zero platform fee. URL:
  `https://paypal.me/DavideAliti`.
- The exact GitHub repository URL and the precise disclaimer wording
  should be confirmed at implementation time; the acceptance criteria fix
  the intent, not the final copy.

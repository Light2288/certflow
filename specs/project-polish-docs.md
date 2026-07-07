# Project Polish, Docs & Lint

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Project Polish, Docs & Lint                            |
| **Type**      | chore                                                  |
| **Scope**     | Repository housekeeping — docs, lint, cleanup, optional E2E |
| **Created**   | 2026-07-07 00:00:00                                   |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow's application code is mature (Phases 0–7 implemented and tested),
but the surrounding repository is not contributor-ready. The audit in
`IMPLEMENTATION_PLAN_UPDATED.md` (Phase 14) surfaced several housekeeping
gaps:

- `README.md` is still the untouched `create-next-app` boilerplate and
  says nothing about CertFlow, its AI providers, or how to author
  certifications.
- `app/api/chat/route.ts` uses `catch (error: any)` (line 40) and reads
  `.message` / `.code` / `.provider` off the untyped value — a
  `no-explicit-any` lint concern.
- Two stray development artefacts, `Cline_Chat.txt` and
  `CLINE_CONVERSATION_SUMMARY.md`, clutter the repository root.
- Documentation still references a legacy `data/` path that does not
  exist; data actually lives in `public/data/`.
- There is no end-to-end smoke suite protecting the critical user paths.

Closing these gaps makes the repo understandable and maintainable for a
new contributor without changing any product behaviour.

## Current Behavior

- `README.md` contains the default Next.js scaffold content (Getting
  Started, deploy-on-Vercel blurb) with no project-specific information.
- `app/api/chat/route.ts` compiles but relies on `error: any`; `npm run
  lint` (`eslint`) does not currently pass cleanly with respect to
  `no-explicit-any` in this file.
- `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md` sit in the project
  root alongside source and config files.
- No `test:e2e` script exists in `package.json`; the only test script is
  `test: vitest`.

## Desired Outcome

- `README.md` accurately describes CertFlow and is genuinely useful to a
  new contributor.
- The chat API route is free of explicit `any`, and `npm run lint` passes
  with zero warnings.
- The stray Cline artefacts are relocated out of the repository root into
  an `archive/` folder, and documentation clarifies that data lives under
  `public/data/`.
- Optionally, a small Playwright smoke suite guards the critical paths and
  is wired into `package.json`.
- No product/feature behaviour changes; the existing Vitest suite remains
  green throughout.

## Acceptance Criteria

- [ ] `README.md` is rewritten (no `create-next-app` boilerplate remains)
      and covers: project purpose; quick start (noting this machine uses
      nvm — `source ~/.nvm/nvm.sh && nvm use` before `npm`); AI provider
      setup; certification authoring (the
      `public/data/certifications/<id>/` layout plus the `config.json` /
      `topics.json` / `questions.json` schemas as defined in
      `lib/types/certification.ts`); testing (the Vitest scripts in
      `package.json`); and deployment (linking `DEPLOYMENT.md`).
- [ ] `README.md` cross-links `IMPLEMENTATION_PLAN_UPDATED.md`.
- [ ] `DEPLOYMENT.md` is confirmed accurate (Vercel build path verified).
- [ ] `app/api/chat/route.ts` no longer uses `catch (error: any)` (line
      ~40); the caught value is typed as `unknown` and narrowed before
      `.message` / `.code` / `.provider` are read, and no other explicit
      `any` remains in the file.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md` are moved into
      an `archive/` folder (preserved, not deleted) and no longer sit in
      the repository root.
- [ ] Documentation includes a note clarifying that data lives in
      `public/data/` and that the legacy `data/` path does not exist.
- [ ] The existing Vitest suite remains fully green after all changes.
- [ ] (Optional / stretch) Playwright is added with critical-path smoke
      tests — quiz setup → answer → results; AI Tutor mock message;
      settings save → reload — wired via a `test:e2e` script in
      `package.json` with CI guidance, and the suite is green locally.

## Edge Cases & Error Handling

- **Narrowing the caught error:** the route reads `.message`, `.code`, and
  `.provider`. Narrowing from `unknown` must preserve the existing 500
  response shape (`{ error, code, provider }`) and its current fallbacks
  (`'An error occurred'`, `'UNKNOWN_ERROR'`, `'unknown'`).
- **Other lint findings:** if fixing the route surfaces additional lint
  warnings elsewhere, they must also be resolved so the zero-warning bar
  holds — but only lint-level fixes, no behavioural refactors.
- **Archived-doc references:** if any doc or code references the Cline
  files by their old root path, update or remove those references so
  nothing points at a stale location.
- **nvm not present:** the README quick-start should present the nvm step
  as the project convention without assuming every contributor's machine
  is identical.

## Dependencies & Constraints

- Best sequenced last (after Phases 8–13) so the README describes the
  finished feature set, but the lint fix and doc cleanup can land at any
  time.
- Must not change product/feature behaviour; this is documentation, lint,
  and cleanup only.
- Certification schema described in the README must match the actual
  types in `lib/types/certification.ts`.
- `README.md`, `DEPLOYMENT.md`, and `IMPLEMENTATION_PLAN_UPDATED.md` must
  end up mutually consistent.

## Out of Scope

- Any feature changes or new functionality.
- Adding new certifications or the multi-certification selector (Phase 12).
- Changes to the AI generation, validation, or simulator behaviour
  (Phases 8–10).
- Modifying the chat route's runtime behaviour beyond the type-safety fix.

## Notes

- Reference — chat route: `app/api/chat/route.ts` line 40 is
  `} catch (error: any) {`, followed by reads of `error.message`,
  `error.code`, and `error.provider`.
- Reference — scripts: `package.json` currently defines `lint: "eslint"`
  and `test: "vitest"`; there is no `test:e2e` script yet.
- Existing docs: `README.md`, `DEPLOYMENT.md`, `Cline_Chat.txt`, and
  `CLINE_CONVERSATION_SUMMARY.md` are all present at the repo root; a
  separate `test/README.md` also exists and is unrelated to this cleanup.
- Per user decision: Playwright E2E is treated as optional/stretch (not a
  hard requirement), and the two Cline docs are to be relocated into an
  `archive/` folder rather than consolidated or deleted.
- Derived from the embedded Phase 14 (`project-polish-docs`) spec-define
  prompt in `IMPLEMENTATION_PLAN_UPDATED.md`.

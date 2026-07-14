# Plan: Study-Materials Certification Pipeline

| Field        | Value                                        |
|--------------|----------------------------------------------|
| **Title**    | Study-Materials Certification Pipeline        |
| **Spec**     | specs/study-materials-cert-pipeline.md        |
| **Type**     | feature                                       |
| **Branch**   | feat/study-materials-cert-pipeline            |
| **Created**  | 2026-07-14 11:05:00                           |
| **Status**   | IMPLEMENTED                                   |

## Context

The project ships two placeholder certifications (`aws-ml`, a stub
`snowpro-core`). We have collected copyrighted source material for three real
exams under `study-materials/<Exam>/` (PDF study guide, Udemy transcripts,
Udemy quiz-export HTML). This plan builds git-ignored extraction tooling to
pre-work that material into predictable outputs, then authors three real
certifications under `public/data/certifications/`, removes the placeholders,
and adds a strict validator + test so the generated JSON is provably correct.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. This repo's
> base is `develop`. The branch name is `feat/study-materials-cert-pipeline`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout develop && git pull --ff-only && git checkout -b feat/study-materials-cert-pipeline
> ```

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task below maps to exactly one commit.

Note: files under `study-materials/` are git-ignored except explicitly
whitelisted scripts. Tasks that create git-ignored outputs (running the
scripts) do not themselves produce committed files — their effect is verified
locally and consumed by later authoring tasks. See Task ordering.

## Build & Test Commands

| Action | Command        |
|--------|----------------|
| Test   | `npm run test:run` |
| Build  | `npm run build` |
| Lint   | `npm run lint` |

## Tasks

### Task 1: Add git-ignored question-extraction script `[M]`

**Goal**: Deterministically extract every question from `exam_export/*.html`
into a normalized `extracted-questions.json` per exam folder.

**Files**:

| File                                         | Action | Description                                   |
|----------------------------------------------|--------|-----------------------------------------------|
| `study-materials/extract-questions.mjs`      | create | Node ESM script parsing `window.__QUIZ_DATA__` |
| `.gitignore`                                 | modify | Whitelist the new script (see Task 6)          |

**Reuse**:

| File                                | What to reuse                                     |
|-------------------------------------|---------------------------------------------------|
| `lib/types/certification.ts`        | Target shape awareness (Question fields) for output |

**Steps**:

1. Accept an exam folder path as arg; glob its `exam_export/*.html`.
2. For each HTML file, locate `window.__QUIZ_DATA__=` and read the balanced
   JSON object (string-aware brace matching; do not regex the whole file).
3. Normalize each question: strip HTML tags from `question`/`answers`; keep
   `type`; map `correct` (0-based indices) to option letters/ids; carry both
   per-answer `feedbacks` and overall `explanation` (whichever is populated).
4. Aggregate across all HTML files in the folder; dedupe by normalized
   question text.
5. Write `study-materials/<Exam>/exam_export/extracted-questions.json`
   (constant filename across all exams).
6. Print a summary (files parsed, skipped, total/deduped question counts).

**Tests**:

- No committed unit test (script + fixtures are git-ignored). Verify by
  running against all three exam folders and inspecting counts (see Task 4 /
  Verification).

**Acceptance criteria covered**: extractor exists, handles both exporter
conventions and both question types, HTML stripped, aggregated + deduped.

**Commit**: `chore(study-materials): add exam question extraction script`

---

### Task 2: Add git-ignored transcript-parsing script `[M]`

**Goal**: Deterministically parse `transcript_export/*.txt` (`=== Section ===`
/ `--- Lecture ---` / cue numbers) into clean structured output per exam
folder.

**Files**:

| File                                       | Action | Description                                  |
|--------------------------------------------|--------|----------------------------------------------|
| `study-materials/parse-transcript.mjs`     | create | Node ESM script; delimiter parser + cleaner   |
| `.gitignore`                               | modify | Whitelist the new script (see Task 6)         |

**Steps**:

1. Accept an exam folder path as arg; glob its `transcript_export/*.txt`.
2. Parse `=== ... ===` as sections, `--- ... ---` as lectures; collect body
   lines until the next delimiter.
3. Clean each body: drop lines that are only an integer (caption cue numbers),
   decode HTML entities, collapse blank runs.
4. Skip lectures with empty/"no transcript available" bodies.
5. Write `study-materials/<Exam>/transcript_export/parsed-transcript.json`
   (constant filename): array of `{ section, lecture, text }`, one aggregated
   file per exam folder covering all its transcripts.
6. Print a summary (transcripts, sections, lectures written, skipped).

**Tests**:

- No committed unit test (git-ignored). Verified by running against all three
  exam folders (Verification).

**Acceptance criteria covered**: transcript parser exists, strips cue numbers,
writes clean structured output with constant filename.

**Commit**: `chore(study-materials): add transcript parsing script`

---

### Task 3: Update `.gitignore` for scripts and drop stale exception `[S]`

**Goal**: Ensure both new scripts are tracked while all other
`study-materials/` content (raw material + script outputs) stays ignored, and
remove the obsolete `split-transcript.mjs` exception.

**Files**:

| File         | Action | Description                                             |
|--------------|--------|---------------------------------------------------------|
| `.gitignore` | modify | Replace `split-transcript.mjs` exception with new scripts |

**Reuse**:

| File         | What to reuse                                     |
|--------------|---------------------------------------------------|
| `.gitignore` | Existing `/study-materials/*` + `!` whitelist block |

**Steps**:

1. In the study-materials block, remove `!/study-materials/split-transcript.mjs`.
2. Add `!/study-materials/extract-questions.mjs` and
   `!/study-materials/parse-transcript.mjs`.
3. Confirm `extracted-questions.json` / `parsed-transcript.json` outputs remain
   ignored (they live in subfolders covered by `/study-materials/*`).

**Tests**:

- Verify with `git check-ignore -v` on the scripts (tracked) and on a sample
  output JSON + a raw PDF/HTML (ignored).

**Acceptance criteria covered**: scripts + outputs git-ignored except
whitelisted scripts; `.gitignore` updated and stale exception dropped.

**Commit**: `chore: track study-materials extraction scripts in gitignore`

---

### Task 4: Run both scripts against all three exam folders `[S]`

**Goal**: Produce the pre-worked, git-ignored outputs the authoring tasks
consume.

**Files**: none committed (outputs are git-ignored).

**Steps**:

1. Run `node study-materials/extract-questions.mjs "<folder>"` for each of the
   three exam folders (`SnowPro Core CO3`, `AWS Developer Associate`,
   `AWS Data Engineer Associate`).
2. Run `node study-materials/parse-transcript.mjs "<folder>"` for each.
3. Confirm each folder now has `exam_export/extracted-questions.json` and
   `transcript_export/parsed-transcript.json`.
4. Sanity-check counts against spec expectations (SnowPro ~5 files, AWS Dev ~6,
   AWS DEA ~10).

**Tests**:

- Inspect output JSON: correct answers present, both types represented,
  no empty question text.

**Acceptance criteria covered**: scripts applied to all three folders,
producing the described outputs.

**Commit**: `chore(study-materials): generate extraction outputs for three exams`
(empty-tree note: if no tracked files change, fold this verification into
Task 5's commit instead — see Task ordering.)

---

### Task 5: Add strict certification validator + Vitest test `[M]`

**Goal**: Provide a committed, repeatable gate that enforces the spec's strict
rules (which the runtime loader only warns about).

**Files**:

| File                                                  | Action | Description                                            |
|-------------------------------------------------------|--------|--------------------------------------------------------|
| `lib/loaders/__tests__/certification-data.test.ts`    | create | Vitest test loading each cert's JSON from disk          |
| `scripts/validate-certifications.mjs`                 | create | Optional CLI wrapper reusing the same assertions        |

**Reuse**:

| File                                    | What to reuse                                              |
|-----------------------------------------|-----------------------------------------------------------|
| `lib/loaders/certification-loader.ts`   | `validateCertificationConfig`, `validateTopics`, `validateQuestions`, `validateTopicReference` |
| `lib/types/certification.ts`            | Types for reading the JSON                                 |
| `lib/**/__tests__/*.test.ts`            | Vitest conventions (colocated `__tests__`)                 |

**Steps**:

1. Test reads `public/data/certifications/index.json`, then for each listed
   cert reads `config.json`/`topics.json`/`questions.json` from the filesystem
   (not via HTTP fetch).
2. Assert (as hard failures, upgrading loader warnings to errors):
   - config valid; topic weights sum to 100 (±0.01);
   - every topic has ≥1 subtopic; unique topic/subtopic ids;
   - every question: unique id, valid `type`/`difficulty`, ≥2 options with
     unique ids, `correctAnswer` type matches `type` and references existing
     option ids, `topicId`/`subtopicId` resolve via `validateTopicReference`,
     `explanation.correct` non-empty.
3. `validate-certifications.mjs` reuses the same checks for a CLI run
   (`node scripts/validate-certifications.mjs`).

**Tests**:

- This task *is* the test. Runs green only after Tasks 6–8 add valid data;
  see Task ordering. Run `npm run test:run`.

**Acceptance criteria covered**: strict validation of all generated JSON
(weights=100, references resolve, unique ids, answer-type match).

**Commit**: `test(certifications): add strict certification data validator`

---

### Task 6: Author SnowPro Core certification `[M]`

**Goal**: Regenerate `snowpro-core` with real content from the PDF + parsed
transcript + extracted questions.

**Files**:

| File                                                      | Action | Description                     |
|-----------------------------------------------------------|--------|---------------------------------|
| `public/data/certifications/snowpro-core/config.json`     | modify | Real exam facts from PDF         |
| `public/data/certifications/snowpro-core/topics.json`     | modify | 6 official domains + subtopics/keyPoints from transcript |
| `public/data/certifications/snowpro-core/questions.json`  | modify | All extracted questions mapped to schema |

**Reuse**:

| File                                                 | What to reuse                              |
|------------------------------------------------------|--------------------------------------------|
| `study-materials/SnowPro Core CO3/exam_content/*.pdf`| Read directly for config + domain weights   |
| `.../exam_export/extracted-questions.json`           | Source questions (Task 4 output)            |
| `.../transcript_export/parsed-transcript.json`       | Source for subtopics + keyPoints            |
| `lib/types/certification.ts`                         | Target schema                               |

**Steps**:

1. From the PDF, set `config.json`: id `snowpro-core`, name, code `COF-C03`,
   duration, questionCount, passingScore, scoreRange, difficulty, officialUrl,
   `lastUpdated`.
2. Author `topics.json`: official domains with weights summing to 100; each
   with subtopics + `keyPoints` distilled from the parsed transcript.
3. Author `questions.json`: map each extracted question to the schema —
   `options` with stable ids, `correctAnswer` (string or string[] per type),
   `explanation.correct` + `explanation.whyOthersWrong` (from feedbacks/overall
   explanation), assign `topicId`/`subtopicId`, `difficulty`, `tags`,
   `metadata` (`source`). Rephrase copyrighted text as needed per spec.
4. Run the Task 5 validator against `snowpro-core`.

**Tests**:

- `npm run test:run` — the certification-data test must pass for `snowpro-core`.

**Acceptance criteria covered**: `snowpro-core` regenerated with real content;
validates against schema.

**Commit**: `feat(certifications): author SnowPro Core (COF-C03) content`

---

### Task 7: Author AWS Developer Associate certification `[M]`

**Goal**: Create the `aws-developer-associate` certification from its sources.

**Files**:

| File                                                                 | Action | Description |
|----------------------------------------------------------------------|--------|-------------|
| `public/data/certifications/aws-developer-associate/config.json`     | create | Exam facts (DVA-C02) |
| `public/data/certifications/aws-developer-associate/topics.json`     | create | Domains + subtopics/keyPoints |
| `public/data/certifications/aws-developer-associate/questions.json`  | create | All extracted questions mapped |

**Reuse**: same pattern/files as Task 6, under
`study-materials/AWS Developer Associate/`.

**Steps**: same authoring steps as Task 6, for DVA-C02. AWS exam-export files
populate overall `explanation` (not per-answer feedbacks) — derive
`explanation.correct` from it and best-effort `whyOthersWrong`.

**Tests**: `npm run test:run` — validator passes for `aws-developer-associate`.

**Acceptance criteria covered**: new AWS Developer cert with valid
config/topics/questions.

**Commit**: `feat(certifications): author AWS Developer Associate (DVA-C02) content`

---

### Task 8: Author AWS Data Engineer Associate certification `[M]`

**Goal**: Create the `aws-data-engineer-associate` certification from its
sources.

**Files**:

| File                                                                     | Action | Description |
|--------------------------------------------------------------------------|--------|-------------|
| `public/data/certifications/aws-data-engineer-associate/config.json`     | create | Exam facts (DEA-C01) |
| `public/data/certifications/aws-data-engineer-associate/topics.json`     | create | Domains + subtopics/keyPoints |
| `public/data/certifications/aws-data-engineer-associate/questions.json`  | create | All extracted questions mapped |

**Reuse**: same pattern as Task 6, under
`study-materials/AWS Data Engineer Associate/` (2 transcripts, 10 exam HTML
files).

**Steps**: same authoring steps as Task 6, for DEA-C01.

**Tests**: `npm run test:run` — validator passes for
`aws-data-engineer-associate`.

**Acceptance criteria covered**: new AWS Data Engineer cert with valid
config/topics/questions.

**Commit**: `feat(certifications): author AWS Data Engineer Associate (DEA-C01) content`

---

### Task 9: Remove placeholders and rebuild the manifest `[S]`

**Goal**: Drop the placeholder certs and make `index.json` list exactly the
three real certifications.

**Files**:

| File                                             | Action | Description                              |
|--------------------------------------------------|--------|------------------------------------------|
| `public/data/certifications/aws-ml/`             | delete | Remove placeholder cert folder            |
| `public/data/certifications/index.json`          | modify | List the three real certs only            |

**Reuse**:

| File                                     | What to reuse                       |
|------------------------------------------|-------------------------------------|
| `public/data/certifications/index.json`  | Existing `CertificationSummary` shape |

**Steps**:

1. Delete the `aws-ml/` folder.
2. Rewrite `index.json` with three summaries: `snowpro-core`,
   `aws-developer-associate`, `aws-data-engineer-associate`.
3. Confirm no lingering placeholder content (old `snowpro-core` was overwritten
   in Task 6; no separate placeholder folder remains).

**Tests**:

- `npm run test:run` — validator iterates `index.json`; all three load and
  validate; no reference to `aws-ml`.

**Acceptance criteria covered**: `aws-ml` removed; `index.json` lists exactly
the three certs.

**Commit**: `feat(certifications): remove placeholders and rebuild manifest`

---

**Task ordering**:

- Tasks 1, 2, 3 build tooling (independent of each other; 3 finalizes
  `.gitignore` edits started in 1 and 2 — implementer may fold the `.gitignore`
  edits entirely into Task 3 to keep 1/2 focused on the scripts).
- Task 4 runs the scripts (needs 1, 2) → produces git-ignored outputs. It has
  no committed file changes; if the workflow forbids empty commits, fold Task 4
  into Task 5's or Task 6's verification rather than committing separately.
- Task 5 adds the validator/test (needs the schema; can be committed before
  data exists but will fail until data is authored — acceptable as a
  test-first gate, or run after Task 6+ if a green tree per commit is
  required).
- Tasks 6, 7, 8 author each cert (need Task 4 outputs; each validated by Task
  5's test).
- Task 9 cleans up and finalizes the manifest (after 6–8).

## Edge Cases & Error Handling

- HTML with no `__QUIZ_DATA__`: extractor logs a warning and skips (Task 1).
- `feedbacks` as `[]` vs array of empty strings: both treated as "no
  per-answer feedback" (Task 1); `whyOthersWrong` may be sparse but
  `explanation.correct` is always populated (Tasks 6–8).
- Duplicate questions across HTML files: deduped by normalized text (Task 1).
- Multi-select `correct` arrays: preserved and mapped to `string[]`
  `correctAnswer` (Tasks 1, 6–8).
- Transcript lecture with no body / "no transcript available": skipped
  cleanly (Task 2).
- PDF not programmatically parseable: expected — read manually during
  authoring, no script involved (Tasks 6–8).
- Copyrighted verbatim text: rephrase during authoring; keep raw material
  git-ignored (Tasks 6–8, Task 3).

## Verification

1. Run `node study-materials/extract-questions.mjs` and
   `node study-materials/parse-transcript.mjs` for all three exam folders;
   confirm `extracted-questions.json` and `parsed-transcript.json` exist with
   sensible counts.
2. `git check-ignore -v` confirms the two scripts are tracked and all raw
   material + outputs are ignored.
3. `npm run test:run` passes, including the new certification-data test, for
   all three certifications.
4. `npm run build` succeeds.
5. `public/data/certifications/` contains exactly `snowpro-core`,
   `aws-developer-associate`, `aws-data-engineer-associate`, and `index.json`;
   `aws-ml` is gone; `index.json` lists the three.

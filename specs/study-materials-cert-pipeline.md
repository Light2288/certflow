# Study-Materials Certification Pipeline

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Study-Materials Certification Pipeline                 |
| **Type**      | feature                                                |
| **Scope**     | study-materials/ tooling + public/data/certifications/ |
| **Created**   | 2026-07-14 10:35:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The project needs real, high-quality certification content for three exams —
**SnowPro Core (COF-C03)**, **AWS Certified Developer – Associate (DVA-C02)**,
and **AWS Certified Data Engineer – Associate (DEA-C01)** — to replace the
current placeholder certifications (`aws-ml`, old `snowpro-core`).

Raw source material has been collected under `study-materials/<Exam>/` in three
subfolders per exam:

1. `exam_content/` — a single vendor PDF (the official exam/study guide).
2. `transcript_export/` — one or more `.txt` transcripts of Udemy courses.
3. `exam_export/` — one or more `.html` files (Udemy quiz exports) containing
   example questions, correct/wrong answers, and per-answer or overall
   explanations.

All of this material is copyrighted and must remain git-ignored. We need a
repeatable, largely deterministic way to turn it into the app's
`config.json` / `topics.json` / `questions.json` files, keeping the
extraction tooling and its outputs inside the git-ignored `study-materials/`
area, while only the final generated certification JSON is committed under
`public/data/certifications/`.

## Desired Outcome

A small set of extraction/parsing scripts lives under `study-materials/`
(git-ignored), each writing its output back into the **same exam folder**
using a **common, predictable filename** across all three exams. Those
pre-worked outputs are what gets handed to the assistant to author the final
per-certification JSON.

After the pipeline runs and the assistant authors the JSON, the repo contains
three fully-populated certifications under `public/data/certifications/`
(SnowPro Core, AWS Developer Associate, AWS Data Engineer Associate), the two
placeholder folders are gone, and `index.json` lists exactly the three new
certifications.

### Analysis of each source and chosen approach

Determinism differs per source, so tooling differs per source:

- **`exam_export/*.html` — fully deterministic → SCRIPT.**
  Verified across all five sampled files (395 questions): every file embeds a
  single `window.__QUIZ_DATA__ = { title, index, questions: [...] }` JSON
  payload inside a `<script>` tag, using one uniform schema. Per question:
  `type` (`"multiple-choice"` | `"multi-select"`), `question` (HTML), `answers`
  (string[] of HTML), `correct` (**0-based** index array — always non-empty,
  in-bounds; length 1 for multiple-choice, >1 for multi-select), `feedbacks`
  (per-answer, parallel to `answers`), and `explanation` (overall). A script
  can deterministically extract question text, options, correct option(s), and
  rationale for every file. Content convention varies by exporter (SnowPro
  populates per-answer `feedbacks` with `explanation` empty; AWS files populate
  overall `explanation` with `feedbacks` empty) — the script must tolerate
  both and normalize them.

- **`transcript_export/*.txt` — deterministic parse, AI authoring → SCRIPT + AI.**
  Structure is delimiter-based: `=== Section Name ===` for course sections,
  `--- Lecture Name ---` for lectures, followed by transcript lines
  interleaved with standalone integer caption-cue lines (`1`, `2`, ...). A
  script should deterministically parse this into clean, structured text
  (sections → lectures → prose, cue numbers stripped) because feeding the
  assistant clean structured transcript is far better than raw noise. The
  **final transformation of parsed transcript into `topics.json` topics /
  subtopics / keyPoints is done by AI authoring** (by the assistant), not by
  the script — the script only prepares the input.

- **`exam_content/*.pdf` — NOT deterministic → NO SCRIPT.**
  Each vendor's PDF (Snowflake vs AWS) has a different layout, so a single
  reliable parser is not feasible. The PDF is read directly by the assistant
  to establish `config.json` fields (exam name, code, duration, question
  count, passing score, domains) and the top-level domain/weight structure for
  `topics.json`.

### Script outputs (common filenames, written into each exam folder)

Each script writes into the same `study-materials/<Exam>/` subtree using
filenames identical across all three exams, so the user can hand them over
uniformly:

- Question extractor → e.g. `exam_export/extracted-questions.json`
  (one normalized array aggregating **all** questions from all HTML files in
  that folder, deduplicated; see Out of Scope for the number cap).
- Transcript parser → e.g. `transcript_export/parsed-transcript.json`
  (and/or a cleaned `.txt`), one per source transcript or one aggregated file.

(Exact filenames to be finalized in implementation, but they must be constant
across the three exam folders.)

### Final authoring step (assistant, not scripts)

Using the pre-worked outputs (`extracted-questions.json`,
`parsed-transcript.json`) plus direct reading of the `exam_content` PDF, the
**assistant** authors, for each of the three certifications:

- `config.json` — from PDF (+ known exam facts).
- `topics.json` — domains/weights from PDF; subtopics + `keyPoints` from the
  parsed transcripts (AI authoring).
- `questions.json` — from the extracted questions, mapped to the app schema
  (`options` with ids, `correctAnswer`, `explanation.correct` +
  `explanation.whyOthersWrong`, `topicId`/`subtopicId`, `difficulty`, `tags`,
  `metadata`).

### App capability findings (referenced during authoring)

- **"Explain why correct/wrong" is already supported.** The schema
  (`lib/types/certification.ts`) has
  `explanation: { correct: string, whyOthersWrong: Record<optionId,string> }`,
  and `app/simulator/components/AnswerReview.tsx` already renders both the
  correct-answer explanation and each wrong-option explanation. The exam HTML's
  per-answer `feedbacks` / overall `explanation` map directly onto this. No app
  change is required to support it.
- **Topic depth is two levels.** The schema models `Topic → Subtopic` with a
  `keyPoints: string[]`. There is no deeper nesting. The rich, lecture-level
  detail from transcripts must therefore be compressed into subtopics +
  keyPoints; the transcript's per-lecture granularity cannot be represented
  one-to-one. Whether the app should support deeper topic nesting to preserve
  course-level detail is called out as an open question (see Notes), not
  implemented here.

## Acceptance Criteria

- [ ] A deterministic question-extraction script exists under
      `study-materials/`, parses `window.__QUIZ_DATA__` from every
      `exam_export/*.html` file, and writes a normalized aggregated
      `extracted-questions.json` (common filename) into each exam's
      `exam_export/` folder, including question text, options, correct
      option index(es), and rationale (per-answer feedback and/or overall
      explanation), with HTML tags stripped.
- [ ] The extractor correctly handles both exporter conventions (per-answer
      `feedbacks` populated vs. overall `explanation` populated) and both
      question types (`multiple-choice`, `multi-select`).
- [ ] A transcript-parsing script exists under `study-materials/`, parses the
      `=== Section ===` / `--- Lecture ---` / cue-number structure, strips
      caption cue numbers, and writes clean structured output (common
      filename) into each exam's `transcript_export/` folder.
- [ ] All scripts and all of their outputs remain git-ignored (nothing under
      `study-materials/` except explicitly whitelisted script files is
      committed); `.gitignore` is updated to whitelist the new scripts and
      drop the stale `split-transcript.mjs` exception.
- [ ] The scripts are applied to all three exam folders, producing the
      pre-worked outputs described above.
- [ ] `public/data/certifications/snowpro-core/` is regenerated with real
      extracted/authored content (placeholder content removed).
- [ ] New `public/data/certifications/` folders exist for AWS Developer
      Associate and AWS Data Engineer Associate, each with valid
      `config.json`, `topics.json`, `questions.json`.
- [ ] The old placeholder `public/data/certifications/aws-ml/` folder is
      removed.
- [ ] `public/data/certifications/index.json` lists exactly the three new
      certifications and no placeholders.
- [ ] All generated JSON validates against the loader/schema
      (`lib/loaders/certification-loader.ts`, `lib/types/certification.ts`):
      topic weights sum to 100, every question's `topicId`/`subtopicId`/
      `correctAnswer` references resolve, ids are unique, and `correctAnswer`
      type matches `type`.

## Edge Cases & Error Handling

- HTML file with no `__QUIZ_DATA__`: the extractor should skip it with a clear
  warning rather than fail the whole run.
- `feedbacks` represented as an empty array vs. an array of empty strings:
  both must be treated as "no per-answer feedback".
- Question with only an overall `explanation` and no per-answer feedback:
  `whyOthersWrong` may end up sparse; the correct-answer explanation must still
  be populated.
- Duplicate questions across multiple HTML files in the same exam: dedupe.
- Transcript lecture with no body / "no transcript available" style markers:
  skip cleanly.
- Multi-select `correct` arrays: preserve all correct indices; map to the
  `string[]` form of `correctAnswer`.
- PDF that cannot be parsed programmatically: expected — read manually, no
  script failure.

## Dependencies & Constraints

- Scripts should be plain Node ESM (`.mjs`), zero or minimal dependencies,
  consistent with the previous `split-transcript.mjs` approach.
- Copyright: exam questions and transcripts are copyrighted; raw material and
  script outputs stay git-ignored. Final committed questions may need to be
  original/rephrased rather than verbatim copies — confirm at authoring time.
- Must conform to the existing certification schema in
  `lib/types/certification.ts` and pass `lib/loaders/certification-loader.ts`
  validation. No schema changes are made by this spec.
- Exam facts (duration, question count, passing score, domain weights) come
  from the `exam_content` PDFs and official vendor guides.

## Out of Scope

- Changing the app's certification schema or UI (including any deeper topic
  nesting) — noted as an open question only.
- Building a PDF parser for `exam_content`.
- Committing any raw study material or script output to git.
- An automated end-to-end "one command builds all three certs" pipeline; the
  final JSON authoring is an assistant-driven step, not a script.

## Notes

- Source layout (verified):
  - `study-materials/SnowPro Core CO3/` — PDF study guide; 2 transcripts;
    5 exam HTML files (~100 questions each).
  - `study-materials/AWS Developer Associate/` — DVA-C02 PDF; 1 transcript;
    6 exam HTML files (~65 questions each).
  - `study-materials/AWS Data Engineer Associate/` — DEA-C01 PDF; 2
    transcripts; 10 exam HTML files (~65 questions each).
- Target certification ids (proposed): `snowpro-core`, `aws-developer-associate`,
  `aws-data-engineer-associate`.
- **Question count decision:** include **all** extracted questions per
  certification (deduplicated), not capped at the real exam length.
- **Open question:** the app currently models only Topic → Subtopic → keyPoints
  (two levels). The transcripts contain far richer, lecture-level detail. Should
  the app/schema be extended to preserve that depth, or is compression into
  subtopics + keyPoints acceptable? Deferred; not implemented here.
- The previous `split-transcript.mjs` (which parsed a `##`/`###` markdown
  transcript format) has been removed; the new transcript parser must target
  the `=== / ---` delimiter format found in the current `transcript_export`
  files, which is different.

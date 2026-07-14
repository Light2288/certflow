#!/usr/bin/env node
// @ts-check
/*
 * extract-questions.mjs
 * ---------------------
 * Deterministically extracts every question from the Udemy quiz-export HTML
 * files in an exam folder's `exam_export/` subfolder, and writes a single
 * normalized, deduplicated `extracted-questions.json` back into that folder.
 *
 * Each HTML file embeds a `window.__QUIZ_DATA__ = { title, index, questions }`
 * JSON payload inside a <script> tag. Per question:
 *   - type: "multiple-choice" | "multi-select"
 *   - question: HTML string
 *   - answers: string[] (HTML)
 *   - correct: number[] (0-based indices into answers)
 *   - feedbacks: string[] (per-answer rationale, parallel to answers)
 *   - explanation: string (overall rationale)
 *
 * Exporter conventions differ:
 *   - Some populate per-answer `feedbacks` and leave `explanation` empty.
 *   - Some populate the overall `explanation` and leave `feedbacks` empty
 *     (either an empty array or an array of empty strings).
 * Both are normalized here.
 *
 * Output (constant filename across all exam folders):
 *   <exam-folder>/exam_export/extracted-questions.json
 *
 * Usage:
 *   node study-materials/extract-questions.mjs "<exam-folder>"
 *   e.g. node study-materials/extract-questions.mjs "study-materials/SnowPro Core CO3"
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_NAME = "extracted-questions.json";

/* ------------------------------------------------------------------ *
 * Text cleaning
 * ------------------------------------------------------------------ */

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Strip HTML tags and decode common entities, collapse whitespace. */
function clean(text) {
  return String(text ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ *
 * __QUIZ_DATA__ extraction (string-aware balanced-brace scan)
 * ------------------------------------------------------------------ */

/** Extract the JSON object assigned to window.__QUIZ_DATA__, or null. */
function extractQuizData(html) {
  const marker = "window.__QUIZ_DATA__=";
  const mi = html.indexOf(marker);
  if (mi === -1) return null;

  const start = html.indexOf("{", mi);
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Normalization
 * ------------------------------------------------------------------ */

const LETTERS = "abcdefghij".split("");

/** Normalize one raw quiz question into our intermediate shape. */
function normalizeQuestion(raw, sourceFile) {
  const type = raw.type === "multi-select" ? "multi-select" : "multiple-choice";
  const answers = Array.isArray(raw.answers) ? raw.answers : [];
  const options = answers.map((a, i) => ({ id: LETTERS[i], text: clean(a) }));

  const correctIdx = Array.isArray(raw.correct) ? raw.correct : [];
  const correctIds = correctIdx
    .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length)
    .map((n) => LETTERS[n]);

  // Per-answer feedback: treat empty array or array of empty strings as none.
  const feedbacksRaw = Array.isArray(raw.feedbacks) ? raw.feedbacks : [];
  const feedbacks = {};
  feedbacksRaw.forEach((fb, i) => {
    const text = clean(fb);
    if (text && options[i]) feedbacks[options[i].id] = text;
  });

  return {
    type,
    question: clean(raw.question),
    options,
    correctAnswer: type === "multiple-choice" ? correctIds[0] ?? null : correctIds,
    feedbacks, // optionId -> per-answer rationale (may be {})
    explanation: clean(raw.explanation), // overall rationale (may be "")
    source: sourceFile,
  };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const [, , examFolder] = process.argv;
  if (!examFolder) {
    console.error(
      'Usage: node study-materials/extract-questions.mjs "<exam-folder>"',
    );
    process.exit(1);
  }

  const dir = join(examFolder, "exam_export");
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    console.error(`No exam_export/ folder in: ${examFolder}`);
    process.exit(1);
  }

  const htmlFiles = entries.filter((f) => f.toLowerCase().endsWith(".html")).sort();
  if (htmlFiles.length === 0) {
    console.error(`No .html files in: ${dir}`);
    process.exit(1);
  }

  const all = [];
  let parsed = 0;
  let skipped = 0;

  for (const file of htmlFiles) {
    const html = await readFile(join(dir, file), "utf8");
    const data = extractQuizData(html);
    if (!data || !Array.isArray(data.questions)) {
      console.warn(`  [skip] no __QUIZ_DATA__: ${file}`);
      skipped++;
      continue;
    }
    parsed++;
    for (const q of data.questions) {
      all.push(normalizeQuestion(q, file));
    }
  }

  // Dedupe by normalized question text (case-insensitive).
  const seen = new Set();
  const deduped = [];
  for (const q of all) {
    const key = q.question.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
  }

  const outPath = join(dir, OUTPUT_NAME);
  await writeFile(
    outPath,
    JSON.stringify({ questions: deduped }, null, 2) + "\n",
    "utf8",
  );

  const multi = deduped.filter((q) => q.type === "multi-select").length;
  console.log(
    `Parsed ${parsed} file(s), skipped ${skipped}. ` +
      `Questions: ${all.length} raw -> ${deduped.length} deduped ` +
      `(${multi} multi-select).`,
  );
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

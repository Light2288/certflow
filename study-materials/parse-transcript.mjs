#!/usr/bin/env node
// @ts-check
/*
 * parse-transcript.mjs
 * --------------------
 * Deterministically parses the Udemy course transcript .txt files in an exam
 * folder's `transcript_export/` subfolder into clean, structured JSON that is
 * easy for downstream (AI) authoring of topics.json.
 *
 * Input format (per .txt file):
 *   === Section Name ===
 *   --- Lecture Name ---
 *   1
 *   transcript line
 *   2
 *   transcript line
 *   ...
 *
 * Standalone integer lines are Udemy caption cue numbers and are stripped.
 *
 * Output (constant filename across all exam folders):
 *   <exam-folder>/transcript_export/parsed-transcript.json
 *   -> { transcripts: [ { file, lectures: [ { section, lecture, text } ] } ] }
 *
 * Usage:
 *   node study-materials/parse-transcript.mjs "<exam-folder>"
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUTPUT_NAME = "parsed-transcript.json";

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decode(text) {
  return text.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g,
    (m) => ENTITIES[m] ?? m,
  );
}

const SECTION_RE = /^===\s*(.*?)\s*===$/;
const LECTURE_RE = /^---\s*(.*?)\s*---$/;

/**
 * Parse one transcript file into an ordered list of lectures.
 * @returns {{ section: string, lecture: string, text: string }[]}
 */
function parseFile(raw) {
  const lines = raw.split(/\r?\n/);
  const lectures = [];
  let currentSection = "Introduction";
  let current = null; // { section, lecture, body: string[] }

  const flush = () => {
    if (!current) return;
    const text = cleanBody(current.body);
    if (text) {
      lectures.push({
        section: current.section,
        lecture: current.lecture,
        text,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const s = line.trim();
    const secM = s.match(SECTION_RE);
    if (secM) {
      flush();
      currentSection = secM[1] || currentSection;
      continue;
    }
    const lecM = s.match(LECTURE_RE);
    if (lecM) {
      flush();
      current = { section: currentSection, lecture: lecM[1], body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  flush();
  return lectures;
}

/** Strip cue-number-only lines, decode entities, join to prose. */
function cleanBody(rawLines) {
  const out = [];
  for (const raw of rawLines) {
    const t = raw.trim();
    if (t === "") continue;
    if (/^\d+$/.test(t)) continue; // caption cue number
    out.push(decode(t));
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

async function main() {
  const [, , examFolder] = process.argv;
  if (!examFolder) {
    console.error(
      'Usage: node study-materials/parse-transcript.mjs "<exam-folder>"',
    );
    process.exit(1);
  }

  const dir = join(examFolder, "transcript_export");
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    console.error(`No transcript_export/ folder in: ${examFolder}`);
    process.exit(1);
  }

  const txtFiles = entries.filter((f) => f.toLowerCase().endsWith(".txt")).sort();
  if (txtFiles.length === 0) {
    console.error(`No .txt files in: ${dir}`);
    process.exit(1);
  }

  const transcripts = [];
  let totalLectures = 0;

  for (const file of txtFiles) {
    const raw = await readFile(join(dir, file), "utf8");
    const lectures = parseFile(raw);
    totalLectures += lectures.length;
    transcripts.push({ file, lectures });
  }

  const outPath = join(dir, OUTPUT_NAME);
  await writeFile(
    outPath,
    JSON.stringify({ transcripts }, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `Parsed ${txtFiles.length} transcript(s), ${totalLectures} lectures with content.`,
  );
  console.log(`Output: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

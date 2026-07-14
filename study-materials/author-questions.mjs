#!/usr/bin/env node
// @ts-check
/*
 * author-questions.mjs
 * --------------------
 * Transforms an exam folder's extracted-questions.json (produced by
 * extract-questions.mjs) into a schema-valid questions.json for a
 * certification under public/data/certifications/<certId>/.
 *
 * Mapping to the app schema (lib/types/certification.ts):
 *   - id: sequential "<prefix>NNN"
 *   - options: [{ id, text }] (ids a,b,c,...) from extracted options
 *   - correctAnswer: string (multiple-choice) | string[] (multi-select)
 *   - explanation.correct: overall explanation, else the correct option's feedback,
 *       else a generated fallback naming the correct option(s)
 *   - explanation.whyOthersWrong: per-option feedback for the wrong options
 *   - topicId/subtopicId: assigned via keyword rules (first match), else fallback
 *   - difficulty: heuristic from question length + multi-select
 *   - tags: matched keyword buckets
 *   - metadata: createdAt/lastReviewed (today), source "udemy-practice-derived"
 *
 * Questions are only emitted if they can be mapped to a valid topic/subtopic
 * and have a usable correct answer + explanation; others are skipped and
 * reported so authoring stays strict.
 *
 * The keyword->subtopic mapping lives in mappings/<certId>.mjs so this script
 * is reusable across certifications.
 *
 * Usage:
 *   node study-materials/author-questions.mjs "<exam-folder>" <certId> <prefix>
 *   e.g. node study-materials/author-questions.mjs "study-materials/SnowPro Core CO3" snowpro-core sp
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LETTERS = "abcdefghij".split("");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function difficultyFor(q) {
  if (q.type === "multi-select") return "hard";
  const len = (q.question || "").length;
  if (len > 320) return "hard";
  if (len > 160) return "medium";
  return "easy";
}

async function main() {
  const [, , examFolder, certId, prefix] = process.argv;
  if (!examFolder || !certId || !prefix) {
    console.error(
      'Usage: node study-materials/author-questions.mjs "<exam-folder>" <certId> <prefix>',
    );
    process.exit(1);
  }

  const extracted = JSON.parse(
    await readFile(join(examFolder, "exam_export", "extracted-questions.json"), "utf8"),
  );

  // Load the cert-specific keyword->subtopic mapping.
  const mapPath = pathToFileURL(join(__dirname, "mappings", `${certId}.mjs`)).href;
  const { assign, fallback, tagsFor } = await import(mapPath);

  const out = [];
  let n = 0;
  let skipped = 0;
  const skipReasons = {};

  for (const q of extracted.questions) {
    // Must have a usable correct answer.
    const hasCorrect =
      q.type === "multiple-choice"
        ? typeof q.correctAnswer === "string" && q.correctAnswer
        : Array.isArray(q.correctAnswer) && q.correctAnswer.length > 0;
    if (!hasCorrect || !q.options || q.options.length < 2) {
      skipped++;
      skipReasons.noAnswer = (skipReasons.noAnswer || 0) + 1;
      continue;
    }

    // Build explanation.
    const correctIds =
      q.type === "multiple-choice" ? [q.correctAnswer] : q.correctAnswer;
    const feedbacks = q.feedbacks || {};
    let correctExpl = q.explanation || "";
    if (!correctExpl) {
      correctExpl = correctIds.map((id) => feedbacks[id]).filter(Boolean).join(" ");
    }
    if (!correctExpl) {
      const labels = correctIds.map((id) => id.toUpperCase()).join(", ");
      const texts = correctIds
        .map((id) => q.options.find((o) => o.id === id)?.text)
        .filter(Boolean)
        .join("; ");
      correctExpl = `The correct answer is ${labels}: ${texts}.`;
    }

    const whyOthersWrong = {};
    for (const opt of q.options) {
      if (correctIds.includes(opt.id)) continue;
      if (feedbacks[opt.id]) whyOthersWrong[opt.id] = feedbacks[opt.id];
    }

    // Assign topic/subtopic.
    const ref = assign(q) || fallback(q);
    if (!ref) {
      skipped++;
      skipReasons.noTopic = (skipReasons.noTopic || 0) + 1;
      continue;
    }

    n++;
    out.push({
      id: `${prefix}${String(n).padStart(3, "0")}`,
      topicId: ref.topicId,
      subtopicId: ref.subtopicId,
      type: q.type,
      difficulty: difficultyFor(q),
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: { correct: correctExpl, whyOthersWrong },
      tags: tagsFor ? tagsFor(q) : [],
      metadata: {
        createdAt: today(),
        lastReviewed: today(),
        source: "udemy-practice-derived",
      },
    });
  }

  const outPath = join(
    __dirname,
    "..",
    "public",
    "data",
    "certifications",
    certId,
    "questions.json",
  );
  await writeFile(outPath, JSON.stringify({ questions: out }, null, 2) + "\n", "utf8");

  console.log(
    `Authored ${out.length} questions -> ${outPath} (skipped ${skipped}: ${JSON.stringify(skipReasons)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

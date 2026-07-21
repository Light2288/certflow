#!/usr/bin/env node
// @ts-check
/*
 * author-topics.mjs
 * -----------------
 * Enriches an existing schema-valid topics.json for a certification under
 * public/data/certifications/<certId>/ with the optional per-subtopic study
 * fields defined in lib/types/certification.ts:
 *
 *   - content: string                 (markdown explanation / study note)
 *   - references: string[]            (external doc/links)
 *   - difficulty: easy | medium | hard
 *   - estimatedStudyMinutes: number
 *
 * The tool NEVER changes topic ids, subtopic ids, weights, order, name,
 * description, or keyPoints. It only merges in the optional study fields, so
 * the strict data test (lib/loaders/__tests__/certification-data.test.ts) —
 * which requires weights to sum to 100 and all question references to resolve —
 * keeps passing.
 *
 * The per-cert enrichment lives in mappings/<certId>.mjs as an OPTIONAL export:
 *
 *   export function enrichSubtopic(topic, subtopic) {
 *     // return a partial object with any of the optional fields, e.g.
 *     return { difficulty: "medium", estimatedStudyMinutes: 45, ... };
 *   }
 *
 * This mirrors how author-questions.mjs imports assign/fallback/tagsFor. If the
 * mapping module has no enrichSubtopic export, the tool is a no-op that simply
 * re-formats topics.json (useful as a scaffold check).
 *
 * Fields already present on a subtopic are preserved unless the enrichment
 * explicitly returns a new value for that field.
 *
 * Usage:
 *   node study-materials/author-topics.mjs <certId>
 *   e.g. node study-materials/author-topics.mjs snowpro-core
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OPTIONAL_FIELDS = [
  "content",
  "references",
  "difficulty",
  "estimatedStudyMinutes",
];

async function main() {
  const [, , certId] = process.argv;
  if (!certId) {
    console.error("Usage: node study-materials/author-topics.mjs <certId>");
    process.exit(1);
  }

  const topicsPath = join(
    __dirname,
    "..",
    "public",
    "data",
    "certifications",
    certId,
    "topics.json",
  );

  const topicsData = JSON.parse(await readFile(topicsPath, "utf8"));

  // Load the cert-specific enrichment map (optional export).
  const mapPath = pathToFileURL(
    join(__dirname, "mappings", `${certId}.mjs`),
  ).href;
  let enrichSubtopic;
  try {
    ({ enrichSubtopic } = await import(mapPath));
  } catch {
    // No mapping module for this cert; proceed as a no-op re-format.
    enrichSubtopic = undefined;
  }

  let enrichedCount = 0;

  for (const topic of topicsData.topics) {
    for (const subtopic of topic.subtopics) {
      if (typeof enrichSubtopic !== "function") continue;

      const partial = enrichSubtopic(topic, subtopic) || {};
      let touched = false;
      for (const field of OPTIONAL_FIELDS) {
        if (partial[field] !== undefined) {
          subtopic[field] = partial[field];
          touched = true;
        }
      }
      if (touched) enrichedCount++;
    }
  }

  await writeFile(
    topicsPath,
    JSON.stringify(topicsData, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `Enriched ${enrichedCount} subtopic(s) -> ${topicsPath}` +
      (typeof enrichSubtopic === "function"
        ? ""
        : " (no enrichSubtopic export found; re-formatted only)"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

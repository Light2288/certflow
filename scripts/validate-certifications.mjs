#!/usr/bin/env node
// @ts-check
/*
 * validate-certifications.mjs
 * ---------------------------
 * Standalone CLI that validates every certification listed in
 * public/data/certifications/index.json against the strict rules enforced by
 * lib/loaders/__tests__/certification-data.test.ts (weights sum to 100, all
 * topic/subtopic/answer references resolve, unique ids, correctAnswer type
 * matches question type, non-empty correct explanation).
 *
 * Exits non-zero if any certification fails.
 *
 * Usage: node scripts/validate-certifications.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.resolve(__dirname, "../public/data/certifications");

function readJson(...segments) {
  return JSON.parse(readFileSync(path.join(CERT_DIR, ...segments), "utf8"));
}

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const index = readJson("index.json");
const certIds = index.certifications.map((c) => c.id);

check(certIds.length > 0, "index.json lists no certifications");
check(!certIds.includes("aws-ml"), "index.json still references removed 'aws-ml'");

for (const id of certIds) {
  const base = `[${id}]`;
  for (const f of ["config.json", "topics.json", "questions.json"]) {
    check(existsSync(path.join(CERT_DIR, id, f)), `${base} missing ${f}`);
  }
  if (!existsSync(path.join(CERT_DIR, id, "config.json"))) continue;

  const config = readJson(id, "config.json");
  const topics = readJson(id, "topics.json");
  const questions = readJson(id, "questions.json");

  check(config.id === id, `${base} config.id "${config.id}" != folder "${id}"`);
  check(!!config.name && !!config.code, `${base} config missing name/code`);

  const totalWeight = topics.topics.reduce((s, t) => s + (t.weight || 0), 0);
  check(
    Math.abs(totalWeight - 100) <= 0.01,
    `${base} topic weights sum to ${totalWeight}, expected 100`,
  );

  const topicIds = topics.topics.map((t) => t.id);
  check(new Set(topicIds).size === topicIds.length, `${base} duplicate topic ids`);

  const refIndex = new Map();
  for (const t of topics.topics) {
    check(t.subtopics.length > 0, `${base} topic "${t.id}" has no subtopics`);
    const subIds = t.subtopics.map((s) => s.id);
    check(
      new Set(subIds).size === subIds.length,
      `${base} topic "${t.id}" duplicate subtopic ids`,
    );
    for (const s of t.subtopics) refIndex.set(`${t.id}::${s.id}`, true);
  }

  const qIds = questions.questions.map((q) => q.id);
  check(new Set(qIds).size === qIds.length, `${base} duplicate question ids`);

  for (const q of questions.questions) {
    const where = `${base} question "${q.id}"`;
    check(
      refIndex.has(`${q.topicId}::${q.subtopicId}`),
      `${where} references unknown topic/subtopic ${q.topicId}/${q.subtopicId}`,
    );
    const optionIds = (q.options || []).map((o) => o.id);
    if (q.type === "multiple-choice") {
      check(typeof q.correctAnswer === "string", `${where} correctAnswer must be string`);
      check(optionIds.includes(q.correctAnswer), `${where} correctAnswer not in options`);
    } else if (q.type === "multi-select") {
      check(Array.isArray(q.correctAnswer), `${where} correctAnswer must be array`);
      if (Array.isArray(q.correctAnswer)) {
        check(q.correctAnswer.length > 0, `${where} multi-select needs >=1 answer`);
        for (const a of q.correctAnswer) {
          check(optionIds.includes(a), `${where} correctAnswer "${a}" not in options`);
        }
      }
    } else {
      errors.push(`${where} invalid type "${q.type}"`);
    }
    check(
      q.explanation && q.explanation.correct && q.explanation.correct.trim().length > 0,
      `${where} missing explanation.correct`,
    );
  }
}

if (errors.length) {
  console.error(`Validation FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`Validation OK: ${certIds.length} certification(s) — ${certIds.join(", ")}`);

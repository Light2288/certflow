# Plan: AI Question Generation Service

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | AI Question Generation Service     |
| **Spec**     | specs/ai-question-generation.md    |
| **Type**     | feature                            |
| **Branch**   | feat/ai-question-generation        |
| **Created**  | 2026-06-29 00:00:00               |
| **Status**   | IMPLEMENTED                       |

## Context

CertFlow ships ~15 curated questions for `aws-ml`, too few for large or
narrowly-filtered quizzes. This adds a client-side `lib/ai/generator/` module
that generates questions on demand via the existing `AIService`, validates each
candidate through the Phase 8 `QuestionValidator`, blends curated + generated
pools via a `mix()` helper, and caches approved questions in `localStorage`.
Simulator UI wiring (Phase 10) is out of scope.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/ai-question-generation`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/ai-question-generation
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task below maps to exactly one commit.

## Build & Test Commands

> Note: this machine uses nvm — run `source ~/.nvm/nvm.sh && nvm use` before
> npm commands if the Node version is not already active.

| Action        | Command                  |
|---------------|--------------------------|
| Test (watch)  | `npm test`               |
| Test (run)    | `npm run test:run`       |
| Coverage      | `npm run test:coverage`  |
| Lint          | `npm run lint`           |
| Build         | `npm run build`          |

## Key findings from codebase exploration

These ground the tasks and resolve ambiguities before implementation:

- **Validator API (Phase 8, on disk)** — `lib/ai/validator/`:
  - `new QuestionValidator(aiService: AIService, thresholds?: ValidatorThresholds)`
  - `validate(question, topic, subtopic?): Promise<ValidationResult>`
  - `validateBatch(questions, topics: TopicsData, concurrency = 3): Promise<ValidationResult[]>`
  - `ValidationResult` has `{ questionId, score: ValidationScore, verdict:
    'approved'|'rejected'|'flagged', confidence, reasoning, issues }`.
  - Exports available from `@/lib/ai/validator` (index.ts): `QuestionValidator`,
    `ValidationResult`, `ValidationScore`, `ValidatorThresholds`,
    `ValidationVerdict`, `DEFAULT_VALIDATOR_THRESHOLDS`.
- **`QuestionMetadata`** (`lib/types/certification.ts`) is exactly
  `{ createdAt, lastReviewed, source }` — there is **no `validatorScore` field**.
  The spec asks to "stamp the validator score" onto kept questions. To honor the
  spec without mutating the shared `Question`/`QuestionMetadata` contract, the
  generator defines a local `GeneratedQuestion` type that extends `Question`
  with a non-breaking optional field carrying the score (e.g.
  `generationMeta?: { verdict; validatorScore: ValidationScore; confidence }`).
  `metadata.source` is set to `'ai-generated'` (the existing `source: string`
  field accepts this). This keeps `GeneratedQuestion` assignable to `Question`.
- **AIService** (`lib/ai/ai-service.ts`): `chat(message, history?, options?)`
  throws `AIServiceError` on failure; `getAIService()` returns the singleton.
- **Loader helpers** (`lib/loaders/certification-loader.ts`):
  `getQuestionsByTopic`, `getQuestionsByDifficulty`, `getRandomQuestions`,
  `validateQuestion` (rule-based schema check, reusable to reject malformed
  candidates before AI validation).
- **Test harness to reuse** (`lib/ai/validator/__tests__/fixtures.ts`):
  `CannedJsonProvider` (queued canned responses, throws on `Error` entries,
  tracks `maxInFlight`) and `makeServiceWithProvider(provider)`. The generator
  tests will reuse this pattern (a generator-specific fixtures file).
- **localStorage pattern**: `lib/settings/settings-storage.ts` shows the
  project convention (typed key, JSON serialize, try/catch with graceful
  fallback, `typeof window` guard). `question-store.ts` follows the same shape.
- Tests run on happy-dom (localStorage available); never hit a real network.

## Tasks

### Task 1: Generator types `[S]`

**Goal**: Define the public type contract for the generator module.

**Files**:

| File                            | Action | Description                          |
|---------------------------------|--------|--------------------------------------|
| `lib/ai/generator/types.ts`     | create | `GenerationRequest`, `GenerationResult`, `GeneratedQuestion` |

**Reuse**:

| File                              | What to reuse                          |
|-----------------------------------|----------------------------------------|
| `lib/types/certification.ts`      | `Question`, `Topic`, `Subtopic`, `DifficultyLevel` |
| `lib/ai/validator/types.ts`       | `ValidationScore`, `ValidationVerdict` |

**Steps**:

1. Define `GenerationRequest { topic: Topic; subtopic?: Subtopic; difficulty:
   DifficultyLevel; count: number; existingQuestionIds: string[] }`.
2. Define `GeneratedQuestion extends Question` adding a non-breaking optional
   `generationMeta?: { verdict: ValidationVerdict; validatorScore:
   ValidationScore; confidence: number }`. Keep it assignable to `Question`.
3. Define `GenerationResult { generated: GeneratedQuestion[]; rejected:
   Array<{ raw: unknown; reason: string }>; stats: { requested: number;
   produced: number; approved: number; flagged: number; rejected: number } }`.
4. Document that `difficulty` is a single value (mixed batches = multiple
   requests).

**Tests**: No standalone test (types only); exercised via Tasks 3–4.

**Acceptance criteria covered**: Establishes the shapes behind all criteria;
directly supports the "validator score recorded" and `stats` criteria.

**Commit**: `feat(generator): add question generation type contract`

---

### Task 2: Generator prompts `[M]`

**Goal**: Build the system + user prompts that elicit JSON-only candidate
questions matching the `Question` schema, grounded in topic context.

**Files**:

| File                            | Action | Description                          |
|---------------------------------|--------|--------------------------------------|
| `lib/ai/generator/prompts.ts`   | create | System prompt, user-prompt builder, strict-JSON retry instruction, few-shot example |

**Reuse**:

| File                                                        | What to reuse                         |
|-------------------------------------------------------------|---------------------------------------|
| `lib/ai/validator/prompts.ts`                               | Prompt structure, `STRICT_JSON_RETRY_INSTRUCTION` style, code-fence-free JSON demand |
| `public/data/certifications/aws-ml/questions.json`          | A real question for the few-shot example |
| `lib/types/certification.ts`                                | Exact `Question` field names for the schema spec in the prompt |

**Steps**:

1. Export `GENERATOR_SYSTEM_PROMPT` framing the model as an exam-question
   author; require a JSON array of question objects, NOTHING else (no prose, no
   code fences), matching the `Question` schema: `topicId`, `subtopicId`,
   `type` (`'multiple-choice'|'multi-select'`), `difficulty`, `question`,
   `options` (`{id,text}` with ≥2 entries), `correctAnswer` (string for single,
   array for multi-select, referencing option ids), `explanation.correct`,
   `explanation.whyOthersWrong` (`Record<optionId,string>`), optional `tags`.
   Instruct the model to **omit `id` and `metadata`** (the generator stamps
   those).
2. Export `buildGenerationPrompt(request: GenerationRequest)` injecting topic
   name/description/keyPoints, subtopic context when present, the requested
   `difficulty` and `count`, and a short few-shot example derived from a real
   `aws-ml` question. Reference `existingQuestionIds` only as "avoid repeating
   these themes" context (dedup is enforced in code, not trusted to the model).
3. Export `STRICT_JSON_RETRY_INSTRUCTION` for malformed-output retries.

**Tests** (`lib/ai/generator/__tests__/prompts.test.ts`):

- `buildGenerationPrompt` includes topic name, difficulty, and count.
- Includes subtopic key points when a subtopic is provided; omits gracefully
  when not.
- System prompt demands JSON-only output and lists required schema fields.

**Acceptance criteria covered**: Supports "honours requested count, difficulty,
and topic"; underpins schema-correct candidate parsing.

**Commit**: `feat(generator): add question generation prompts`

---

### Task 3: Question store (localStorage cache) `[M]`

**Goal**: Per-certification localStorage cache of approved generated questions.

**Files**:

| File                                   | Action | Description                        |
|----------------------------------------|--------|------------------------------------|
| `lib/ai/generator/question-store.ts`   | create | `getApproved`, `addApproved`, `clear` |

**Reuse**:

| File                                  | What to reuse                                 |
|---------------------------------------|-----------------------------------------------|
| `lib/settings/settings-storage.ts`    | localStorage convention: key prefix, JSON serialize, `typeof window` guard, try/catch fallback |
| `lib/loaders/certification-loader.ts` | `validateQuestion` for schema validation on read/write |

**Steps**:

1. Define a key builder, e.g. `certflow:generated-questions:<certId>`.
2. `getApproved(certId): GeneratedQuestion[]` — read + JSON.parse; on missing,
   corrupt, or schema-invalid entry, return `[]` (use `validateQuestion` to
   drop bad entries defensively). Guard `typeof window === 'undefined'`.
3. `addApproved(certId, questions): void` — merge with existing by `id`
   (dedupe), write back; swallow write errors gracefully (no throw).
4. `clear(certId): void` — remove only that cert's key.
5. Keep cache unbounded (no eviction); add a code comment noting eviction is a
   documented future concern.

**Tests** (`lib/ai/generator/__tests__/question-store.test.ts`):

- Round-trip: `addApproved` then `getApproved` returns the questions.
- Multi-cert isolation: writing cert A does not affect cert B; `clear(A)`
  leaves B intact.
- Corrupt entry → `getApproved` returns `[]`.
- Schema-invalid stored item is dropped on read.
- `clearLocalStorage` between tests (vitest `beforeEach`).

**Acceptance criteria covered**: "Approved questions persist across reloads …
keyed by cert id and isolated"; "`clear(certId)` removes only that cert".

**Commit**: `feat(generator): add localStorage cache for approved questions`

---

### Task 4: Question generator service `[M]`

**Goal**: The `QuestionGenerator` class — call AI, parse candidates, validate,
stamp metadata, dedupe, return `GenerationResult`.

**Files**:

| File                                       | Action | Description                  |
|--------------------------------------------|--------|------------------------------|
| `lib/ai/generator/question-generator.ts`   | create | `QuestionGenerator` with `generate()` |

**Reuse**:

| File                                  | What to reuse                                       |
|---------------------------------------|-----------------------------------------------------|
| `lib/ai/validator/question-validator.ts` | `QuestionValidator.validate(question, topic, subtopic?)` — call exactly as exported |
| `lib/ai/ai-service.ts`                | `AIService.chat()`                                  |
| `lib/loaders/certification-loader.ts` | `validateQuestion` to reject malformed candidates pre-validation |
| `lib/ai/validator/question-validator.ts` (private `extractJson` approach) | JSON extraction strategy (re-implement locally for arrays) |

**Steps**:

1. `constructor(aiService: AIService, validator: QuestionValidator)`.
2. `generate(request): Promise<GenerationResult>`:
   - Build the user prompt (Task 2) + system message; call `aiService.chat()`
     inside a try/catch. On a caught `AIServiceError`, return the empty
     `GenerationResult` (`generated: []`, all `stats` zero except `requested`)
     with `error` populated — see "Open implementation decision" below.
   - Parse the JSON array; isolate array from prose/code fences.
   - For each raw candidate: run `validateQuestion`-style schema check; if it
     fails, push to `rejected` with a reason and continue.
   - Stamp `id = gen_<Date.now()>_<idx>`, `metadata = { createdAt: ISO,
     lastReviewed: ISO, source: 'ai-generated' }`, `difficulty` from request.
   - Run `validator.validate(candidate, request.topic, request.subtopic)`.
     Drop `rejected` verdicts (push to `rejected[]` with reason); keep
     `approved` and `flagged`, attaching `generationMeta` (verdict, score,
     confidence).
   - Enforce dedup: skip candidates whose `id` is in `existingQuestionIds`
     (note: generated ids are unique by construction, so this primarily guards
     against re-generating provided ids) and drop near-duplicate question text
     via a normalized-text similarity heuristic (Task 5 provides the helper).
   - Accumulate `stats` and return.

**Tests** (`lib/ai/generator/__tests__/question-generator.test.ts`):

- Mock `AIService` via reused `CannedJsonProvider` returning a canned JSON
  array of candidates; verify generated questions get `gen_…` ids,
  `source: 'ai-generated'`, and `generationMeta`.
- Validator integration: candidates that validate `rejected` are excluded;
  `approved` + `flagged` kept; `stats` counts correct.
- Malformed JSON for a candidate → recorded in `rejected`, others still
  processed.
- Total AI failure (provider throws `AIServiceError`) → empty `generated`,
  zero `stats`, error surfaced per agreed contract.
- Dedup against `existingQuestionIds`.

**Acceptance criteria covered**: count/difficulty/topic honoured; id/metadata/
score stamping; rejected dropped & approved/flagged kept; dedup vs
`existingQuestionIds`; AI-failure empty-result + error surfacing.

**Commit**: `feat(generator): add QuestionGenerator service`

---

### Task 5: Mix + dedup helpers `[S]`

**Goal**: Deterministic `mix()` blend and the near-duplicate text heuristic.

**Files**:

| File                                       | Action | Description                  |
|--------------------------------------------|--------|------------------------------|
| `lib/ai/generator/question-generator.ts`   | modify | Add `mix()` method + near-duplicate helper (consumed by Task 4) |

**Reuse**:

| File                                  | What to reuse                       |
|---------------------------------------|-------------------------------------|
| `lib/loaders/certification-loader.ts` | Shuffle approach in `getRandomQuestions` (replace `Math.random` with a seeded PRNG for determinism) |

**Steps**:

1. `mix(seed: Question[], generated: Question[], ratio = 0.3): Question[]` —
   target `ratio` curated / `1-ratio` generated; compute counts for the
   combined target size; when one pool is short, take what's available and fill
   from the other (degrade gracefully, never pad, never throw).
2. Deterministic shuffle: seed a small PRNG (e.g. mulberry32 over a session
   seed) so order is stable within a session but varied across sessions.
3. `normalizeText(s)` + `isNearDuplicate(a, b)` helper: lowercase, strip
   punctuation/whitespace, compare via a lightweight ratio (e.g. token
   Jaccard or normalized equality threshold). No embeddings.

**Tests** (extend `question-generator.test.ts`):

- Exact 30/70 split when both pools are large enough.
- Empty seed → returns only generated; empty generated → returns only seed;
  both empty → `[]`.
- Deterministic order for a fixed seed; differs for a different seed.
- `isNearDuplicate` flags trivially reworded duplicates and passes distinct
  questions.

**Acceptance criteria covered**: exact mix ratio + graceful degradation;
"no near-duplicate prompts across a session"; `mix()` empty-pool edge case.

**Commit**: `feat(generator): add deterministic mix and near-duplicate helpers`

---

### Task 6: Public exports `[S]`

**Goal**: Barrel file exposing the module's public surface.

**Files**:

| File                            | Action | Description                          |
|---------------------------------|--------|--------------------------------------|
| `lib/ai/generator/index.ts`     | create | Re-export public types, prompts, generator, store |

**Reuse**:

| File                          | What to reuse                  |
|-------------------------------|--------------------------------|
| `lib/ai/validator/index.ts`   | Barrel-file convention (named exports, `type` re-exports) |

**Steps**:

1. Export `QuestionGenerator`; `getApproved`/`addApproved`/`clear` from the
   store; `GENERATOR_SYSTEM_PROMPT`, `buildGenerationPrompt`; and `type`
   re-exports of `GenerationRequest`, `GenerationResult`, `GeneratedQuestion`.

**Tests** (`lib/ai/generator/__tests__/index.test.ts`):

- Mirror `validator/__tests__/index.test.ts`: assert each public symbol is
  exported and defined.

**Acceptance criteria covered**: Module-completeness; supports coverage target.

**Commit**: `feat(generator): add public module exports`

---

### Task 7: Test fixtures + coverage pass `[S]`

**Goal**: Shared generator test fixtures and confirm ≥80% module coverage.

**Files**:

| File                                          | Action | Description               |
|-----------------------------------------------|--------|---------------------------|
| `lib/ai/generator/__tests__/fixtures.ts`      | create | Canned candidate-array responses, sample topic/subtopic, seed questions |

**Reuse**:

| File                                       | What to reuse                              |
|--------------------------------------------|--------------------------------------------|
| `lib/ai/validator/__tests__/fixtures.ts`   | `CannedJsonProvider`, `makeServiceWithProvider`, topic/question builders (import or mirror) |

**Steps**:

1. Provide a `CannedJsonProvider`-backed `AIService` returning a JSON array of
   N candidate questions; expose good/borderline/bad candidate sets and a
   canned validator-response provider (the generator's validator also calls
   `chat`, so the canned provider must serve validator JSON for those calls —
   plan a provider that distinguishes generation vs validation calls, e.g. by
   call order or message content).
2. Run `npm run test:coverage`; confirm `lib/ai/generator` ≥ 80%. Add tests for
   any uncovered branch (e.g. localStorage-unavailable guard).

**Tests**: This task is fixtures + the coverage gate itself.

**Acceptance criteria covered**: "Unit-test coverage ≥ 80% on the generator
module."

**Commit**: `test(generator): add shared fixtures and coverage tests`

---

**Task ordering**: Task 1 → Task 2/Task 3 (independent of each other) → Task 4
(needs 1+2) → Task 5 (extends 4) → Task 6 (needs all) → Task 7 (coverage gate,
last). Fixtures from Task 7 may be created earlier if convenient, but the
coverage gate runs last.

## Open implementation decision

The spec's AI-failure criterion says `generate()` should "return a
`GenerationResult` with `generated: []` … **and** surface the underlying
`AIServiceError` to the caller." A single method cannot both return a value and
throw. The agreed resolution (from spec definition) is: **return the empty
`GenerationResult`** so the simulator (Phase 10) can fall back to curated
questions, and **surface the error on the result** — e.g. add an optional
`error?: AIServiceError` field to `GenerationResult` (preferred), rather than
throwing. The implementer should add `error?: AIServiceError` to
`GenerationResult` in Task 1 and populate it in Task 4. (Tests assert both the
empty arrays and the populated `error`.)

## Edge Cases & Error Handling

- Malformed/non-JSON candidate → recorded in `rejected` with reason; loop
  continues (Task 4).
- Partially valid candidate (missing required fields) → rejected via
  `validateQuestion` with descriptive reason (Task 4).
- AI returns fewer than requested → `stats.produced` reflects actual; no
  filler fabricated (Task 4).
- All candidates rejected → empty `generated`, accurate `stats` (Task 4).
- AI service error → empty result + `error` populated (Task 4 + decision above).
- `existingQuestionIds` collision → candidate dropped before validation
  (Task 4).
- Near-duplicate question text → dropped via heuristic (Task 5).
- `mix()` with an empty pool → returns the non-empty pool, or `[]` (Task 5).
- localStorage unavailable/corrupt → `getApproved` returns `[]`; writes don't
  throw (Task 3).

## Verification

1. `npm run test:run` — all suites pass, including the new generator suites.
2. `npm run test:coverage` — `lib/ai/generator` reports ≥ 80%.
3. `npm run lint` — zero warnings (no `any`; use `unknown` + narrowing for raw
   candidates).
4. `npm run build` — type-checks (confirms `GeneratedQuestion` is assignable to
   `Question` and the validator API is called with correct signatures).
5. Manually confirm against spec acceptance criteria: ids `gen_*`, metadata
   stamped, validator score recorded, mix ratio exact, dedup, persistence
   across a simulated reload (re-instantiate store), per-cert isolation.

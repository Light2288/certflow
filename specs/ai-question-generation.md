# AI Question Generation Service

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | AI Question Generation Service                          |
| **Type**      | feature                                                |
| **Scope**     | `lib/ai/generator/` (new module)                       |
| **Created**   | 2026-06-29 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow ships only ~15 curated questions for `aws-ml`, which is far too few
to drive a realistic simulation when a user requests a large quiz or filters
by a narrow topic/difficulty. Phase 9 introduces a client-side service that
generates exam questions on demand using the user's configured AI provider,
validates each candidate through the Phase 8 `QuestionValidator`, and blends
the result with the curated pool. Approved questions are cached client-side so
the generation cost is amortised across sessions.

This spec defines the generator service and its persistence layer only. Wiring
it into the simulator UI is Phase 10 and explicitly out of scope here.

## Desired Outcome

A new `lib/ai/generator/` module exists that:

- Accepts a `GenerationRequest` (topic, optional subtopic, single difficulty,
  count, and the IDs of existing questions for de-duplication).
- Calls the configured provider via the existing `AIService`, parses strict
  JSON candidates matching the existing `Question` schema, and runs each
  candidate through the implemented `QuestionValidator`.
- Drops `rejected` candidates, keeps `approved` and `flagged` ones (flagged
  questions are kept but tagged in metadata), and reports per-run statistics.
- Provides a `mix()` helper that blends 30% curated / 70% generated, shuffling
  deterministically per session and degrading gracefully when either pool is
  too small.
- Persists approved questions in a localStorage-backed cache keyed by
  certification id, so future loads can merge cached approved questions with
  the curated set.

### Files to create

- `lib/ai/generator/types.ts`
  - `GenerationRequest { topic: Topic; subtopic?: Subtopic; difficulty:
    DifficultyLevel; count: number; existingQuestionIds: string[] }`.
    `difficulty` is exactly one of `'easy' | 'medium' | 'hard'`
    (`DifficultyLevel` from `lib/types/certification.ts`); a single request
    targets a single difficulty. Mixed-difficulty batches are produced by the
    caller issuing multiple requests.
  - `GenerationResult { generated: Question[]; rejected: Array<{ raw: unknown;
    reason: string }>; stats: { requested: number; produced: number; approved:
    number; flagged: number; rejected: number } }`.

- `lib/ai/generator/prompts.ts`
  - A system prompt grounding the model in the topic's `keyPoints` (and, when
    a subtopic is supplied, the subtopic's `keyPoints`) and exam style.
  - A user-prompt template that demands JSON-only output matching the existing
    `Question` schema: `id`, `topicId`, `subtopicId`, `type`
    (`'multiple-choice' | 'multi-select'`), `difficulty`, `question`,
    `options` (objects with `id` + `text`), `correctAnswer` (string for single,
    array for multi-select), `explanation.correct` + `explanation.whyOthersWrong`
    (a `Record<optionId, string>`), optional `tags`.
  - At least one few-shot example pulled from
    `public/data/certifications/aws-ml/questions.json`.

- `lib/ai/generator/question-generator.ts`
  - `class QuestionGenerator { constructor(aiService: AIService, validator:
    QuestionValidator) }`.
  - `generate(request: GenerationRequest): Promise<GenerationResult>` — calls
    the AI, parses the JSON candidates, runs the on-disk `QuestionValidator`
    on each candidate via its **implemented** public API (call the validator
    exactly as exported from `lib/ai/validator/`; do not invent signatures),
    auto-generates `id` in the form `gen_<timestamp>_<idx>`, stamps
    `metadata.source = 'ai-generated'`, `metadata.createdAt`, and the
    validator score onto each kept question, drops `rejected`, and keeps
    `approved` + `flagged`.
  - `mix(seed: Question[], generated: Question[], ratio = 0.3): Question[]` —
    produces the 30% curated / 70% generated blend, shuffles deterministically
    per session, and degrades gracefully when either pool is too small (uses
    whatever is available rather than padding or throwing).

- `lib/ai/generator/question-store.ts`
  - localStorage-backed cache keyed by certification id.
  - `getApproved(certId: string): Question[]`.
  - `addApproved(certId: string, questions: Question[]): void`.
  - `clear(certId: string): void`.
  - On future loads, callers merge cached approved questions with the curated
    set so generation cost amortises across sessions.
  - The cache grows unbounded for now; size capping / eviction is a documented
    future concern, not part of this spec.

- `lib/ai/generator/index.ts` — public exports for the module.

## Acceptance Criteria

- [ ] `generate()` honours the requested `count`, `difficulty`, and `topic`.
- [ ] Every kept question gets a unique `id` of the form
      `gen_<timestamp>_<idx>`, `metadata.source = 'ai-generated'`, a
      `createdAt` stamp, and the validator score recorded.
- [ ] `rejected` candidates are dropped; `approved` and `flagged` candidates
      are kept, with `flagged` questions distinguishable via metadata.
- [ ] No duplicate IDs are produced, and obvious near-duplicate questions are
      dropped using exact-ID collision checks plus a lightweight normalized-text
      similarity heuristic (no embeddings).
- [ ] De-duplication also excludes anything whose ID appears in
      `existingQuestionIds`.
- [ ] `mix()` produces an exact 30/70 ratio when both pools are large enough,
      and degrades gracefully (uses what is available, never throws or pads)
      when either pool is too small.
- [ ] When the AI call fails entirely (e.g. `MISSING_API_KEY`, `RATE_LIMIT`)
      or all candidates are rejected, `generate()` returns a `GenerationResult`
      with `generated: []` and `stats` reflecting zero produced, and surfaces
      the underlying `AIServiceError` to the caller (so Phase 10 can show a
      friendly message and fall back to curated questions).
- [ ] Approved questions persist across reloads in the same browser via
      `question-store.ts`, keyed by certification id and isolated per cert.
- [ ] `clear(certId)` removes only that certification's cached questions.
- [ ] Unit-test coverage ≥ 80% on the generator module.

## Edge Cases & Error Handling

- **Malformed / non-JSON AI output**: parsing fails for that candidate; the
  candidate is recorded in `rejected` with a reason, and generation continues
  for the remaining candidates rather than crashing.
- **Partially valid candidate** (missing required `Question` fields): treated
  as a rejected candidate with a descriptive reason.
- **AI returns fewer candidates than requested**: `stats.produced` reflects the
  actual count; `generate()` does not fabricate filler questions.
- **All candidates rejected**: returns an empty `generated` array with accurate
  `stats`; surfaces no crash.
- **AI service error (missing/invalid key, rate limit, quota, network)**:
  returns an empty result and propagates the `AIServiceError` to the caller.
- **`existingQuestionIds` collision**: any candidate colliding by ID is dropped
  before validation.
- **Near-duplicate question text**: dropped via the normalized-text similarity
  heuristic.
- **`mix()` with an empty pool**: returns the non-empty pool (or an empty array
  if both are empty) without error.
- **localStorage unavailable or corrupt entry**: `getApproved` falls back to an
  empty list; writes degrade gracefully without throwing.

## Dependencies & Constraints

- **Depends on Phase 8** (`ai-validator-agent`): consumes the **implemented**
  `QuestionValidator` and types exported from `lib/ai/validator/`
  (`QuestionValidator`, `ValidationResult`, `ValidationScore`,
  `ValidatorThresholds`, etc.). The generator must call the validator's actual
  on-disk API, not a hypothetical signature.
- **Contracts to honor**:
  - `Question`, `Topic`, `Subtopic`, `DifficultyLevel`, `QuestionType`,
    `QuestionOption`, `QuestionExplanation`, `QuestionMetadata` in
    `lib/types/certification.ts`.
  - The loader helpers in `lib/loaders/certification-loader.ts`.
  - `AIService` (and `getAIService`) in `lib/ai/ai-service.ts`; the
    `ChatMessage` / `ChatResponse` / `AIServiceError` contracts in
    `lib/ai/types.ts`.
- **Client-side only**: no server-side calls; the service runs in the browser
  using the user's configured provider.
- **Persistence**: localStorage with JSON serialization, keyed per
  certification id; unbounded for now.
- Tests must never hit a real network.

## Out of Scope

- Simulator UI wiring — the `'generating'` view, progress UI, toggles, and
  per-question provenance badges (Phase 10, `ai-enhanced-simulator`).
- Server-side persistence to a `generated-questions.json` file (revisit
  post-Phase 14 if a back-of-house workflow becomes needed).
- Embedding/vector-based near-duplicate detection.
- Cache size capping / eviction policy.
- Mixed-difficulty single requests (callers issue one request per difficulty).
- Any changes to the validator itself (Phase 8 is complete).

## Notes

- Architecture aligns with the plan's three-layer validation model: schema
  (rule-based) → AI Validator Agent (semantic) → human review (flagged-only,
  future). This spec implements the generation + AI-validation layers.
- **Testing plan** (per the embedded Phase 9 prompt and project testing
  standards):
  - `lib/ai/generator/__tests__/question-generator.test.ts` — mock `AIService`
    returning canned candidate questions; verify validator integration, exact
    `mix()` ratio, dedup against `existingQuestionIds`, and error handling
    (malformed JSON, partial candidates, total AI failure).
  - `lib/ai/generator/__tests__/question-store.test.ts` — localStorage
    round-trip, schema validation, multi-cert isolation, corrupt-entry
    fallback.
  - Use the existing `MockAIProvider` plus custom canned-response providers;
    never hit a real network. Target ≥ 80% coverage on the generator module.
- Source: Phase 9 of `IMPLEMENTATION_PLAN_UPDATED.md` (embedded spec-define
  prompt, lines 457–511).

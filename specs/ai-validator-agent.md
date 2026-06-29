# AI Validator Agent

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | AI Validator Agent                                     |
| **Type**      | feature                                                |
| **Scope**     | `lib/ai/validator/` (new module)                       |
| **Created**   | 2026-06-29 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

CertFlow plans to generate exam questions on demand (Phase 9) to fill gaps
in the curated pool. Before any generated question is shown to a learner, it
must be checked for quality — otherwise the simulator could surface unclear,
off-topic, or incorrectly-keyed questions and erode trust in the platform.

Phase 8 introduces a **client-side AI Validator Agent**: given a `Question`
and its topic context, it scores the question for clarity, topic alignment,
answer correctness, and difficulty, then returns an `approved` / `rejected` /
`flagged` verdict. It runs entirely in the browser using the user's currently
configured AI provider via the existing Phase 7 AI layer — no new backend and
no server-side calls. This is the semantic layer of the planned three-layer
validation pipeline (schema → AI validator → human review) and is a hard
prerequisite for the Phase 9 generation service.

## Desired Outcome

A new `lib/ai/validator/` module that exposes:

1. **`types.ts`** — the validator's public type contract:
   - `ValidationScore { clarity, topicAlignment, correctness, difficulty,
     overall }` — all numbers on a 0–10 scale; `overall` is a weighted mean
     of the four component scores.
   - `ValidationResult { questionId, score, verdict, confidence, reasoning,
     issues }` where `verdict` is `'approved' | 'rejected' | 'flagged'`,
     `confidence` is `0–1`, `reasoning` is a string, and `issues` is a
     `string[]` of human-readable problems.
   - `ValidatorThresholds { approveOverall, approveConfidence, rejectOverall }`
     with defaults `approveOverall = 8.0`, `approveConfidence = 0.85`,
     `rejectOverall = 6.0`.

   > **Naming note:** `lib/types/certification.ts` already exports an unrelated
   > `ValidationResult` (cert-data validation). The validator's
   > `ValidationResult` is a *distinct* type that lives only in
   > `lib/ai/validator/types.ts`; consumers import it explicitly from the
   > validator module and the two are never conflated.

2. **`prompts.ts`** — prompt construction:
   - A **system prompt** framing the model as a strict exam-question reviewer.
   - A **user-prompt template** that injects the question (stem, options,
     correct answer, explanation) plus the topic (and optional subtopic)
     context.
   - The prompt demands **strict JSON output** matching the score/result
     shape so parsing is deterministic.
   - Because `AIService.chat(message, history?, options?)` takes a single
     message string, the builder returns the user message string and supplies
     the system prompt as a `system`-role entry in the `history` argument.

3. **`question-validator.ts`** — the agent:
   - `class QuestionValidator { constructor(aiService: AIService, thresholds?: ValidatorThresholds) }`
     — merges any supplied thresholds over the defaults.
   - `validate(question: Question, topic: Topic, subtopic?: Subtopic): Promise<ValidationResult>`
     — builds the prompt, calls the AI service, parses the JSON response,
     applies the verdict rule, and returns a `ValidationResult` whose
     `questionId` echoes `question.id`.
   - `validateBatch(questions: Question[], topics: TopicData): Promise<ValidationResult[]>`
     — validates many questions with a **concurrency limit (default 3,
     configurable)**, resolving each question's topic/subtopic from the
     supplied `TopicData`. Results preserve input order; a per-question
     failure produces an error verdict rather than failing the whole batch.

4. **`index.ts`** — public exports for the module.

### Verdict rule

Given the validator's `ValidationResult.score.overall` and `confidence`:

- **`approved`** when `overall >= approveOverall` **AND**
  `confidence >= approveConfidence`.
- **`rejected`** when `overall < rejectOverall`.
- **`flagged`** otherwise (the in-between band, including high-overall /
  low-confidence cases).

### Malformed-output handling

- The validator extracts and parses JSON from the AI response. If the first
  response is not parseable as the expected schema, it **retries the AI call
  once** (total 2 attempts) with a stricter "re-emit valid JSON only"
  instruction.
- If parsing still fails — or the AI call throws an `AIServiceError`, or the
  response is missing required fields — the validator returns an **error
  verdict** rather than throwing: `verdict = 'flagged'`, `confidence = 0`,
  all `score` components `0`, and an entry in `issues` describing the failure
  (no new enum value is introduced).

## Acceptance Criteria

- [ ] `QuestionValidator.validate()` returns a `ValidationResult` for any
      well-formed `Question`, with `questionId` matching `question.id`.
- [ ] `verdict` matches the approve / reject / flag band rule above in 100% of
      fixture cases.
- [ ] A malformed (non-JSON or schema-invalid) AI response triggers exactly
      one retry; if it still fails, the validator returns the flagged error
      verdict (`confidence = 0`, zeroed scores, descriptive `issues`) and does
      not throw.
- [ ] An `AIServiceError` thrown by the AI service is caught and converted to
      the flagged error verdict; it does not crash the caller.
- [ ] `score.overall` is computed as a weighted mean of the four component
      scores, and all five score fields are clamped to the 0–10 range.
- [ ] `validateBatch()` honours a configurable concurrency limit (default 3),
      preserves input order, and isolates per-question failures.
- [ ] `ValidatorThresholds` defaults are `approveOverall = 8.0`,
      `approveConfidence = 0.85`, `rejectOverall = 6.0`, overridable via the
      constructor.
- [ ] The validator's `ValidationResult` type is exported only from
      `lib/ai/validator/` and does not shadow or modify the existing
      `ValidationResult` in `lib/types/certification.ts`.
- [ ] Unit-test coverage on the validator module is ≥ 85%.
- [ ] Tests never hit a real network — they use `MockAIProvider` and/or a
      custom canned-JSON provider only.

## Edge Cases & Error Handling

- **Malformed JSON from AI**: retry once with a stricter instruction; then
  flagged error verdict.
- **AI returns extra prose around the JSON**: parser extracts the JSON object
  before parsing (e.g. via fenced-block / brace extraction).
- **Partial scores** (some component fields missing): treated as a schema
  failure → retry → flagged error verdict if unresolved.
- **Out-of-range scores** (e.g. 12 or -1): clamped into 0–10.
- **`AIServiceError` / network error / timeout**: caught → flagged error
  verdict with the error described in `issues`.
- **`subtopic` omitted**: validation proceeds using topic context only.
- **`validateBatch` with an empty list**: returns `[]`.
- **A topic referenced by a question is absent from `TopicData`**: that
  question yields a flagged error verdict noting the missing topic, without
  aborting the batch.

## Dependencies & Constraints

- **Builds on the existing Phase 7 AI layer** — no new dependencies:
  - `AIService` and `getAIService()` / `resetAIService()` from
    `lib/ai/ai-service.ts` (chat signature: `chat(message, history?, options?)`).
  - `AIProvider`, `ChatMessage`, `ChatResponse`, `AIServiceError` from
    `lib/ai/types.ts`.
  - `MockAIProvider` from `lib/ai/providers/mock-provider.ts` for tests.
- **Honours the certification contracts** in `lib/types/certification.ts`:
  `Question` (note `difficulty` is `'easy' | 'medium' | 'hard'`,
  `correctAnswer` is `string | string[]`, and `explanation` has `correct` +
  `whyOthersWrong`), `Topic`, `Subtopic`, and `TopicData` (`TopicsData`,
  i.e. `{ topics: Topic[] }`).
- **Runs client-side only** — must not call `/api/chat` or any server route
  directly; it goes through `AIService`.
- Follows the project's feature-based layout (`lib/<feature>/` for logic,
  co-located `__tests__/`) and the Testing Standards in the implementation
  plan.

## Out of Scope

- AI question **generation** (Phase 9) — the validator only scores existing
  `Question` objects.
- Any **UI** surfacing of validation results.
- **Server-side** validation or persistence of results.
- Human-review tooling for `flagged` questions (future).
- Schema/rule-based validation (the cert-data validator already in
  `certification-loader.ts`); this spec is the *semantic* layer only.

## Notes

- **Testing plan** (`lib/ai/validator/__tests__/question-validator.test.ts`):
  - Use `MockAIProvider` plus a custom provider that returns canned validator
    JSON to drive deterministic scoring/verdict assertions.
  - Cover: scoring + each verdict band, malformed JSON (retry then flag),
    partial scores, out-of-range clamping, `AIServiceError`, timeout,
    `validateBatch` ordering/concurrency/isolation.
  - Add a **fixture file** of `good` / `borderline` / `bad` sample questions
    (and matching canned validator responses) so verdict-rule coverage is
    exhaustive.
- **Smoke test (manual):** the validator should work against each non-mock
  provider with a real key; this is verified manually, not in CI, and never
  in automated tests.
- **Decisions locked during definition:**
  - Verdict mapping = approve / reject / flag bands (above).
  - Error representation = reuse `'flagged'` + a descriptive `issues` entry
    (no `'error'` enum value).
  - `validateBatch` concurrency default = 3, configurable.
  - Malformed JSON = retry once, then flag.
- Source: Phase 8 of `IMPLEMENTATION_PLAN_UPDATED.md` (embedded spec-define
  prompt, lines 311–358).

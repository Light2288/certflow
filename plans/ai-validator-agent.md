# Plan: AI Validator Agent

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | AI Validator Agent                 |
| **Spec**     | specs/ai-validator-agent.md        |
| **Type**     | feature                            |
| **Branch**   | feat/ai-validator-agent            |
| **Created**  | 2026-06-29 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

CertFlow will generate exam questions on demand (Phase 9) and must screen
them for quality before showing them to learners. This plan delivers the
Phase 8 semantic validation layer: a client-side `QuestionValidator` that
scores a `Question` (clarity, topic alignment, correctness, difficulty) via
the existing Phase 7 `AIService` and returns an `approved` / `rejected` /
`flagged` verdict. It is a hard prerequisite for the Phase 9 generator and
introduces no new dependencies or backend.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/ai-validator-agent`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/ai-validator-agent
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task below maps to exactly one commit. Scope is
`validator` throughout.

## Build & Test Commands

| Action        | Command                  |
|---------------|--------------------------|
| Test (watch)  | `npm test`               |
| Test (CI/run) | `npm run test:run`       |
| Coverage      | `npm run test:coverage`  |
| Lint          | `npm run lint`           |
| Build         | `npm run build`          |

> This machine uses nvm. If `npm` is not found, run
> `source ~/.nvm/nvm.sh && nvm use` first.

## Tasks

### Task 1: Validator type contract `[S]`

**Goal**: Define the validator's public types without colliding with the
existing `ValidationResult` in `lib/types/certification.ts`.

**Files**:

| File                          | Action | Description                                   |
|-------------------------------|--------|-----------------------------------------------|
| `lib/ai/validator/types.ts`   | create | `ValidationScore`, `ValidationResult`, `ValidatorThresholds`, `DEFAULT_VALIDATOR_THRESHOLDS`, and a verdict union type. |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/types/certification.ts`  | `Question`, `Topic`, `Subtopic` shapes (for doc references only). |

**Steps**:

1. Declare `ValidationVerdict = 'approved' | 'rejected' | 'flagged'`.
2. Declare `ValidationScore { clarity; topicAlignment; correctness;
   difficulty; overall }` — all `number` (0–10).
3. Declare `ValidationResult { questionId: string; score: ValidationScore;
   verdict: ValidationVerdict; confidence: number; reasoning: string;
   issues: string[] }`.
4. Declare `ValidatorThresholds { approveOverall: number; approveConfidence:
   number; rejectOverall: number }` and export
   `DEFAULT_VALIDATOR_THRESHOLDS = { approveOverall: 8.0, approveConfidence:
   0.85, rejectOverall: 6.0 }`.
5. Add a file-level comment clarifying this `ValidationResult` is distinct
   from the cert-data one in `lib/types/certification.ts`.

**Tests**: None directly (types are exercised by Tasks 3–4 tests).

**Acceptance criteria covered**: thresholds defaults; type-isolation
criterion.

**Commit**: `feat(validator): add validator type contract`

---

### Task 2: Validator prompt builders `[S]`

**Goal**: Provide a system prompt and a user-prompt builder that inject
question + topic context and demand strict JSON output.

**Files**:

| File                          | Action | Description                                   |
|-------------------------------|--------|-----------------------------------------------|
| `lib/ai/validator/prompts.ts` | create | `VALIDATOR_SYSTEM_PROMPT`, `buildValidationPrompt(question, topic, subtopic?)`, and a strict-retry instruction constant. |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/types/certification.ts`  | `Question`, `Topic`, `Subtopic` field names (`question`, `options`, `correctAnswer`, `explanation`, `keyPoints`). |
| `lib/ai/types.ts`             | `ChatMessage` role shape for the system message. |

**Steps**:

1. Write `VALIDATOR_SYSTEM_PROMPT` framing the model as a strict exam-question
   reviewer that must respond with a single JSON object only.
2. Document the exact JSON schema the model must emit: the four component
   scores (0–10), `overall`, `confidence` (0–1), `reasoning`, `issues[]`.
3. Implement `buildValidationPrompt(question, topic, subtopic?)` returning the
   user-message string with the stem, all options, the correct answer(s),
   the explanation, topic name/description, and subtopic `keyPoints` when
   present.
4. Export a `STRICT_JSON_RETRY_INSTRUCTION` string used on the retry attempt.

**Tests**:

- `lib/ai/validator/__tests__/prompts.test.ts`: prompt includes the question
  stem, every option id/text, the correct answer, and topic context; subtopic
  key points appear only when a subtopic is passed.

**Acceptance criteria covered**: prompt grounds in question + topic; strict
JSON demand (supports parse/verdict criteria).

**Commit**: `feat(validator): add validator prompt builders`

---

### Task 3: QuestionValidator core (single validate) `[M]`

**Goal**: Implement `QuestionValidator.validate()` — prompt build, AI call,
JSON parse, score clamping/weighting, verdict mapping, retry, and the flagged
error verdict.

**Files**:

| File                                    | Action | Description                                |
|-----------------------------------------|--------|--------------------------------------------|
| `lib/ai/validator/question-validator.ts`| create | `class QuestionValidator(aiService, thresholds?)` with `validate(...)` plus private parse/clamp/verdict/error helpers. |
| `lib/ai/validator/index.ts`             | create | Re-export types and `QuestionValidator`.   |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/ai/ai-service.ts`        | `AIService.chat(message, history?, options?)`. |
| `lib/ai/types.ts`             | `AIServiceError`, `ChatMessage`, `ChatResponse`. |
| `lib/ai/validator/prompts.ts` | system prompt, `buildValidationPrompt`, retry instruction. |
| `lib/ai/validator/types.ts`   | all validator types + defaults.                |

**Steps**:

1. Constructor stores `aiService` and merges `thresholds` over
   `DEFAULT_VALIDATOR_THRESHOLDS`.
2. `validate()` builds the prompt, calls `aiService.chat(userMsg, [systemMsg])`.
3. Implement a private `extractJson(content)` that strips fenced blocks /
   surrounding prose and parses the first JSON object.
4. Validate the parsed shape; on malformed/partial output, retry the chat
   once appending `STRICT_JSON_RETRY_INSTRUCTION`; if still bad, return the
   error verdict.
5. Implement `clampScore` (0–10) for all components and `computeOverall`
   (weighted mean — document weights, e.g. correctness highest).
6. Implement `decideVerdict(overall, confidence)` per the band rule:
   approved when `overall >= approveOverall && confidence >= approveConfidence`;
   rejected when `overall < rejectOverall`; otherwise flagged.
7. Implement `errorResult(questionId, message)` → `verdict:'flagged'`,
   `confidence:0`, zeroed scores, descriptive `issues`. Wrap the whole flow in
   try/catch so `AIServiceError`/timeouts become an error verdict.
8. Always set `questionId` from `question.id`.

**Tests**:

- `lib/ai/validator/__tests__/question-validator.test.ts` (single-validate
  portion): use a custom canned-JSON `AIProvider` injected via a thin
  `AIService` wrapper. Cover: well-formed JSON → correct scores/verdict;
  each verdict band; out-of-range clamping; partial scores → retry → flag;
  non-JSON → retry → flag; retry-succeeds path; `AIServiceError` → flagged
  error verdict (no throw); `questionId` echo.

**Acceptance criteria covered**: returns result for any well-formed question;
verdict band rule; retry-once-then-flag; AIServiceError handling; clamping +
weighted overall; no-throw guarantee.

**Commit**: `feat(validator): implement QuestionValidator.validate`

---

### Task 4: Batch validation with concurrency `[M]`

**Goal**: Add `validateBatch()` with a configurable concurrency limit
(default 3), input-order preservation, and per-question failure isolation.

**Files**:

| File                                    | Action | Description                                |
|-----------------------------------------|--------|--------------------------------------------|
| `lib/ai/validator/question-validator.ts`| modify | Add `validateBatch(questions, topics, concurrency=3)`. |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/types/certification.ts`  | `TopicsData` (`{ topics: Topic[] }`) to resolve a question's `topicId` → `Topic` and `subtopicId` → `Subtopic`. |
| (same file)                   | `validate()` from Task 3 for each item.        |

**Steps**:

1. Add `validateBatch(questions, topics, concurrency = 3)`.
2. Build a `topicId → Topic` (and nested `subtopicId → Subtopic`) lookup from
   `topics.topics`.
3. Run a bounded-concurrency worker pool (simple index queue) capped at
   `concurrency`; default 3.
4. For each question, resolve topic/subtopic; if the topic is missing, produce
   an error verdict noting the missing topic instead of throwing.
5. Wrap each `validate()` in try/catch so one failure cannot reject the batch.
6. Return results in the original input order; empty input → `[]`.

**Tests**:

- Extend `question-validator.test.ts`: batch preserves order; respects
  concurrency (assert max in-flight via a counting canned provider); empty
  list → `[]`; a question whose `topicId` is absent from `TopicsData` →
  flagged error verdict without aborting the batch.

**Acceptance criteria covered**: configurable concurrency default 3; ordering;
per-question isolation; missing-topic edge case; empty-list edge case.

**Commit**: `feat(validator): add concurrent validateBatch`

---

### Task 5: Fixtures & coverage hardening `[S]`

**Goal**: Add good / borderline / bad question fixtures with matching canned
validator responses so verdict-rule coverage is exhaustive and the module
hits ≥ 85% coverage.

**Files**:

| File                                          | Action | Description                                |
|-----------------------------------------------|--------|--------------------------------------------|
| `lib/ai/validator/__tests__/fixtures.ts`      | create | Sample `Question` + `Topic`/`Subtopic` objects (good/borderline/bad) and canned validator JSON responses + a reusable `CannedJsonProvider`. |
| `lib/ai/validator/__tests__/question-validator.test.ts` | modify | Drive the three fixture classes through `validate()`/`validateBatch()` asserting `approved`/`flagged`/`rejected`. |

**Reuse**:

| File                          | What to reuse                                  |
|-------------------------------|------------------------------------------------|
| `lib/ai/types.ts`             | `AIProvider` interface for `CannedJsonProvider`. |
| `public/data/certifications/aws-ml/questions.json` | realistic question shape for fixtures. |

**Steps**:

1. Create a `CannedJsonProvider implements AIProvider` whose `chat()` returns
   queued canned JSON strings (and can simulate malformed-then-valid retry).
2. Add `good` (high overall + high confidence → approved), `borderline`
   (mid overall or low confidence → flagged), `bad` (overall < 6 → rejected)
   fixtures.
3. Assert verdicts match the band rule for 100% of fixtures.
4. Run `npm run test:coverage` and confirm `lib/ai/validator` ≥ 85%; add
   targeted cases (timeout via rejected promise) if any branch is uncovered.

**Tests**: the fixture-driven cases above; never hit a real network.

**Acceptance criteria covered**: verdict matches rules in 100% of fixture
cases; ≥ 85% coverage; tests never hit network.

**Commit**: `test(validator): add fixtures and coverage cases`

---

**Task ordering**: Sequential. Task 1 → 2 → 3 → 4 → 5. Task 3 depends on
1 & 2; Task 4 extends Task 3; Task 5 hardens Tasks 3–4. (The manual non-mock
smoke test in the spec is performed by the implementer outside CI and is not a
coded task.)

## Edge Cases & Error Handling

- Malformed JSON from AI → retry once with strict instruction, then flagged
  error verdict (Tasks 3, 5).
- Extra prose around JSON → `extractJson` isolates the object before parsing
  (Task 3).
- Partial / missing score fields → schema failure → retry → flag (Task 3).
- Out-of-range scores → clamped to 0–10 (Task 3).
- `AIServiceError` / network error / timeout → caught → flagged error verdict
  (Tasks 3, 5).
- `subtopic` omitted → validate using topic context only (Tasks 2, 3).
- `validateBatch` empty list → `[]` (Task 4).
- Question's `topicId` absent from `TopicsData` → flagged error verdict, batch
  continues (Task 4).

## Verification

1. `npm run test:run` — all validator tests green.
2. `npm run test:coverage` — confirm `lib/ai/validator` ≥ 85%.
3. `npm run lint` — no new warnings (no `any` in new files).
4. Re-read spec Acceptance Criteria and confirm each maps to a passing test
   (single validate, verdict bands, retry-then-flag, AIServiceError handling,
   weighted/clamped scores, batch concurrency/order/isolation, type
   isolation).

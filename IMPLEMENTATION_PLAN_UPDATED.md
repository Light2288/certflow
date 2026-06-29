# CertFlow — Implementation Plan (Updated)

> **Status as of:** 2026-06-29 (re-audited)
> **Supersedes:** [`IMPLEMENTATION_PLAN_LEGACY.md`](IMPLEMENTATION_PLAN_LEGACY.md)
> **Context:** This document replaces the original `IMPLEMENTATION_PLAN.md`
> after a full audit of the codebase. Phases 0–7 from the original plan are
> **all implemented**. A re-audit on 2026-06-29 re-confirmed that Phases 0–7
> are done and tested (27 test files) and that Phases 8–14 are **not started**.
> This file records the verified current state and defines the next phases
> (8–14): the items the original plan deferred (AI Validator Agent, AI
> question generation, AI-enhanced simulator, weakness tracking,
> multi-certification support) plus two improvements surfaced by the audit
> (Topic Deep Dive with AI, and project polish/docs/lint).
>
> Each of Phases 8–14 now carries an embedded **🛠️ Spec-define prompt** that
> can be fed directly to the `spec-define` skill (see the next section).

---

## 🧪 How to use the embedded spec-define prompts

Each remaining phase (8–14) contains a self-contained **🛠️ Spec-define
prompt** designed to drive the spec-driven workflow one item at a time:

1. **Define the spec** — invoke `spec-define`, e.g.:
   > *"Read `IMPLEMENTATION_PLAN_UPDATED.md` and define a precise spec for
   > Phase 8 (slug `ai-validator-agent`) using its embedded spec-define
   > prompt."*
   This produces `specs/<slug>.md`.
2. **Plan the spec** — invoke `spec-plan` on the approved `specs/<slug>.md`
   to produce `plans/<slug>.md`.
3. **Implement the spec** — invoke `spec-implement` to write failing tests
   first (red), then code to pass them (green).

Build them in dependency order (see the Priority Summary). The slugs are:

| Phase | Slug |
|---|---|
| 8 | `ai-validator-agent` |
| 9 | `ai-question-generation` |
| 10 | `ai-enhanced-simulator` |
| 11 | `progress-tracking` |
| 12 | `multi-certification` |
| 13 | `topic-deep-dive` |
| 14 | `project-polish-docs` |

---

## 📊 Current Implementation Status (Audit)

The project has progressed substantially beyond what the original plan
described as "complete". Every phase from 0 through 7 is in place, with
dedicated tests for each new module. Each phase below lists the actual
files that prove it is done.

### ✅ Phase 0 — Project Foundation

- **Framework:** Next.js 16.2.4 (App Router) — `package.json`, `next.config.ts`
- **Language:** TypeScript strict mode — `tsconfig.json`
- **Styling:** Tailwind CSS v4 — `postcss.config.mjs`, `app/globals.css`
- **Testing stack:** Vitest 4 + React Testing Library + happy-dom +
  `@vitest/coverage-v8` — `vitest.config.ts`, `test/setup.ts`
- **Dark mode:** Implemented across all pages and components
- **Linting:** ESLint 9 with `eslint-config-next` 16

### ✅ Phase 1 — Data Foundation

- **Data location:** `public/data/certifications/aws-ml/` (note: served from
  `public/`, not `/data/` as the original plan implied)
  - `config.json` — AWS Certified Machine Learning – Specialty (MLS-C01)
  - `topics.json` — 3 main topics (Data Engineering, Exploratory Analysis,
    Modeling) with 9 subtopics
  - `questions.json` — 15 curated seed questions (multiple-choice, with
    explanations, references, tags)
- **Type system:** [`lib/types/certification.ts`](lib/types/certification.ts) —
  complete interfaces for `CertificationConfig`, `Topic`, `Subtopic`,
  `Question`, `QuizSession`, etc.
- **Loader:** [`lib/loaders/certification-loader.ts`](lib/loaders/certification-loader.ts) —
  dynamic loading by ID, validation, helpers (`getQuestionsByTopic`,
  `getRandomQuestions`, `getTopicById`, …)
- **Tests:** [`lib/loaders/__tests__/certification-loader.test.ts`](lib/loaders/__tests__/certification-loader.test.ts)
  and `…integration.test.ts`

### ✅ Phase 2 — Pages, Layout & Navigation

- Home page ([`app/page.tsx`](app/page.tsx)) with feature cards
- Page shells: `/simulator`, `/topics`, `/tutor`, `/settings` (all live, not
  placeholders)
- Root layout: [`app/layout.tsx`](app/layout.tsx) integrates `Navigation` and
  `SettingsProvider`
- Navigation component: [`app/components/Navigation.tsx`](app/components/Navigation.tsx) —
  responsive, mobile menu, active link highlighting, ARIA labels
- Tests: [`app/components/__tests__/Navigation.test.tsx`](app/components/__tests__/Navigation.test.tsx)

### ✅ Phase 3 — Simulator (Quiz)

- **Session manager:** [`lib/quiz/quiz-session-manager.ts`](lib/quiz/quiz-session-manager.ts) —
  create/load/persist sessions, answer tracking, navigation, results,
  active-session recovery, all backed by `localStorage`
- **UI components** (all under `app/simulator/components/`):
  - [`QuizSetup.tsx`](app/simulator/components/QuizSetup.tsx) — count, difficulty, topic filter
  - [`QuestionCard.tsx`](app/simulator/components/QuestionCard.tsx) — single & multi-select, navigation
  - [`QuizProgress.tsx`](app/simulator/components/QuizProgress.tsx) — counter, progress bar, status grid
  - [`QuizResults.tsx`](app/simulator/components/QuizResults.tsx) — pass/fail, breakdown, time
  - [`AnswerReview.tsx`](app/simulator/components/AnswerReview.tsx) — per-question review with explanations
- **Page integration:** [`app/simulator/page.tsx`](app/simulator/page.tsx) — full
  setup → quiz → results → review flow with active-session restoration
- **Tests:** dedicated `__tests__` folder for each component plus
  [`lib/quiz/__tests__/quiz-session-manager.test.ts`](lib/quiz/__tests__/quiz-session-manager.test.ts) (34 tests)

### ✅ Phase 4 — Topic Map

- **List:** [`app/topics/page.tsx`](app/topics/page.tsx) — search, sort by
  order/weight/name, statistics bar, loading & error states
- **Card:** [`app/topics/components/TopicCard.tsx`](app/topics/components/TopicCard.tsx)
- **Detail page:** [`app/topics/[topicId]/page.tsx`](app/topics/[topicId]/page.tsx) —
  dynamic route, topic header with weight, subtopic list with key points,
  CTAs to "Practice Questions" and "Ask AI Tutor"
- **Deep-dive button:** `app/topics/[topicId]/components/DeepDiveButton.tsx`
  *(now wired beyond placeholder — verify integration in Phase 8)*
- **Tests:** [`app/topics/components/__tests__/TopicCard.test.tsx`](app/topics/components/__tests__/TopicCard.test.tsx) and
  [`app/topics/[topicId]/__tests__/page.test.tsx`](app/topics/[topicId]/__tests__/page.test.tsx)

### ✅ Phase 5 — AI Tutor (full, not stub)

- **Chat components** (under `app/tutor/components/`):
  - [`ChatMessage.tsx`](app/tutor/components/ChatMessage.tsx) — markdown via
    `react-markdown` + `remark-gfm` + `rehype-raw`, role-based styling
  - [`ChatInput.tsx`](app/tutor/components/ChatInput.tsx) — auto-resize, send button,
    disabled/loading states
  - [`ChatHistory.tsx`](app/tutor/components/ChatHistory.tsx) — auto-scroll, loading
    indicator
- **Page:** [`app/tutor/page.tsx`](app/tutor/page.tsx) — uses real
  `AIService` (not a stub), full settings integration, structured
  user-friendly error handling per `AIServiceError` code
  (`MISSING_API_KEY`, `INVALID_API_KEY`, `RATE_LIMIT`, `QUOTA_EXCEEDED`,
  `NETWORK_ERROR`, `MODEL_NOT_FOUND`), retry-up-to-3 flow, provider status
  badge
- **Tests:** [`app/tutor/__tests__/page.test.tsx`](app/tutor/__tests__/page.test.tsx) plus
  per-component tests under `app/tutor/components/__tests__/`

### ✅ Phase 6 — Settings

- **Storage layer:** [`lib/settings/settings-storage.ts`](lib/settings/settings-storage.ts) —
  save/load/clear/export/import via `localStorage`, schema validation,
  default-merge fallback
- **Context:** [`lib/contexts/settings-context.tsx`](lib/contexts/settings-context.tsx) —
  `SettingsProvider`, `useSettings` hook with `isLoading`, `updateSettings`,
  `resetSettings`
- **Types:** [`lib/types/ai-settings.ts`](lib/types/ai-settings.ts) — `AIProviderType`,
  `AISettings`, `AI_PROVIDERS` map (mock, openai, anthropic, google, ollama,
  custom), `DEFAULT_AI_SETTINGS`
- **Components** (under `app/settings/components/`):
  - [`ProviderSelector.tsx`](app/settings/components/ProviderSelector.tsx)
  - [`ApiKeyInput.tsx`](app/settings/components/ApiKeyInput.tsx) — show/hide toggle
  - [`ModelSelector.tsx`](app/settings/components/ModelSelector.tsx) — provider-specific
- **Page:** [`app/settings/page.tsx`](app/settings/page.tsx) — draft/save flow,
  unsaved-changes banner, save status, reset-confirmation modal
- **Tests:** full `__tests__` suite for storage, context, page and components

### ✅ Phase 7 — AI Integration (multi-provider)

- **Type contract:** [`lib/ai/types.ts`](lib/ai/types.ts) — `AIProvider`,
  `ChatMessage`, `ChatOptions`, `ChatResponse`, `AIConfig`, `AIServiceError`
- **Service:** [`lib/ai/ai-service.ts`](lib/ai/ai-service.ts) — provider factory,
  config merging, validation, connection-test, runtime provider switching,
  global singleton (`getAIService` / `resetAIService`)
- **Providers** (under `lib/ai/providers/`):
  - `mock-provider.ts` — pre-defined responses, no key required
  - `openai-provider.ts` — uses `openai` SDK
  - `anthropic-provider.ts` — uses `@anthropic-ai/sdk`
  - `google-provider.ts` — uses `@google/generative-ai`
  - `ollama-provider.ts` — uses `ollama` package, local-only
- **Server-side route:** [`app/api/chat/route.ts`](app/api/chat/route.ts) — used
  for Ollama (server-only) and as a generic fallback
- **Tests:** every provider plus the service have a `__tests__` file

### Test inventory

29 test files across the project covering: certification loader,
navigation, simulator components & manager, topics list/detail/cards,
settings storage/context/page/components, AI service, all 5 providers,
chat UI, tutor page.

---

## 🧭 Map: Original Plan → Today

| Original phase | Status | Note |
|---|---|---|
| Phase 0–2.1.1 (foundation, tests, pages) | ✅ Done | As described |
| Phase 2.2 — Navigation | ✅ Done | Tested |
| Phase 3 — Simulator | ✅ Done | Persistence + recovery included |
| Phase 4 — Topic Map | ✅ Done | Search/sort beyond original spec |
| Phase 5 — AI Tutor | ✅ Done — **not a stub** | Full provider-backed chat |
| Phase 6 — Settings | ✅ Done | Storage + Context + draft/save UX |
| Phase 7 — AI Integration | ✅ Done — **5 providers** (original asked for ≥2) | Plus `/api/chat` route |
| Phase 7.3 — AI Validator Agent | ❌ Not started | Moves to **Phase 8** below |
| Phase 7.4 — Question Generation Service | ❌ Not started | Moves to **Phase 9** below |
| Phase 7.5 — Enhanced Simulator with AI | ❌ Not started | Moves to **Phase 10** below |
| Phase 8+ — Weakness/adaptive/RAG/multi-cert | ❌ Not started | Phases 11–12 below |
| Topic "Deep Dive with AI" (still a stub) | ❌ Not started | New **Phase 13** below |
| README/lint/cleanup/E2E polish | ❌ Not started | New **Phase 14** below |

### Smaller gaps the 2026-06-29 re-audit confirmed

- **`DeepDiveButton` is still a stub.**
  [`app/topics/[topicId]/components/DeepDiveButton.tsx`](app/topics/[topicId]/components/DeepDiveButton.tsx)
  only fires `alert("AI Deep Dive feature coming soon …")` — it makes no AI
  call and ignores its `topicId` prop. Addressed in **Phase 13**.
- **`README.md` is still the boilerplate `create-next-app` template** — needs
  CertFlow-specific content. Moved from Phase 12 to **Phase 14**.
- **`error: any` in the chat route.**
  [`app/api/chat/route.ts`](app/api/chat/route.ts) uses a `catch (error: any)`
  clause (≈ line 40) and reads `.message/.code/.provider` off it — a
  `no-explicit-any` lint concern. Addressed in **Phase 14**.
- **No `currentCertificationId` concept anywhere.**
  [`lib/types/ai-settings.ts`](lib/types/ai-settings.ts) only models AI
  provider settings; the cert id `'aws-ml'` is effectively hard-coded across
  loaders, simulator, and topics. Addressed in **Phase 12**.
- **Only one certification exists** (`public/data/certifications/aws-ml/`
  with `config.json`, `topics.json`, `questions.json`). A second cert is
  needed to prove the abstraction — **Phase 12**.
- `data/` path referenced in legacy plan does not exist; data lives in
  `public/data/`. Doc note to be added in **Phase 14**.
- `generated-questions.json` was promised but not yet present — client-side
  cache comes online with **Phase 9**.
- No progress-tracking persistence yet (per-topic performance, history
  beyond current session) — covered in **Phase 11**.
- No E2E suite — explicitly deferred (optional, **Phase 14**).
- Stray docs `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md` to be
  archived/consolidated — **Phase 14**.

---

## 🎯 Implementation Roadmap (Phases 8–12)

### Phase 8 — AI Validator Agent (Priority 1)

**Goal:** Score AI-generated questions for clarity, topic alignment, and
answer correctness, returning an auto-approve / auto-reject / flag verdict.
The agent runs **client-side**, using the user's currently configured AI
provider via `AIService`.

#### Step 8.1 — Validator types and prompt design

**Components to create:**

1. `lib/ai/validator/types.ts`
   ```typescript
   export interface ValidationScore {
     clarity: number;      // 0–10
     topicAlignment: number; // 0–10
     correctness: number;  // 0–10
     difficulty: number;   // 0–10
     overall: number;      // weighted mean
   }

   export interface ValidationResult {
     questionId: string;
     score: ValidationScore;
     verdict: 'approved' | 'rejected' | 'flagged';
     confidence: number;   // 0–1
     reasoning: string;
     issues: string[];     // human-readable problems
   }

   export interface ValidatorThresholds {
     approveOverall: number;   // default 8.0
     approveConfidence: number; // default 0.85
     rejectOverall: number;    // default 6.0
   }
   ```

2. `lib/ai/validator/prompts.ts`
   - System prompt that frames the model as an exam-question reviewer
   - User-prompt template that injects the question + topic context
   - Strict JSON output schema for deterministic parsing

#### Step 8.2 — Validator service

**Components to create:**

1. `lib/ai/validator/question-validator.ts`
   - `class QuestionValidator { constructor(aiService: AIService, thresholds?: ValidatorThresholds) }`
   - `validate(question: Question, topic: Topic, subtopic?: Subtopic): Promise<ValidationResult>`
   - `validateBatch(questions: Question[], topics: TopicData): Promise<ValidationResult[]>` with concurrency limit
   - JSON-response parsing with retry on malformed output
   - Verdict logic per thresholds

2. `lib/ai/validator/index.ts` — public exports

#### Step 8.3 — Tests & fixtures

- `lib/ai/validator/__tests__/question-validator.test.ts`
  - Uses the existing `MockAIProvider` (and a custom provider that returns
    canned validator JSON) to verify scoring & verdict logic
  - Edge cases: malformed JSON, partial scores, AI errors, timeout
- Fixture file with several "good", "borderline", "bad" question samples

**Success criteria**

- [ ] Validator returns a `ValidationResult` for any well-formed `Question`
- [ ] `verdict` matches threshold rules in 100% of fixture cases
- [ ] Malformed AI responses do not crash the app — surface an error verdict
- [ ] Unit-test coverage ≥ 85% on validator module
- [ ] Works with each non-mock provider (smoke-tested manually)

**Estimated effort:** 2–3 sessions

#### 🛠️ Spec-define prompt — `ai-validator-agent`

```
Define a spec for the CertFlow "AI Validator Agent" (slug: ai-validator-agent),
implementing Phase 8 of IMPLEMENTATION_PLAN_UPDATED.md.

Goal: A client-side agent that scores an AI-generated (or curated) question
for clarity, topic alignment, answer correctness, and difficulty, then returns
an approved / rejected / flagged verdict. It runs entirely client-side using
the user's configured provider via getAIService() from lib/ai/ai-service.ts.

Depends on: nothing new (uses the existing Phase 7 AI layer).

In scope (new files under lib/ai/validator/):
- types.ts — ValidationScore { clarity, topicAlignment, correctness,
  difficulty, overall (all 0–10) }, ValidationResult { questionId, score,
  verdict: 'approved'|'rejected'|'flagged', confidence (0–1), reasoning,
  issues: string[] }, ValidatorThresholds { approveOverall=8.0,
  approveConfidence=0.85, rejectOverall=6.0 }.
- prompts.ts — system prompt framing the model as an exam-question reviewer +
  a user-prompt template that injects the question and topic context, demanding
  strict JSON output for deterministic parsing.
- question-validator.ts — class QuestionValidator(aiService, thresholds?) with
  validate(question, topic, subtopic?): Promise<ValidationResult> and
  validateBatch(questions, topicData): Promise<ValidationResult[]> with a
  concurrency limit. Includes JSON parsing with retry on malformed output and
  threshold-based verdict logic.
- index.ts — public exports.

Contracts to honor: the Question, Topic, Subtopic types in
lib/types/certification.ts; the AIProvider/ChatMessage/ChatResponse/
AIServiceError contract in lib/ai/types.ts; the AIService API in
lib/ai/ai-service.ts.

Out of scope: question generation (Phase 9), any UI, server-side calls.

Testing: lib/ai/validator/__tests__/question-validator.test.ts using the
existing MockAIProvider plus a custom provider returning canned validator JSON.
Cover scoring + verdict logic, malformed JSON, partial scores, AI errors, and
timeout. Add a fixture file of good / borderline / bad question samples. Never
hit a real network. Target ≥85% coverage on the validator module.

Success criteria:
- Returns a ValidationResult for any well-formed Question.
- verdict matches threshold rules in 100% of fixture cases.
- Malformed AI responses surface an error verdict instead of crashing.
- Works with each non-mock provider (smoke-tested manually).
```

---

### Phase 9 — AI Question Generation Service (Priority 2)

**Goal:** When the user starts a simulation and the curated pool is too
small for the requested filters, generate the missing questions live using
the configured AI provider, validate them through Phase 8, and mix
30% seed + 70% AI-generated as the original plan specified.

#### Step 9.1 — Generator types & prompts

**Components to create:**

1. `lib/ai/generator/types.ts`
   ```typescript
   export interface GenerationRequest {
     topic: Topic;
     subtopic?: Subtopic;
     difficulty: Question['difficulty'];
     count: number;
     existingQuestionIds: string[]; // for de-duplication context
   }

   export interface GenerationResult {
     generated: Question[];
     rejected: Array<{ raw: unknown; reason: string }>;
     stats: {
       requested: number;
       produced: number;
       approved: number;
       flagged: number;
       rejected: number;
     };
   }
   ```

2. `lib/ai/generator/prompts.ts`
   - System prompt grounded in the topic's `keyPoints` and exam style
   - JSON-only output matching the existing `Question` schema (id, options
     a–d, correctAnswer, explanation.correct + whyOthersWrong, etc.)
   - Few-shot example pulled from `questions.json`

#### Step 9.2 — Generator service

**Components to create:**

1. `lib/ai/generator/question-generator.ts`
   - `class QuestionGenerator { constructor(aiService: AIService, validator: QuestionValidator) }`
   - `generate(request: GenerationRequest): Promise<GenerationResult>`
     - Calls AI, parses JSON, runs Phase-8 validator on each candidate
     - Drops `rejected`; keeps `approved` and `flagged` (flagged go in but
       are tagged in metadata)
     - Auto-generates `id` (`gen_<timestamp>_<idx>`), stamps
       `metadata.source = 'ai-generated'`, `createdAt`, `validatorScore`
   - `mix(seed: Question[], generated: Question[], ratio = 0.3): Question[]`
     — produces the 30/70 mix and shuffles deterministically per session

2. `lib/ai/generator/index.ts` — public exports

#### Step 9.3 — Persistence of approved questions

**Components to create:**

1. `lib/ai/generator/question-store.ts`
   - localStorage-backed cache keyed by certification id
   - `getApproved(certId): Question[]`
   - `addApproved(certId, questions: Question[])`
   - `clear(certId)`
   - On future loads, merge cached approved questions with the curated set
     so generation cost is amortised across sessions

> *Server-side persistence to `generated-questions.json` is out of scope
> for Phase 9; revisit in Phase 12 if a back-of-house workflow becomes
> needed.*

#### Step 9.4 — Tests

- `lib/ai/generator/__tests__/question-generator.test.ts`
  - Mock `AIService` returning canned candidate questions
  - Verifies validator integration, mix ratio, dedup against
    `existingQuestionIds`, error handling
- `lib/ai/generator/__tests__/question-store.test.ts`
  - localStorage round-trip, schema validation, multi-cert isolation

**Success criteria**

- [ ] `generate()` honours the requested count, difficulty, and topic
- [ ] No duplicate IDs and no near-duplicate prompts across a session
- [ ] Mix ratio is exact when both pools are large enough; falls back
      gracefully when one pool is too small
- [ ] Approved questions persist across reloads in the same browser
- [ ] Coverage ≥ 80% on generator module

**Estimated effort:** 3–4 sessions

#### 🛠️ Spec-define prompt — `ai-question-generation`

```
Define a spec for the CertFlow "AI Question Generation Service"
(slug: ai-question-generation), implementing Phase 9 of
IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Generate exam questions on demand when the curated pool is too small
for the requested topic/difficulty/count, validate each candidate through the
Phase 8 QuestionValidator, drop rejects, keep approved + flagged, and provide a
mix() that blends 30% curated / 70% generated. Approved questions are cached
client-side so generation cost amortises across sessions.

Depends on: Phase 8 (ai-validator-agent) — uses lib/ai/validator/.

In scope (new files under lib/ai/generator/):
- types.ts — GenerationRequest { topic, subtopic?, difficulty, count,
  existingQuestionIds: string[] }; GenerationResult { generated: Question[],
  rejected: Array<{ raw: unknown; reason: string }>, stats { requested,
  produced, approved, flagged, rejected } }.
- prompts.ts — system prompt grounded in the topic's keyPoints and exam style;
  JSON-only output matching the existing Question schema (id, options a–d,
  correctAnswer, explanation.correct + whyOthersWrong, difficulty, tags); a
  few-shot example pulled from public/data/certifications/aws-ml/questions.json.
- question-generator.ts — class QuestionGenerator(aiService, validator) with
  generate(request): Promise<GenerationResult> (calls AI, parses JSON, runs the
  validator on each candidate, auto-generates id = `gen_<timestamp>_<idx>`,
  stamps metadata.source='ai-generated', createdAt, validatorScore) and
  mix(seed, generated, ratio=0.3): Question[] that shuffles deterministically
  per session and degrades gracefully when one pool is too small.
- question-store.ts — localStorage-backed cache keyed by certification id:
  getApproved(certId), addApproved(certId, questions), clear(certId); merges
  cached approved questions with the curated set on future loads.
- index.ts — public exports.

Contracts to honor: the Question/Topic/Subtopic types in
lib/types/certification.ts; the loader helpers in
lib/loaders/certification-loader.ts; the AIService in lib/ai/ai-service.ts;
the validator API from lib/ai/validator/.

Out of scope: simulator UI wiring (Phase 10); server-side persistence to a
generated-questions.json file (revisit post-Phase 14 if needed).

Testing:
- lib/ai/generator/__tests__/question-generator.test.ts — mock AIService
  returning canned candidate questions; verify validator integration, exact mix
  ratio, dedup against existingQuestionIds, error handling.
- lib/ai/generator/__tests__/question-store.test.ts — localStorage round-trip,
  schema validation, multi-cert isolation.
- Never hit a real network. Target ≥80% coverage on the generator module.

Success criteria:
- generate() honours requested count, difficulty, and topic.
- No duplicate IDs and no near-duplicate prompts across a session.
- Mix ratio is exact when both pools are large enough; degrades gracefully.
- Approved questions persist across reloads in the same browser.
```

---

### Phase 10 — AI-Enhanced Simulator (Priority 3)

**Goal:** Wire generation + validation into the existing simulator UI so
users get richer, on-demand question pools without changing the basic
quiz UX.

#### Step 10.1 — Hook & state

**Components to create:**

1. `lib/quiz/use-question-pool.ts` (custom hook)
   - Inputs: cert id, topic filter, difficulty, requested count,
     `aiSettings`
   - Returns `{ questions, isGenerating, generationStats, error }`
   - Pulls seed questions from the loader, asks `QuestionGenerator` to
     fill the gap if needed, applies `mix()`

#### Step 10.2 — UI updates

**Components to update:**

1. [`app/simulator/components/QuizSetup.tsx`](app/simulator/components/QuizSetup.tsx)
   - New toggle "Augment with AI-generated questions" (default ON when a
     non-mock provider is configured, OFF for mock)
   - When ON, expose target count without being capped by curated pool
2. New: `app/simulator/components/GenerationProgress.tsx`
   - Shown between "Start" and "Quiz" while generation runs
   - Progress per stage: drafting → validating → mixing
   - Cancel button (best-effort abort)
3. [`app/simulator/page.tsx`](app/simulator/page.tsx)
   - Insert a `'generating'` view-mode between `'setup'` and `'quiz'`
   - Persist generated pool into the session so reloads still work

#### Step 10.3 — Per-question provenance UI

- In [`AnswerReview.tsx`](app/simulator/components/AnswerReview.tsx) show a
  small badge `AI-generated` / `Curated` and the validator score for
  AI-generated items, so users can judge quality.

#### Step 10.4 — Tests

- Update existing simulator tests; add new tests for
  `use-question-pool.ts` and `GenerationProgress.tsx`.
- E2E-lite: a vitest test that drives the page through
  setup → generating → quiz → results using a mock AI provider.

**Success criteria**

- [ ] User can run a 50-question quiz on `aws-ml` even though only 15
      curated questions exist
- [ ] Generation never blocks the UI thread; progress is visible
- [ ] AI-generated items are visually distinguished in review
- [ ] Mock provider path still works end-to-end without network
- [ ] Reload during a quiz with AI-generated questions resumes correctly

**Estimated effort:** 3 sessions

#### 🛠️ Spec-define prompt — `ai-enhanced-simulator`

```
Define a spec for the CertFlow "AI-Enhanced Simulator"
(slug: ai-enhanced-simulator), implementing Phase 10 of
IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Wire on-demand generation + validation into the existing simulator so
users can run larger quizzes than the curated pool allows, without changing the
basic quiz UX. Mock provider path must still work end-to-end without network.

Depends on: Phase 8 (ai-validator-agent) and Phase 9 (ai-question-generation).

In scope:
- lib/quiz/use-question-pool.ts — custom hook taking cert id, topic filter,
  difficulty, requested count, and aiSettings; returns { questions,
  isGenerating, generationStats, error }. Pulls seed questions from
  lib/loaders/certification-loader.ts, asks QuestionGenerator to fill the gap
  when needed, and applies mix().
- app/simulator/components/GenerationProgress.tsx — shown between "Start" and
  "Quiz" while generation runs; progress per stage (drafting -> validating ->
  mixing) with a best-effort Cancel button.
- Update app/simulator/components/QuizSetup.tsx — add an "Augment with
  AI-generated questions" toggle (default ON when a non-mock provider is
  configured, OFF for mock); when ON, allow a target count not capped by the
  curated pool size.
- Update app/simulator/page.tsx — insert a 'generating' view-mode between
  'setup' and 'quiz'; persist the generated pool into the session
  (lib/quiz/quiz-session-manager.ts) so reloads resume correctly.
- Update app/simulator/components/AnswerReview.tsx — show a small
  "AI-generated" / "Curated" provenance badge and the validator score for
  AI-generated items.

Contracts to honor: existing QuizSession/QuizSessionManager APIs in
lib/quiz/quiz-session-manager.ts; the SettingsContext/useSettings hook in
lib/contexts/settings-context.tsx; the generator/validator APIs from
lib/ai/generator/ and lib/ai/validator/.

Out of scope: progress tracking (Phase 11); multi-cert selection (Phase 12).

Testing: update the existing simulator component tests; add tests for
use-question-pool.ts and GenerationProgress.tsx; add an E2E-lite vitest test
that drives the page through setup -> generating -> quiz -> results using a
mock AI provider. Never hit a real network.

Success criteria:
- A user can run a 50-question quiz on aws-ml even though only 15 curated
  questions exist.
- Generation never blocks the UI thread; progress is visible.
- AI-generated items are visually distinguished in review.
- Mock provider path still works end-to-end without network.
- Reload during a quiz with AI-generated questions resumes correctly.
```

---

### Phase 11 — Progress Tracking & Weakness Detection (Priority 4)

**Goal:** Track performance per topic/subtopic over time and use it to
suggest what to practise next. This is the first half of "adaptive"
learning; full adaptive selection comes later.

#### Step 11.1 — Progress storage

**Components to create:**

1. `lib/progress/types.ts`
   ```typescript
   export interface TopicPerformance {
     topicId: string;
     attempted: number;
     correct: number;
     averageScore: number;
     lastPracticed: string; // ISO
     trend: 'up' | 'down' | 'flat';
   }

   export interface UserProgress {
     certificationId: string;
     sessions: QuizSessionResult[];
     topicPerformance: Record<string, TopicPerformance>;
     subtopicPerformance: Record<string, TopicPerformance>;
     lastActivity: string;
   }
   ```

2. `lib/progress/progress-storage.ts`
   - localStorage-backed, per certification id
   - `recordSession(result: QuizSessionResult)` — recompute aggregates
   - `getProgress(certId): UserProgress`
   - `reset(certId)`, `export()`, `import()`

#### Step 11.2 — Integration with simulator

- [`app/simulator/page.tsx`](app/simulator/page.tsx) calls
  `progressStorage.recordSession(results)` on quiz completion
- Show "Topic performance" section on `QuizResults` referencing the
  user's all-time scores, not just this session

#### Step 11.3 — Dashboard view

**Components to create:**

1. `app/progress/page.tsx`
   - Top weak topics, recent sessions, trend indicators
   - Per-topic breakdown with link to "Practice this topic" (filtered
     simulator deeplink)
2. `app/progress/components/TopicPerformanceCard.tsx`
3. Add `Progress` link to `Navigation.tsx`

#### Step 11.4 — Tests

- Progress storage round-trip, aggregate math, trend computation
- Component tests for `TopicPerformanceCard`

**Success criteria**

- [ ] Completed quizzes update per-topic stats persistently
- [ ] Weak topics surface in the dashboard within one click of the home
      page
- [ ] Resetting progress clears state without affecting AI settings
- [ ] Coverage ≥ 80% on `lib/progress`

**Estimated effort:** 2–3 sessions

#### 🛠️ Spec-define prompt — `progress-tracking`

```
Define a spec for CertFlow "Progress Tracking & Weakness Detection"
(slug: progress-tracking), implementing Phase 11 of
IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Track performance per topic/subtopic over time and surface weak areas as
actionable next steps. This is the first half of "adaptive" learning; adaptive
question selection itself is out of scope.

Depends on: nothing new (consumes existing quiz results). Independent of the
AI generation chain; can be built in parallel with Phases 8–10.

In scope:
- lib/progress/types.ts — TopicPerformance { topicId, attempted, correct,
  averageScore, lastPracticed (ISO), trend: 'up'|'down'|'flat' }; UserProgress
  { certificationId, sessions: QuizSessionResult[], topicPerformance:
  Record<string, TopicPerformance>, subtopicPerformance: Record<string,
  TopicPerformance>, lastActivity }.
- lib/progress/progress-storage.ts — localStorage-backed, per certification id:
  recordSession(result) (recompute aggregates + trend), getProgress(certId),
  reset(certId), export(), import(). Must not touch AI settings.
- Integrate into app/simulator/page.tsx — call progress recording on quiz
  completion; show an all-time "Topic performance" section in
  app/simulator/components/QuizResults.tsx referencing lifetime scores, not
  just the current session.
- app/progress/page.tsx — dashboard: top weak topics, recent sessions, trend
  indicators, per-topic breakdown with a "Practice this topic" filtered
  simulator deeplink.
- app/progress/components/TopicPerformanceCard.tsx.
- Add a "Progress" link to app/components/Navigation.tsx.

Contracts to honor: the QuizSession/result types and manager in
lib/quiz/quiz-session-manager.ts; the Topic/Subtopic types in
lib/types/certification.ts; existing Navigation patterns and tests.

Out of scope: adaptive question selection; AI weakness analysis;
multi-cert switching UI (Phase 12, though storage must already be keyed by
cert id).

Testing: progress storage round-trip, aggregate math, trend computation;
component tests for TopicPerformanceCard. Target ≥80% coverage on lib/progress.

Success criteria:
- Completed quizzes update per-topic stats persistently.
- Weak topics surface in the dashboard within one click of the home page.
- Resetting progress clears state without affecting AI settings.
```

**Estimated effort:** 2–3 sessions

---

### Phase 12 — Multi-Certification Support (Priority 5)

**Goal:** Make the platform genuinely multi-certification: introduce an
app-level "current certification" concept, a UI selector, and refactor the
hard-coded `'aws-ml'` id out of the loaders, simulator, topics, and progress
modules.

> **Note:** README/docs, lint hardening, cleanup, and optional E2E (formerly
> Steps 12.2–12.4) have moved to the new **Phase 14 — Project Polish, Docs &
> Lint**.

#### Step 12.1 — App-level certification settings

- Introduce a `currentCertificationId` concept — either a new sibling
  `AppSettings` type or an added field — rather than overloading
  [`lib/types/ai-settings.ts`](lib/types/ai-settings.ts) (which currently only
  models AI provider settings). Persist via the existing settings storage
  pattern in [`lib/settings/settings-storage.ts`](lib/settings/settings-storage.ts)
  and expose it through [`lib/contexts/settings-context.tsx`](lib/contexts/settings-context.tsx).

#### Step 12.2 — Certification selector UI

- `app/components/CertificationSelector.tsx` — dropdown surfacing all
  certifications discovered in `public/data/certifications/`, wired to the
  current-cert setting and placed in `Navigation` or each feature page.

#### Step 12.3 — De-hardcode the cert id

- Update the loaders, simulator, topics, and progress modules to use the
  selected cert id instead of the hard-coded `'aws-ml'` string.

#### Step 12.4 — Second certification

- Add at least one second certification (minimal `config.json` + ~3 topics +
  a handful of questions) under `public/data/certifications/<id>/` to prove the
  abstraction holds.

**Success criteria**

- [ ] User can switch between at least two certifications via the UI
- [ ] Switching cert updates simulator, topics, and progress consistently
- [ ] No `'aws-ml'` literal remains hard-coded in feature modules
- [ ] Coverage maintained on touched modules

**Estimated effort:** 2–3 sessions

#### 🛠️ Spec-define prompt — `multi-certification`

```
Define a spec for CertFlow "Multi-Certification Support"
(slug: multi-certification), implementing Phase 12 of
IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Let users switch between multiple certifications from the UI, backed by
an app-level current-certification setting, with all feature modules reading
the selected cert id instead of a hard-coded 'aws-ml'.

Depends on: ideally after Phase 11 (progress-tracking) so progress storage can
be keyed/switched per cert, but the storage layer is already cert-id-keyed so
this can proceed independently if needed.

In scope:
- App-level setting: add a currentCertificationId via a new AppSettings type
  (or sibling field) — do NOT overload AISettings in lib/types/ai-settings.ts,
  which is AI-provider-only. Persist through the pattern in
  lib/settings/settings-storage.ts and expose via
  lib/contexts/settings-context.tsx (e.g. add to useSettings).
- app/components/CertificationSelector.tsx — dropdown listing all certs found
  under public/data/certifications/; selecting one updates the setting.
- Refactor the hard-coded 'aws-ml' usages in lib/loaders/certification-loader.ts
  consumers: app/simulator/page.tsx, app/topics/page.tsx,
  app/topics/[topicId]/page.tsx, and (if present) app/progress/page.tsx and
  lib/progress to use the current cert id.
- A second certification under public/data/certifications/<id>/ with a minimal
  config.json + ~3 topics + a few questions matching the existing schema.

Contracts to honor: CertificationConfig/Topic/Subtopic/Question in
lib/types/certification.ts; the loader API in
lib/loaders/certification-loader.ts; SettingsProvider/useSettings in
lib/contexts/settings-context.tsx; settings storage validation in
lib/settings/settings-storage.ts.

Out of scope: README/docs/lint/cleanup (Phase 14); generation/validation
behaviour (Phases 8–10).

Testing: settings storage round-trip for the new setting; CertificationSelector
component test (lists certs, fires change); a loader/integration test proving a
second cert loads. Maintain existing coverage.

Success criteria:
- User can switch between at least two certifications via the UI.
- Switching updates simulator, topics, and progress consistently.
- No 'aws-ml' literal remains hard-coded in feature modules.
```

---

### Phase 13 — Topic Deep Dive with AI (Priority 6) ★ beyond original plan

**Goal:** Replace the placeholder
[`app/topics/[topicId]/components/DeepDiveButton.tsx`](app/topics/[topicId]/components/DeepDiveButton.tsx)
— which today only fires `alert("AI Deep Dive feature coming soon …")` and
ignores its `topicId` — with a real feature that expands a topic using the
configured AI provider (examples, real-world context, exam tips), fulfilling
the "Deep dive with AI" item from the original `prompt.md`.

#### Step 13.1 — Deep-dive service/prompt

- A small prompt module + call path that injects the topic's `name`,
  `description`, and `keyPoints` (from `topics.json`) into a request to
  `getAIService()`, asking for a structured markdown explanation (overview,
  worked examples, real-world context, exam tips).

#### Step 13.2 — UI

- On click, render the AI response as markdown (reuse the tutor's
  `react-markdown` setup) in a panel or modal on the topic detail page, with
  loading and error states.
- Reuse the tutor's structured error handling per `AIServiceError` code
  (`MISSING_API_KEY`, `INVALID_API_KEY`, `RATE_LIMIT`, `QUOTA_EXCEEDED`,
  `NETWORK_ERROR`, `MODEL_NOT_FOUND`) with a retry affordance.

**Success criteria**

- [ ] Clicking "Deep Dive" returns a topic-grounded AI explanation rendered as
      markdown
- [ ] Errors (missing/invalid key, rate limit, etc.) are surfaced clearly, not
      as a raw alert
- [ ] Mock provider returns a sensible canned deep-dive without a network call
- [ ] No `alert()` remains in the component

**Estimated effort:** 1–2 sessions

#### 🛠️ Spec-define prompt — `topic-deep-dive`

```
Define a spec for CertFlow "Topic Deep Dive with AI" (slug: topic-deep-dive),
implementing Phase 13 of IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Replace the placeholder DeepDiveButton (currently just an
alert("AI Deep Dive feature coming soon …") that ignores topicId) with a real
feature that calls the configured AI provider to expand a topic with an
overview, worked examples, real-world context, and exam tips, rendered as
markdown on the topic detail page.

Depends on: the existing Phase 7 AI layer. Benefits from Phase 8 patterns but
does not require the validator/generator.

In scope:
- A deep-dive prompt/call path (e.g. lib/ai/deep-dive/ or a focused helper)
  that injects the topic's name, description, and keyPoints into a request via
  getAIService() in lib/ai/ai-service.ts and returns markdown.
- Rewrite app/topics/[topicId]/components/DeepDiveButton.tsx to trigger the
  call and render the response as markdown (reuse the react-markdown +
  remark-gfm + rehype-raw setup used in app/tutor/components/ChatMessage.tsx),
  in a panel or modal with loading + error states. Remove the alert().
- Wire it into app/topics/[topicId]/page.tsx using the topic data already
  loaded there.
- Error handling that mirrors app/tutor/page.tsx: handle each AIServiceError
  code (MISSING_API_KEY, INVALID_API_KEY, RATE_LIMIT, QUOTA_EXCEEDED,
  NETWORK_ERROR, MODEL_NOT_FOUND) with a retry affordance.

Contracts to honor: Topic/Subtopic in lib/types/certification.ts; AIService and
AIServiceError in lib/ai/ai-service.ts / lib/ai/types.ts; the markdown
rendering approach from the tutor components.

Out of scope: persisting deep-dive output; RAG; generating quizzes from the
topic.

Testing: component test with MockAIProvider verifying the call fires with topic
context, markdown renders, loading state shows, and an error path renders a
friendly message instead of an alert. No real network.

Success criteria:
- Clicking "Deep Dive" returns a topic-grounded AI explanation as markdown.
- Errors are surfaced clearly, not as a raw alert.
- Mock provider returns a sensible canned deep-dive without a network call.
- No alert() remains in the component.
```

---

### Phase 14 — Project Polish, Docs & Lint (Priority 7) ★ beyond original plan

**Goal:** Close the housekeeping gaps the audit surfaced (absorbs the former
Phase 12 Steps 12.2–12.4) so the repo is contributor-ready.

#### Step 14.1 — README & docs

- Rewrite [`README.md`](README.md) (currently the `create-next-app`
  boilerplate) covering: project purpose, quick start, AI provider setup,
  certification authoring (data layout in `public/data/certifications/<id>/`
  plus the `config.json` / `topics.json` / `questions.json` schemas), testing,
  and deployment. Cross-link `IMPLEMENTATION_PLAN_UPDATED.md`.
- Confirm [`DEPLOYMENT.md`](DEPLOYMENT.md) is accurate and the Vercel build
  works.

#### Step 14.2 — Lint hardening

- Fix the `catch (error: any)` in [`app/api/chat/route.ts`](app/api/chat/route.ts)
  (≈ line 40) and any other `any` usages; ensure `npm run lint` passes with
  zero warnings.

#### Step 14.3 — Cleanup

- Archive/consolidate `Cline_Chat.txt` and `CLINE_CONVERSATION_SUMMARY.md`.
- Add a doc note clarifying that data lives in `public/data/` (the legacy
  `data/` path does not exist).

#### Step 14.4 — E2E smoke tests (optional)

- Add Playwright with a few critical-path scenarios: start a quiz → answer →
  see results; open AI Tutor → send a mock message; configure provider → save
  → reload. Wire into `package.json` (`npm run test:e2e`) with CI guidance.

**Success criteria**

- [ ] README is accurate and useful for a new contributor
- [ ] `npm run lint` passes with zero warnings
- [ ] No stray `any` types in the chat route
- [ ] Stray Cline docs archived/consolidated
- [ ] (Optional) Playwright smoke suite green locally

**Estimated effort:** 2–3 sessions

#### 🛠️ Spec-define prompt — `project-polish-docs`

```
Define a spec for CertFlow "Project Polish, Docs & Lint"
(slug: project-polish-docs), implementing Phase 14 of
IMPLEMENTATION_PLAN_UPDATED.md.

Goal: Close housekeeping gaps so the repo is contributor-ready — rewrite the
boilerplate README, harden lint, clean up stray docs, and optionally add E2E
smoke tests.

Depends on: best done last (after Phases 8–13) so docs describe the finished
feature set, but the lint fix and cleanup can land anytime.

In scope:
- Rewrite README.md (currently create-next-app boilerplate) covering: project
  purpose; quick start (note: this machine uses nvm — `source ~/.nvm/nvm.sh &&
  nvm use` before npm); AI provider setup; certification authoring (the
  public/data/certifications/<id>/ layout and the config.json / topics.json /
  questions.json schemas from lib/types/certification.ts); testing (vitest
  scripts in package.json); deployment (link DEPLOYMENT.md). Cross-link
  IMPLEMENTATION_PLAN_UPDATED.md.
- Fix app/api/chat/route.ts: replace `catch (error: any)` (≈ line 40) with a
  properly typed unknown + narrowing, and remove any other explicit `any`;
  `npm run lint` must pass with zero warnings.
- Archive/consolidate Cline_Chat.txt and CLINE_CONVERSATION_SUMMARY.md (e.g.
  move under a docs/ or archive/ folder) and add a note clarifying data lives in
  public/data/ (legacy data/ path does not exist).
- (Optional) Add Playwright with critical-path smoke tests: quiz
  setup->answer->results; tutor mock message; settings save->reload. Wire
  `npm run test:e2e` into package.json with CI guidance.

Out of scope: feature changes; new certifications (Phase 12).

Testing: existing vitest suite must stay green; `npm run lint` clean; optional
Playwright suite green locally.

Success criteria:
- README is accurate and useful for a new contributor.
- npm run lint passes with zero warnings; no stray `any` in the chat route.
- Stray Cline docs archived/consolidated.
- (Optional) Playwright smoke suite green locally.
```

---

## 🏗️ Architecture Decisions (carried forward)

The architectural decisions from the original plan still hold — they are
summarised here so this document is self-contained.

1. **State management:** React hooks + Context API. Settings via
   `SettingsContext`; simulator and tutor use local component state +
   `localStorage`. Defer Zustand/Redux until justified.
2. **Data loading:** Static JSON in `public/data/certifications/<id>/`,
   fetched client-side. No backend dependency for content.
3. **AI integration:** Pluggable `AIProvider` interface with a factory in
   `AIService`. Currently 5 providers; new providers only need to
   implement `chat`, `validateConfig`, `testConnection`.
4. **Persistence:** localStorage with JSON serialization for settings,
   active sessions, generated-question cache, and (Phase 11) progress.
5. **AI question generation (Phase 9):**
   - Live, on-demand generation when the curated pool is insufficient
   - Three-layer validation: schema (rule-based) → AI Validator Agent
     (semantic) → human review (flagged-only, future)
   - Mix ratio: 30% curated / 70% generated when both pools are large
     enough; degrade gracefully otherwise
   - Approved questions cached client-side; server-side persistence is
     out of scope until Phase 12+
6. **Component organisation:** feature-based — `app/<feature>/components/`
   for UI, `lib/<feature>/` for business logic, `__tests__/` co-located.

---

## 📋 Priority Summary

| Order | Phase | Theme | Slug | Depends on |
|---|---|---|---|---|
| 1 | Phase 8 | AI Validator Agent | `ai-validator-agent` | — |
| 2 | Phase 9 | AI Question Generation Service | `ai-question-generation` | 8 |
| 3 | Phase 10 | AI-Enhanced Simulator | `ai-enhanced-simulator` | 8, 9 |
| 4 | Phase 11 | Progress Tracking & Weakness Detection | `progress-tracking` | — |
| 5 | Phase 12 | Multi-Certification Support | `multi-certification` | (11 helpful) |
| 6 | Phase 13 ★ | Topic Deep Dive with AI | `topic-deep-dive` | (8 helpful) |
| 7 | Phase 14 ★ | Project Polish, Docs & Lint | `project-polish-docs` | last |

★ = improvement beyond the original plan. Phases 11 and 13 are independent of
the AI generation chain (8→9→10) and may be built in parallel.

---

## 🧪 Testing Standards (carried forward)

- Vitest + React Testing Library + happy-dom (already in place)
- Coverage targets: business logic ≥ 85%, components ≥ 60%, overall ≥ 80%
- Each new module ships with co-located `__tests__`
- AI-dependent code is tested against `MockAIProvider` plus custom
  canned-response providers; never hits a real network in tests
- Tests must pass before committing

---

## 🎯 Success Criteria for This Roadmap

The roadmap is complete when:

- [ ] A user with a real AI key can run a 50-question simulation on a
      certification with only 15 curated questions, with the gap filled
      by AI-generated, validated content
- [ ] Generated questions persist across reloads and are visually
      distinguishable in review
- [ ] Per-topic progress is tracked over time and surfaced as actionable
      weak areas
- [ ] The app supports at least two certifications selectable from the UI
- [ ] The Topic "Deep Dive with AI" button returns a real, topic-grounded AI
      explanation (no `alert()` stub remains)
- [ ] README, deployment doc, and the implementation plan are all
      consistent with reality; `npm run lint` passes with zero warnings
- [ ] All existing tests still pass and new modules meet their coverage
      targets

---

## 📚 Key Reference Files

| Concern | File |
|---|---|
| Certification types | [`lib/types/certification.ts`](lib/types/certification.ts) |
| AI settings types | [`lib/types/ai-settings.ts`](lib/types/ai-settings.ts) |
| Cert loader | [`lib/loaders/certification-loader.ts`](lib/loaders/certification-loader.ts) |
| Quiz session | [`lib/quiz/quiz-session-manager.ts`](lib/quiz/quiz-session-manager.ts) |
| AI service | [`lib/ai/ai-service.ts`](lib/ai/ai-service.ts) |
| AI providers | `lib/ai/providers/*` |
| Settings storage | [`lib/settings/settings-storage.ts`](lib/settings/settings-storage.ts) |
| Settings context | [`lib/contexts/settings-context.tsx`](lib/contexts/settings-context.tsx) |
| Sample certification | [`public/data/certifications/aws-ml/`](public/data/certifications/aws-ml/) |

---

*This document supersedes the original `IMPLEMENTATION_PLAN.md` (now
archived as `IMPLEMENTATION_PLAN_LEGACY.md`). It will be revised again
whenever a phase from 8–14 is completed.*

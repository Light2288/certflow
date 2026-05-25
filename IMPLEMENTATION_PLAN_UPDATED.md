# CertFlow — Implementation Plan (Updated)

> **Status as of:** 2026-05-26
> **Supersedes:** [`IMPLEMENTATION_PLAN_LEGACY.md`](IMPLEMENTATION_PLAN_LEGACY.md)
> **Context:** This document replaces the original `IMPLEMENTATION_PLAN.md`
> after a full audit of the codebase. Phases 0–7 from the original plan are
> **all implemented**. This file records the verified current state and
> defines the next phases (8–12) that pick up the items the original plan
> deferred (AI Validator Agent, AI question generation, AI-enhanced
> simulator, weakness tracking, multi-certification support).

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

### Smaller gaps the audit surfaced

- `README.md` is still the boilerplate `create-next-app` template — needs
  CertFlow-specific content (covered in Phase 12).
- `data/` path referenced in legacy plan does not exist; data lives in
  `public/data/`. Type/path docs should be aligned.
- `generated-questions.json` was promised but not yet present — comes
  online with Phase 9.
- No progress-tracking persistence yet (per-topic performance, history
  beyond current session) — covered in Phase 11.
- No E2E suite — explicitly deferred (Phase 12, optional).

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

---

### Phase 12 — Polish, Multi-Cert, Documentation (Priority 5)

**Goal:** Address the smaller gaps the audit surfaced and make the project
ready for additional certifications beyond AWS ML.

#### Step 12.1 — Multi-certification UI

- `app/components/CertificationSelector.tsx` — dropdown surfacing all
  certifications discovered in `public/data/certifications/`
- Persist current certification id in `AISettings` (rename or add a sibling
  `AppSettings`)
- Update loaders, simulator, topics, and progress modules to use the
  selected cert id rather than the hard-coded `'aws-ml'` string
- Add at least one second certification stub (even just a minimal config +
  3 topics) to prove the abstraction holds

#### Step 12.2 — README & docs

- Rewrite [`README.md`](README.md) covering: project purpose, quick start,
  AI provider setup, certification authoring (data layout,
  config/topics/questions schema), testing, deployment
- Update [`DEPLOYMENT.md`](DEPLOYMENT.md) and confirm Vercel build works
- Cross-link `IMPLEMENTATION_PLAN_UPDATED.md` from README

#### Step 12.3 — E2E smoke tests (optional)

- Add Playwright with a small set of critical-path scenarios:
  start a quiz → answer → see results; open AI Tutor → send mock message;
  configure provider → save → reload
- Wire into `package.json` (`npm run test:e2e`) and CI guidance

#### Step 12.4 — Cleanup

- Remove or archive `Cline_Chat.txt` and consolidate
  `CLINE_CONVERSATION_SUMMARY.md` into the docs folder
- Verify `eslint` clean run; address any `any` types in AI route code
- Add `data/` symlink or doc note clarifying that data lives in `public/`

**Success criteria**

- [ ] User can switch between at least two certifications via UI
- [ ] README is accurate and useful for a new contributor
- [ ] `npm run lint` passes with zero warnings
- [ ] (Optional) Playwright smoke suite green locally

**Estimated effort:** 2–4 sessions

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

| Order | Phase | Theme |
|---|---|---|
| 1 | Phase 8 | AI Validator Agent |
| 2 | Phase 9 | AI Question Generation Service |
| 3 | Phase 10 | AI-Enhanced Simulator |
| 4 | Phase 11 | Progress Tracking & Weakness Detection |
| 5 | Phase 12 | Multi-Cert, Polish, Docs |

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
- [ ] README, deployment doc, and the implementation plan are all
      consistent with reality
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
whenever a phase from 8–12 is completed.*

# CertFlow - Implementation Plan & Current Status

> **📝 Note:** This plan has been updated based on the Cline conversation. See [`CLINE_CONVERSATION_SUMMARY.md`](CLINE_CONVERSATION_SUMMARY.md) for detailed decisions and context.

## 📊 Current Implementation Status

### ✅ COMPLETED (Phase 0-2.1.1)

#### Phase 0: Project Analysis
- ✅ Next.js 16.2.4 with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS v4 for styling
- ✅ Vitest testing framework with coverage
- ✅ Dark mode support

#### Phase 1: Data Foundation
- ✅ **Data Structure** (`/data/certifications/aws-ml/`)
  - [`config.json`](data/certifications/aws-ml/config.json) - Complete certification metadata
  - [`topics.json`](data/certifications/aws-ml/topics.json) - 3 main topics with subtopics (2-level hierarchy)
  - [`questions.json`](data/certifications/aws-ml/questions.json) - 15-20 seed questions (curated)
  - Future: `generated-questions.json` - AI-generated questions (approved)

- ✅ **Type System** ([`lib/types/certification.ts`](lib/types/certification.ts))
  - Complete interfaces for all data structures
  - Support for multiple-choice and multi-select questions
  - Quiz session and result types (ready for future use)
  - Validation types

- ✅ **Certification Loader** ([`lib/loaders/certification-loader.ts`](lib/loaders/certification-loader.ts))
  - Dynamic certification loading by ID
  - Comprehensive validation (config, topics, questions)
  - Helper functions (getQuestionsByTopic, getRandomQuestions, etc.)
  - Full test coverage (48 unit tests + 9 integration tests = 57 total)
  - 85%+ code coverage on critical paths

- ✅ **Testing Infrastructure**
  - Vitest + React Testing Library setup
  - Mock data and test utilities
  - Coverage thresholds configured (75%+)
  - Test documentation in `test/README.md`

#### Phase 2.1: Basic Pages
- ✅ **Pages Created** (All with placeholder content)
  - [`app/page.tsx`](app/page.tsx) - Home page with navigation cards
  - [`app/simulator/page.tsx`](app/simulator/page.tsx) - Simulator placeholder
  - [`app/topics/page.tsx`](app/topics/page.tsx) - Topics placeholder
  - [`app/tutor/page.tsx`](app/tutor/page.tsx) - AI Tutor placeholder
  - [`app/settings/page.tsx`](app/settings/page.tsx) - Settings placeholder

#### Phase 2.1.1: Testing Infrastructure ⭐
- ✅ **Testing Setup**
  - Vitest + React Testing Library configuration
  - Test scripts: `npm test`, `npm run test:coverage`, `npm run test:ui`
  - Coverage thresholds: 75%+ overall, 85%+ on critical code
  
- ✅ **Test Suite** (57 tests total)
  - 48 unit tests for certification loader
    - validateCertificationConfig (8 tests)
    - validateTopics (7 tests)
    - validateQuestion (18 tests)
    - validateQuestions (3 tests)
    - Helper functions (12 tests)
  - 9 integration tests for data loading
    - Full certification loading workflow
    - Error handling scenarios
    - Data validation pipeline
  
- ✅ **Test Utilities**
  - Mock certification data (`test/helpers/mock-data.ts`)
  - Custom render utilities (`test/helpers/test-utils.tsx`)
  - Test documentation (`test/README.md`)
  
- ✅ **Coverage Achieved**
  - certification-loader.ts: 85-90%
  - Validation functions: 90%+
  - Helper functions: 85%+
  - Overall: 75-80%

#### Phase 2.2: Navigation Component ✅
- ✅ **Navigation Component** ([`app/components/Navigation.tsx`](app/components/Navigation.tsx))
  - Responsive design with mobile hamburger menu
  - Active link highlighting based on current route
  - Dark mode support
  - Full accessibility (ARIA labels, semantic HTML)
  - 18 comprehensive tests (100% passing)

- ✅ **Root Layout Update** ([`app/layout.tsx`](app/layout.tsx))
  - Integrated Navigation component
  - Updated metadata title

#### Phase 3.1: Quiz Session Management ✅
- ✅ **Quiz Session Manager** ([`lib/quiz/quiz-session-manager.ts`](lib/quiz/quiz-session-manager.ts))
  - Session creation and management
  - localStorage persistence
  - Answer tracking and validation
  - Question navigation (next, previous, jump to)
  - Session completion and results calculation
  - Progress tracking
  - 34 comprehensive tests (100% passing)

- ✅ **Test Suite** ([`lib/quiz/__tests__/quiz-session-manager.test.ts`](lib/quiz/__tests__/quiz-session-manager.test.ts))
  - Session creation and loading
  - Answer management (multiple-choice and multi-select)
  - Navigation functionality
  - Results calculation
  - localStorage operations
  - Edge cases and error handling

#### Phase 3.2: Simulator UI Components ✅
- ✅ **QuizSetup Component** ([`app/simulator/components/QuizSetup.tsx`](app/simulator/components/QuizSetup.tsx))
  - Question count selector (5-50 questions)
  - Difficulty filter (easy, medium, hard)
  - Topic filter
  - Available questions counter
  - Dynamic filtering and validation

- ✅ **QuestionCard Component** ([`app/simulator/components/QuestionCard.tsx`](app/simulator/components/QuestionCard.tsx))
  - Question display with metadata (difficulty, type)
  - Single-choice and multi-select support
  - Answer selection with visual feedback
  - Navigation controls (previous, next, submit)
  - Answer status indicator

- ✅ **QuizProgress Component** ([`app/simulator/components/QuizProgress.tsx`](app/simulator/components/QuizProgress.tsx))
  - Question counter (current/total)
  - Progress bar with percentage
  - Question status grid (current, answered, unanswered)
  - Visual legend

- ✅ **QuizResults Component** ([`app/simulator/components/QuizResults.tsx`](app/simulator/components/QuizResults.tsx))
  - Score display with pass/fail status
  - Statistics breakdown (correct, incorrect, unanswered)
  - Time spent tracking
  - Review and restart actions

- ✅ **AnswerReview Component** ([`app/simulator/components/AnswerReview.tsx`](app/simulator/components/AnswerReview.tsx))
  - Question-by-question review
  - Correct/incorrect answer highlighting
  - Detailed explanations for each question
  - User answer vs correct answer comparison

- ✅ **Simulator Page Integration** ([`app/simulator/page.tsx`](app/simulator/page.tsx))
  - Complete quiz flow (setup → quiz → results → review)
  - Session state management
  - Active session persistence and recovery
  - Error handling and loading states
  - Responsive layout

### ❌ NOT IMPLEMENTED (Phase 4-7)

#### Phase 4: Topic Map (MVP) (NEXT STEP)
- ❌ Topic list display
- ❌ Topic detail view
- ❌ Subtopic navigation
- ❌ "Deep dive with AI" button (placeholder)

#### Phase 5: AI Tutor (MVP)
- ❌ Chat UI components
- ❌ Message history management
- ❌ AI service integration (stub)

#### Phase 6: Settings Page
- ❌ AI provider selection UI
- ❌ API key input and validation
- ❌ Model selection dropdown
- ❌ localStorage persistence
- ❌ Settings context/hook

#### Phase 7: AI Integration
- ❌ AI service abstraction layer
- ❌ Provider interface definition
- ❌ Ollama provider implementation
- ❌ OpenAI/API provider implementation
- ❌ Error handling and fallbacks

---

## 🎯 Implementation Roadmap

### PHASE 3: SIMULATOR (PRIORITY 1)

#### Step 3.1: Quiz Session Management
**Goal:** Create the core quiz session logic

**Components to Create:**
1. `lib/quiz/quiz-session.ts` - Quiz session manager
   - Create session with random questions
   - Track current question index
   - Store user answers
   - Calculate results

2. `lib/quiz/quiz-storage.ts` - LocalStorage persistence
   - Save/load quiz sessions
   - Store quiz history
   - Track performance per topic

**Types to Add:**
```typescript
interface QuizSessionState {
  sessionId: string;
  certificationId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  startedAt: Date;
  completedAt?: Date;
}
```

#### Step 3.2: Simulator UI Components
**Goal:** Build the quiz interface

**Components to Create:**
1. `app/simulator/components/QuizSetup.tsx`
   - Number of questions selector
   - Difficulty filter
   - Topic filter
   - Start quiz button

2. `app/simulator/components/QuestionCard.tsx`
   - Question display
   - Option selection (radio/checkbox)
   - Navigation buttons (prev/next)
   - Progress indicator

3. `app/simulator/components/QuizProgress.tsx`
   - Question counter (e.g., "5 of 20")
   - Progress bar
   - Timer (optional)

4. `app/simulator/quiz/page.tsx`
   - Main quiz page
   - State management
   - Question navigation logic

#### Step 3.3: Results View
**Goal:** Show quiz results and analysis

**Components to Create:**
1. `app/simulator/results/[sessionId]/page.tsx`
   - Overall score display
   - Correct vs incorrect breakdown
   - Topic-wise performance
   - Review answers button

2. `app/simulator/components/ResultsCard.tsx`
   - Score visualization
   - Performance metrics
   - Recommendations

3. `app/simulator/components/AnswerReview.tsx`
   - Question-by-question review
   - Show correct/incorrect answers
   - Display explanations
   - Highlight user's answer

**Estimated Effort:** 3-4 implementation sessions

---

### PHASE 4: TOPIC MAP (PRIORITY 2)

#### Step 4.1: Topic List Display
**Goal:** Show all certification topics

**Components to Create:**
1. `app/topics/components/TopicCard.tsx`
   - Topic name and description
   - Weight percentage
   - Subtopic count
   - Click to view details

2. `app/topics/page.tsx` (update)
   - Load topics from certification
   - Display topic grid/list
   - Search/filter functionality

#### Step 4.2: Topic Detail View
**Goal:** Deep dive into a specific topic

**Components to Create:**
1. `app/topics/[topicId]/page.tsx`
   - Topic overview
   - Subtopic list with descriptions
   - Key points display
   - "Deep dive with AI" button (placeholder)
   - "Practice this topic" button (links to filtered quiz)

2. `app/topics/components/SubtopicCard.tsx`
   - Subtopic details
   - Key points list
   - Related questions count

**Estimated Effort:** 2-3 implementation sessions

---

### PHASE 5: AI TUTOR (PRIORITY 3)

#### Step 5.1: Chat UI
**Goal:** Create conversational interface

**Components to Create:**
1. `app/tutor/components/ChatMessage.tsx`
   - User/AI message display
   - Markdown support
   - Code highlighting
   - Timestamp

2. `app/tutor/components/ChatInput.tsx`
   - Text input with auto-resize
   - Send button
   - Loading state
   - Character count

3. `app/tutor/components/ChatHistory.tsx`
   - Message list
   - Auto-scroll to bottom
   - Loading indicators

4. `app/tutor/page.tsx` (update)
   - Chat state management
   - Message history
   - Integration with AI service (stub)

#### Step 5.2: AI Service Stub
**Goal:** Prepare for AI integration

**Components to Create:**
1. `lib/ai/ai-service.ts`
   - AI service interface
   - Mock responses for testing
   - Error handling

**Estimated Effort:** 2-3 implementation sessions

---

### PHASE 6: SETTINGS PAGE (PRIORITY 4)

#### Step 6.1: Settings UI
**Goal:** Configure AI providers

**Components to Create:**
1. `app/settings/components/AIProviderSelector.tsx`
   - Provider dropdown (Ollama, OpenAI, Anthropic, etc.)
   - Provider-specific configuration
   - Test connection button

2. `app/settings/components/APIKeyInput.tsx`
   - Secure input field
   - Show/hide toggle
   - Validation feedback

3. `app/settings/components/ModelSelector.tsx`
   - Model dropdown (provider-specific)
   - Model description
   - Performance/cost indicators

4. `app/settings/page.tsx` (update)
   - Settings form
   - Save/reset buttons
   - Success/error messages

#### Step 6.2: Settings Persistence
**Goal:** Store settings locally

**Components to Create:**
1. `lib/settings/settings-storage.ts`
   - Save/load from localStorage
   - Default settings
   - Validation

2. `lib/settings/settings-context.tsx`
   - React context for settings
   - Settings hook
   - Global access

**Types to Add:**
```typescript
interface AISettings {
  provider: 'ollama' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AppSettings {
  ai: AISettings;
  theme: 'light' | 'dark' | 'system';
  selectedCertification: string;
}
```

**Estimated Effort:** 2-3 implementation sessions

---

### PHASE 7: AI INTEGRATION (PRIORITY 5)

#### Step 7.1: AI Service Abstraction
**Goal:** Create provider-agnostic AI layer

**Components to Create:**
1. `lib/ai/types.ts`
   - AI provider interface
   - Request/response types
   - Error types

2. `lib/ai/ai-service.ts` (update)
   - Provider factory
   - Request routing
   - Error handling
   - Retry logic

**Interface Design:**
```typescript
interface AIProvider {
  name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  validateConfig(config: AIConfig): Promise<boolean>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
```

#### Step 7.2: Provider Implementations
**Goal:** Implement specific AI providers

**Components to Create:**
1. `lib/ai/providers/ollama-provider.ts`
   - Ollama API integration
   - Local model support
   - Connection testing

2. `lib/ai/providers/openai-provider.ts`
   - OpenAI API integration
   - Model selection
   - Error handling

3. `lib/ai/providers/anthropic-provider.ts`
   - Anthropic API integration
   - Claude models support

4. `lib/ai/providers/mock-provider.ts`
   - Mock responses for testing
   - No API key required

#### Step 7.3: AI Tutor Integration
**Goal:** Connect AI Tutor to providers

**Updates Required:**
1. Update `app/tutor/page.tsx`
   - Use AI service
   - Handle streaming responses
   - Error handling

2. Create `app/api/chat/route.ts` (optional)
   - Server-side AI calls
   - API key protection
   - Rate limiting

**Estimated Effort:** 4-5 implementation sessions

---

## 🏗️ Architecture Decisions

### 1. State Management
**Decision:** Use React hooks + Context API (no external library)
**Rationale:**
- Simple enough for current scope
- No additional dependencies
- Easy to migrate to Zustand/Redux later if needed

**Implementation:**
- Quiz state: Local component state + localStorage
- Settings: Context API + localStorage
- AI chat: Local component state

**From Cline Discussion:**
- Confirmed incremental approach
- No premature optimization
- Keep MVP simple but extensible

### 2. Data Loading
**Decision:** Client-side fetch from `/data` directory
**Rationale:**
- Static JSON files
- No backend required
- Fast loading
- Easy to add new certifications

**Future:** Can migrate to API routes if needed

### 3. AI Integration
**Decision:** Pluggable provider architecture
**Rationale:**
- User choice of AI provider
- Easy to add new providers
- No vendor lock-in
- Graceful degradation

**Providers to Support:**
1. Ollama (local, free)
2. OpenAI (API, paid)
3. Anthropic (API, paid)
4. Mock (testing, free)

### 4. Progress Tracking
**Decision:** localStorage with JSON serialization
**Rationale:**
- No backend required
- Instant persistence
- Privacy-friendly
- Easy to export/import

**Data Structure:**
```typescript
interface UserProgress {
  certificationId: string;
  quizSessions: QuizSession[];
  topicPerformance: Record<string, TopicPerformance>;
  lastActivity: Date;
}

interface TopicPerformance {
  topicId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  averageScore: number;
  lastPracticed: Date;
}
```

### 5. AI Question Generation (Phase 7)
**Decision:** Hybrid approach with AI Validator Agent

**Key Decisions from Cline Discussion:**
1. **Timing:** Generate questions when user clicks "Start Simulation"
2. **Mix Ratio:** 30% static/old + 70% AI-generated/new
3. **Persistence:** Separate files
   - `questions.json` - Curated seed questions
   - `generated-questions.json` - AI-generated (approved)
4. **Quality Control:** Three-layer validation
   - Layer 1: Schema validation (rule-based)
   - Layer 2: AI Validator Agent (semantic validation)
   - Layer 3: Human oversight (optional, for flagged questions)

**AI Validator Agent:**
- Checks question clarity, topic alignment, answer correctness
- Scores each aspect (0-10)
- Auto-approves high-quality questions (score ≥ 8.0, confidence ≥ 0.85)
- Auto-rejects poor questions (score < 6.0)
- Flags uncertain questions for review (6.0-8.0 or low confidence)

**Benefits:**
- Consistent quality control
- Scalable (can validate 100+ questions quickly)
- Self-improving (learns from patterns)
- Minimal human intervention needed

See [`CLINE_CONVERSATION_SUMMARY.md`](CLINE_CONVERSATION_SUMMARY.md) for detailed validation workflow.

### 6. Component Structure
**Decision:** Feature-based organization
**Rationale:**
- Clear separation of concerns
- Easy to locate components
- Scalable structure

**Structure:**
```
app/
  simulator/
    components/
    quiz/
    results/
  topics/
    [topicId]/
    components/
  tutor/
    components/
  settings/
    components/
lib/
  ai/
    providers/
  quiz/
  settings/
  types/
  loaders/
```

---

## 📋 Next Steps Priority

### Immediate (Current Sprint)
1. **Phase 2.2:** Navigation Component ⬅️ **NEXT STEP**
   - Create header/navigation component
   - Add to root layout
   - Mobile-responsive menu
   - Include tests

2. **Phase 3.1:** Quiz Session Management
   - Create quiz session manager
   - LocalStorage persistence
   - Session state management

3. **Phase 3.2:** Simulator UI
   - Quiz setup component
   - Question card component
   - Progress indicator
   - Navigation between questions

4. **Phase 3.3:** Results View
   - Score display
   - Topic breakdown
   - Answer review

### Short-term (Next Sprint)
5. **Phase 4.1:** Topic Map - List Display
6. **Phase 4.2:** Topic Map - Detail View
7. **Phase 6.1:** Settings UI
8. **Phase 6.2:** Settings Persistence

### Medium-term (Future Sprints)
9. **Phase 5.1:** AI Tutor - Chat UI
10. **Phase 7.1:** AI Service Abstraction
11. **Phase 7.2:** AI Provider Implementations
12. **Phase 7.3:** AI Validator Agent ⭐
    - Three-layer validation system
    - Semantic quality checks
    - Auto-approve/reject logic
13. **Phase 7.4:** Question Generation Service
14. **Phase 7.5:** Enhanced Simulator with AI

### Future Enhancements (Phase 8+)
- AI-powered answer explanations
- Weakness detection and tracking
- Adaptive question selection based on performance
- Topic deep dive with AI
- RAG (Retrieval-Augmented Generation) integration
- Multi-certification support with selector UI
- Progress visualization and insights
- Export/import functionality
- Community certification packs


## 🧪 Testing Strategy

### Testing Stack (Implemented in Phase 2.1.1)
- **Vitest** - Fast, modern test runner with native TypeScript support (10x faster than Jest)
- **React Testing Library** - Component testing with user-centric approach
- **@vitest/coverage-v8** - Code coverage reporting
- **happy-dom** - Fast DOM implementation for component tests

### Coverage Targets
- **Business Logic (Loaders/Validators):** 85-90% coverage ✅
- **Helper Functions:** 80-85% coverage ✅
- **React Components:** 60-70% coverage
- **Overall Project:** 75-80% coverage ✅

### Test Types
1. **Unit Tests** ✅ (Implemented)
   - Individual functions and utilities
   - Validation logic (all rules tested)
   - Helper functions (filtering, querying)
   - Edge cases and error messages
   - **Current:** 48 tests for certification loader

2. **Integration Tests** ✅ (Implemented)
   - Module interactions
   - Full certification loading workflow
   - Data validation pipeline
   - Error scenarios
   - **Current:** 9 tests for data loading

3. **Component Tests** (Ongoing from Phase 2.2+)
   - React component rendering
   - User interactions
   - Props and state changes
   - Accessibility
   - **To be added:** Navigation, quiz UI, settings forms

4. **E2E Tests** (Phase 8+)
   - Complete user flows
   - Critical paths only (5-10 tests)
   - Using Playwright
   - **Deferred:** After core features complete

### Testing Workflow
- **Not strict TDD** - Tests written alongside code
- **Focus on critical paths** - 80%+ coverage on business logic
- **All tests must pass** before committing
- **Coverage reports** generated with each test run

### Test Scripts
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Visual test UI
npm run test:coverage # Generate coverage report
```

### Testing Requirements for New Code
Starting from Phase 2.2, all new code must include:
- ✅ Unit tests for business logic (85%+ coverage)
- ✅ Component tests for UI (60%+ coverage)
- ✅ Integration tests for workflows
- ✅ Tests pass before committing
- ✅ Coverage maintained at 80%+ overall

### Test File Organization
```
lib/
  loaders/
    __tests__/
      certification-loader.test.ts           # Unit tests
      certification-loader.integration.test.ts # Integration tests
app/
  simulator/
    __tests__/
      page.test.tsx                          # Component tests
test/
  helpers/
    mock-data.ts                             # Mock data
    test-utils.tsx                           # Test utilities
  setup.ts                                   # Global setup
  README.md                                  # Testing docs
```

---

## 🎯 Success Criteria

### Phase 3 (Simulator)
- [ ] User can start a quiz with configurable options
- [ ] User can answer questions and navigate between them
- [ ] User sees results with score and topic breakdown
- [ ] Quiz sessions are saved to localStorage
- [ ] User can review answers with explanations

### Phase 4 (Topic Map)
- [ ] User can browse all topics
- [ ] User can view topic details and subtopics
- [ ] User can see key points for each subtopic
- [ ] "Deep dive with AI" button is present (placeholder)

### Phase 5 (AI Tutor)
- [ ] User can send messages in chat interface
- [ ] Chat history is displayed correctly
- [ ] Mock responses work (before AI integration)
- [ ] UI handles loading states

### Phase 6 (Settings)
- [ ] User can select AI provider
- [ ] User can enter API key
- [ ] User can select model
- [ ] Settings persist across sessions
- [ ] Settings are validated

### Phase 7 (AI Integration)
- [ ] AI providers are pluggable
- [ ] At least 2 providers work (Ollama + OpenAI)
- [ ] AI Tutor uses configured provider
- [ ] Errors are handled gracefully
- [ ] User can test connection

---

## 📝 Implementation Guidelines

### For Each Phase:
1. **Read existing code** - Understand current structure
2. **Create types first** - Define interfaces before implementation
3. **Build components** - Start with UI, then add logic
4. **Add tests** - Unit tests for business logic
5. **Test manually** - Verify in browser
6. **Update documentation** - Keep README current

### Code Quality Standards:
- ✅ TypeScript strict mode
- ✅ Proper error handling
- ✅ Loading states for async operations
- ✅ Responsive design (mobile-friendly)
- ✅ Dark mode support
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Clean, readable code with comments
- ✅ Modular, reusable components

### Testing Strategy:
- Unit tests for business logic (quiz, AI service)
- Integration tests for data loading
- Manual testing for UI/UX
- E2E tests (future consideration)

---

## 🚀 Getting Started

### Current State
The project has a solid foundation with:
- Data structure and loading ✅
- Type system ✅
- Basic navigation ✅
- Testing infrastructure ✅

### Next Action
**Start with Phase 2.2: Navigation Component**

This will:
1. Create header/navigation component
2. Add consistent navigation across all pages
3. Include mobile-responsive menu
4. Add component tests (as per testing requirements)
5. Complete the basic navigation structure before moving to simulator

### Command to Run
```bash
npm run dev
```

Then navigate to http://localhost:3000 to see the current state.

---

## 📚 Resources

### Documentation to Update:
- [ ] README.md - Add setup instructions
- [ ] README.md - Add AI configuration guide
- [ ] README.md - Add certification creation guide
- [ ] CONTRIBUTING.md - Add contribution guidelines (future)

### Key Files to Reference:
- [`lib/types/certification.ts`](lib/types/certification.ts) - All type definitions
- [`lib/loaders/certification-loader.ts`](lib/loaders/certification-loader.ts) - Data loading
- [`data/certifications/aws-ml/`](data/certifications/aws-ml/) - Example certification

---

*This plan will be updated as implementation progresses.*
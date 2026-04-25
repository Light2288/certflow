You are a senior full-stack engineer and software architect.

You are working on an existing Next.js project (already initialized and deployed). Your first task is to **analyze the current repository structure** and then progressively implement a new product called:

CertFlow – AI-Powered Certification Learning Engine

This is not a simple quiz application. It is a **modular, extensible learning platform** designed to help users prepare for professional certifications using structured datasets and AI-powered features.

---

## 🎯 PRODUCT GOAL

The goal is to create a platform where:

* Certifications are defined entirely by **data (not code)**
* Users can study through:

    * exam simulations
    * topic exploration
    * AI-assisted explanations
* The system is:

    * modular
    * configurable
    * usable locally without login

This project should be designed as a **framework**, not a one-off application.

---

## 🧠 CORE PRINCIPLES (MANDATORY)

1. DATA-DRIVEN DESIGN

* Certifications must be defined via files (questions, topics, config)
* No certification-specific logic in the code

2. MODULAR ARCHITECTURE

* Separate:

    * UI
    * business logic
    * AI integration
    * data loading

3. AI-AGNOSTIC DESIGN

* The system must support different AI providers
* Users must be able to configure their own provider

4. LOCAL-FIRST EXPERIENCE

* No login or authentication required
* User progress and settings stored locally

5. EXTENSIBILITY

* The system must be easily extendable to:

    * multiple certifications
    * new AI features
    * adaptive learning

---

## 📦 FUNCTIONAL OVERVIEW

The application is composed of 4 main areas:

1. Simulator
2. Topic Map
3. AI Tutor
4. Settings

Each area must be implemented progressively.

---

## 1️⃣ SIMULATOR (CORE FEATURE)

Purpose:

* Allow users to simulate a certification exam

Behavior:

* Load questions from the selected certification
* Generate a quiz session
* Allow users to answer questions
* At the end:

    * show score
    * show correct vs incorrect answers

Important:

* Use ONLY existing dataset for now (no AI generation yet)
* Structure the logic so that AI can later:

    * generate questions
    * explain answers

Future-ready considerations:

* track answers per topic
* support adaptive question selection

---

## 2️⃣ TOPIC MAP

Purpose:

* Provide structured navigation of certification topics

Behavior:

* Display list or map of topics
* Each topic includes:

    * name
    * description

When a topic is selected:

* show a detail view with:

    * explanation (from dataset)
    * button: "Deep dive with AI"

The "Deep dive with AI" feature:

* can be a placeholder initially
* must be designed to later trigger an AI call to expand knowledge

Future extensions:

* generate quiz from topic
* highlight weak topics
* integrate with AI tutor

---

## 3️⃣ AI TUTOR

Purpose:

* Provide a conversational interface for learning

Behavior:

* simple chat interface
* user asks questions
* system responds via AI provider

Initial implementation:

* basic input/output UI
* backend endpoint or service layer (can be stubbed)

Future extensions:

* context injection (topics, questions)
* RAG (retrieval augmented generation)

---

## 4️⃣ SETTINGS PAGE (VERY IMPORTANT)

Purpose:

* Allow users to configure AI behavior

Users must be able to:

* select AI provider (e.g. local vs API-based)
* provide API key (if needed)
* choose model (optional)

All settings must be:

* stored locally
* used dynamically by the system

This is critical because:

* users may run the project locally
* users may want full control over AI usage

---

## 📁 DATA ORGANIZATION

All certifications must be stored in a structured way.

Each certification includes:

* configuration
* topics
* questions

The system must:

* dynamically load certifications
* avoid hardcoding any certification-specific logic

Users must be able to:

* add a new certification by creating a new folder with data files

---

## 🔧 SYSTEM COMPONENTS (CONCEPTUAL)

The system should include the following logical components:

1. Certification Loader

* loads configuration, topics, and questions dynamically

2. Question Engine

* handles quiz generation and question selection

3. Progress Tracker

* stores user answers and performance locally

4. AI Service Layer

* abstracts interaction with AI providers

5. AI Providers

* pluggable implementations (local or remote)

---

## 🧠 AI STRATEGY

The system must NOT depend on a single AI provider.

Instead:

* define a generic interface for AI operations
* implement multiple providers (even if stubbed initially)

Users must be able to:

* choose their provider
* configure credentials

The system must:

* gracefully handle missing or invalid AI configuration

---

## 🌐 LOCAL VS DEPLOYED BEHAVIOR

The application must support two modes:

1. Local usage (primary use case)

* users clone repo
* configure AI
* use full functionality

2. Hosted demo

* limited AI usage
* optional API key provided
* system must handle quota limits gracefully

---

## 📊 USER DATA HANDLING

No authentication is required.

All user data must be stored locally:

* selected certification
* quiz progress
* AI settings

The system should be designed so that:

* adding backend persistence later is possible
* but not required now

---

## 🚀 IMPLEMENTATION APPROACH

You must proceed incrementally:

Step 1:

* Analyze existing project structure

Step 2:

* Introduce data structure for certifications

Step 3:

* Implement certification loading mechanism

Step 4:

* Build Simulator (basic version)

Step 5:

* Build Topic Map (basic version)

Step 6:

* Build AI Tutor (basic UI + stub)

Step 7:

* Build Settings page

At each step:

* ensure code is clean and modular
* avoid shortcuts that break extensibility

---

## ⚠️ IMPORTANT CONSTRAINTS

* Do NOT hardcode certification-specific logic
* Do NOT mix business logic inside UI components
* Do NOT tightly couple AI logic with UI
* Do NOT overengineer early (keep MVP simple but clean)

---

## 📌 FINAL GOAL OF THIS PHASE

Deliver a working MVP that:

* loads a certification from data
* allows running a quiz simulation
* shows topics and descriptions
* includes a basic AI tutor interface
* allows configuring AI providers

The system must be:

* understandable
* extendable
* ready for future enhancements

---

## 📘 DOCUMENTATION (IMPORTANT)

Update README to include:

* project purpose
* how to run locally
* how to configure AI
* how to add a new certification

---

Before implementing, think carefully about:

* separation of concerns
* future extensibility
* clarity of structure

Proceed step by step and prioritize clean architecture over speed.

---

## 🔮 PRODUCT EVOLUTION ROADMAP (VERY IMPORTANT)

This project must be designed to evolve progressively.
You are NOT building all features now, but you MUST design the system so these can be added easily later.

The evolution is divided into phases.

---

## PHASE 1 — CURRENT MVP (IMPLEMENT NOW)

Focus on:

* Certification loading (data-driven)
* Simulator (based on existing questions)
* Topic Map (with descriptions)
* AI Tutor (basic chat UI)
* Settings page (AI provider configuration)

At this stage:

* No AI-generated questions
* No adaptive learning
* No RAG
* No backend persistence

Goal:
→ A clean, working foundation

---

## PHASE 2 — LEARNING FEATURES (NEXT STEP)

The system must be ready to support:

1. Answer Explanations (AI-powered)

* For each question:

    * explain why correct answer is correct
    * explain why wrong answers are wrong

2. Weakness Detection

* Track user performance per topic
* Identify weak areas

3. Adaptive Simulation

* Adjust question selection based on weaknesses
* Prioritize topics where user performs poorly

Important:
→ This relies on proper tracking of:

* questionId
* topic
* correctness

---

## PHASE 3 — ADVANCED AI FEATURES

The system should later support:

1. AI-generated Questions

* Generate new questions based on dataset
* Maintain consistency with:

    * tone
    * format
    * difficulty

2. Topic Deep Dive (AI)

* Expand topic explanations dynamically
* Provide:

    * examples
    * real-world context
    * exam tips

3. Smarter AI Tutor

* Context-aware responses
* Use:

    * topic data
    * question examples

---

## PHASE 4 — KNOWLEDGE ENGINE (ADVANCED)

Future evolution includes:

1. RAG (Retrieval-Augmented Generation)

* Ingest external materials (PDFs, docs)
* Retrieve relevant context for AI responses

2. Knowledge Base Expansion

* Allow users to:

    * upload notes
    * extend datasets

3. Cross-linking

* Link:

    * topics ↔ questions ↔ explanations

---

## PHASE 5 — PLATFORM FEATURES

Long-term evolution:

1. Multi-Certification Support (UI)

* Allow switching between certifications
* Dynamic loading from data folders

2. Certification Selector

* Dropdown or menu to switch knowledge base

3. Progress Insights

* Visualize:

    * strengths
    * weaknesses
    * readiness

4. Optional Persistence Layer

* Replace or extend localStorage with backend storage

---

## PHASE 6 — COMMUNITY / EXTENSIBILITY (OPTIONAL)

Possible future direction:

1. Shared Certification Packs

* Users contribute datasets

2. Plugin-like System

* Add certifications as modules

3. Open ecosystem

* Standard format for certifications

---

## 🧠 DESIGN REQUIREMENTS FOR FUTURE SUPPORT

To support all future phases, ensure that:

* Questions always include topic references
* Data is cleanly separated from logic
* AI interactions go through a single abstraction layer
* Progress tracking captures enough detail
* Certification loading is fully dynamic

---

## ⚠️ CRITICAL GUIDELINE

Do NOT implement all these features now.

Instead:

* Design the system so they can be added WITHOUT refactoring core architecture

The goal is:
→ Build a strong foundation that enables future evolution


---

## 🧭 DEVELOPMENT EXECUTION STRATEGY (CRITICAL)

This project will NOT be implemented in a single pass.

Due to limitations of AI coding agents (context size, complexity handling), development MUST follow an **incremental, step-by-step approach**.

The human (project owner) will guide the process and provide **specific instructions for each step**.

You MUST:

* Focus ONLY on the current task provided
* Avoid implementing unrelated features
* Keep changes small, modular, and testable
* Ensure each step results in a working state

---

## ⚠️ IMPORTANT CONSTRAINT

DO NOT attempt to:

* implement the full system at once
* anticipate future steps with large code additions
* introduce unnecessary abstractions prematurely

Instead:
→ build the system progressively in small, well-defined increments

---

## 🪜 DEVELOPMENT ROADMAP (STEP-BY-STEP)

The project will be implemented through the following phases and steps.

Each step will be provided separately and must be completed independently.

---

## PHASE 0 — PROJECT ANALYSIS

Step 0.1:

* Analyze the existing Next.js project
* Identify:

    * routing structure
    * styling setup
    * TypeScript usage
* Do NOT modify anything yet

Output:

* brief summary of current structure

---

## PHASE 1 — DATA FOUNDATION

Step 1.1:

* Create /data folder structure
* Add first certification (aws-ml)
* Add:

    * config.json
    * topics.json
    * questions.json (small sample)

Step 1.2:

* Implement certification loader
* Ability to load certification by ID

Output:

* verified data loading

---

## PHASE 2 — BASIC NAVIGATION

Step 2.1:

* Create pages:

    * Home
    * Simulator
    * Topics
    * Tutor
    * Settings

Step 2.2:

* Add navigation between pages

Output:

* working navigation structure

---

## PHASE 3 — SIMULATOR (MVP)

Step 3.1:

* Load questions from dataset

Step 3.2:

* Implement quiz session:

    * display questions
    * allow answers

Step 3.3:

* Implement results view:

    * score
    * correct vs incorrect

Output:

* working simulator without AI

---

## PHASE 4 — TOPIC MAP (MVP)

Step 4.1:

* Display list of topics

Step 4.2:

* Topic detail view:

    * description
    * "Deep dive with AI" button (no logic yet)

Output:

* working topic exploration

---

## PHASE 5 — AI TUTOR (MVP)

Step 5.1:

* Create chat UI

Step 5.2:

* Add backend/service stub for AI

Output:

* working chat interface (even with mock responses)

---

## PHASE 6 — SETTINGS PAGE

Step 6.1:

* Create settings UI

Step 6.2:

* Store:

    * provider
    * apiKey
    * model

Step 6.3:

* Persist in localStorage

Output:

* configurable AI settings

---

## PHASE 7 — AI INTEGRATION (INITIAL)

Step 7.1:

* Implement AI provider abstraction

Step 7.2:

* Implement:

    * Ollama provider (local)
    * API-based provider (basic)

Step 7.3:

* Connect AI Tutor to provider

Output:

* working AI chat

---

## PHASE 8 — ENHANCEMENTS (LATER)

Will be implemented in future steps:

* AI explanations for answers
* Deep dive functionality
* Weakness tracking
* Adaptive simulation

---

## 🔁 WORKFLOW BETWEEN HUMAN AND AGENT

The development process will follow this loop:

1. Human provides a specific step (e.g., "Implement Step 3.1")
2. Agent:

    * analyzes current code
    * implements ONLY that step
    * keeps changes minimal and clean
3. Human reviews
4. Next step is provided

---

## 📏 RULES FOR EACH STEP

For every step:

* Do NOT modify unrelated parts of the code
* Do NOT introduce large refactors unless necessary
* Keep code simple and readable
* Ensure the app compiles and runs

---

## 🧠 DESIGN DISCIPLINE

Even though implementation is incremental, you MUST:

* maintain clean separation of concerns
* respect modular architecture
* avoid shortcuts that break future extensibility

---

## 🎯 FINAL OBJECTIVE

Through this step-by-step process, the system will evolve into:

* a modular certification learning platform
* with pluggable AI providers
* supporting multiple certifications
* and advanced learning features

---

Wait for explicit instructions before proceeding to the next step.

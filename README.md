# CertFlow

CertFlow is an AI-augmented certification study platform built with Next.js.
It combines a curated question bank with pluggable AI providers to offer an
exam simulator, an AI tutor, topic deep dives, and progress tracking across
multiple certifications — all running entirely in the browser with no backend
required for content.

## Features

- **Exam Simulator** — configurable practice quizzes (count, difficulty, topic
  filter) with per-question review, explanations, and pass/fail scoring.
- **AI Tutor** — a provider-backed chat assistant grounded in the selected
  certification.
- **Topic Map & Deep Dive** — browse exam topics and subtopics, and expand any
  topic into an AI-generated deep dive (overview, worked examples, real-world
  context, exam tips).
- **AI Question Generation & Validation** — generate additional questions on
  demand and score them for clarity, topic alignment, and correctness.
- **Progress Tracking** — per-topic performance and weakness detection over
  time.
- **Multi-Certification** — switch between certifications defined purely as
  data (ships with Snowflake SnowPro Core, AWS Certified Developer –
  Associate, and AWS Certified Data Engineer – Associate).
- **Multiple AI Providers** — Mock (offline demo), OpenAI, Anthropic, Google
  (Gemini), Ollama (local), and custom OpenAI-compatible endpoints.
- **Global Footer** — every page carries a footer with a "Buy me a coffee"
  donation link, project/license links, an AI-content disclaimer, and the
  current app version.

## Quick Start

> **Note:** this project is developed with [nvm](https://github.com/nvm-sh/nvm).
> Run `source ~/.nvm/nvm.sh && nvm use` first to select the project's Node
> version. If you don't use nvm, ensure you're on a recent LTS Node release.

```bash
# Select the project Node version (nvm users)
source ~/.nvm/nvm.sh && nvm use

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app works out of the box with the built-in **Mock** provider — no API key
required. To use a real AI provider, configure it in **Settings** (see below).

## AI Provider Setup

CertFlow talks to AI providers through a pluggable interface. Provider choice,
API key, model, and other options are configured in the app's **Settings**
page and persisted to `localStorage` (nothing is sent to a CertFlow server).

Supported providers (see [`lib/types/ai-settings.ts`](lib/types/ai-settings.ts)):

| Provider | API key | Notes |
|----------|---------|-------|
| **Mock** | No | Pre-defined responses; ideal for demos, tests, and offline use. |
| **OpenAI** | Yes | GPT models via the `openai` SDK. |
| **Anthropic** | Yes | Claude models via the `@anthropic-ai/sdk`. |
| **Google (Gemini)** | Yes | Gemini models via `@google/generative-ai`. |
| **Ollama** | No | Local models via the `ollama` package (server-side; runs through the `/api/chat` route). |
| **Custom** | Yes | Any OpenAI-compatible endpoint (set a base URL). |

To configure:

1. Open **Settings** in the navigation bar.
2. Select a provider.
3. Enter an API key (for providers that require one) and pick a model.
4. Save. Settings persist across reloads in the same browser.

## Certification Authoring

All certification content is **static JSON served from
`public/data/certifications/`** — there is no database and no legacy `data/`
directory (that path does not exist). Each certification lives in its own
folder keyed by id:

```text
public/data/certifications/
├── index.json                 # manifest listing all certifications
├── snowpro-core/
│   ├── config.json            # certification metadata + exam details
│   ├── topics.json            # topics and subtopics
│   └── questions.json         # curated question bank
├── aws-developer-associate/
│   ├── config.json
│   ├── topics.json
│   └── questions.json
└── aws-data-engineer-associate/
    ├── config.json
    ├── topics.json
    └── questions.json
```

To add a certification: create a new `public/data/certifications/<id>/`
folder with the three files below, then add an entry to
`public/data/certifications/index.json`. The canonical TypeScript definitions
for every shape live in [`lib/types/certification.ts`](lib/types/certification.ts).

### `index.json` (manifest)

```json
{
  "certifications": [
    { "id": "aws-developer-associate", "name": "AWS Certified Developer - Associate", "code": "DVA-C02" }
  ]
}
```

### `config.json` (`CertificationConfig`)

```json
{
  "id": "aws-developer-associate",
  "name": "AWS Certified Developer - Associate",
  "code": "DVA-C02",
  "version": "1.0",
  "description": "Validates proficiency in developing, testing, deploying, and debugging AWS cloud-based applications.",
  "provider": "Amazon Web Services",
  "examDetails": {
    "duration": 130,
    "questionCount": 65,
    "passingScore": 720,
    "scoreRange": { "min": 100, "max": 1000 }
  },
  "metadata": {
    "lastUpdated": "2024-12-12",
    "difficulty": "intermediate",
    "prerequisites": ["1 or more years of hands-on experience developing AWS applications"],
    "officialUrl": "https://aws.amazon.com/certification/certified-developer-associate/"
  }
}
```

### `topics.json` (`TopicsData`)

```json
{
  "topics": [
    {
      "id": "data-engineering",
      "name": "Data Engineering",
      "description": "Creating data repositories, ingestion, and transformation for ML.",
      "weight": 20,
      "order": 1,
      "subtopics": [
        {
          "id": "data-repositories",
          "name": "Data Repositories for ML",
          "description": "AWS storage services for ML workloads.",
          "keyPoints": [
            "S3 for large-scale data storage and data lakes",
            "Data Lakes vs Data Warehouses",
            "SageMaker Feature Store"
          ]
        }
      ]
    }
  ]
}
```

### `questions.json` (`QuestionsData`)

```json
{
  "questions": [
    {
      "id": "q001",
      "topicId": "data-engineering",
      "subtopicId": "data-repositories",
      "type": "multiple-choice",
      "difficulty": "medium",
      "question": "Which storage solution provides the best cost-performance balance?",
      "options": [
        { "id": "a", "text": "Amazon S3 Standard" },
        { "id": "b", "text": "Amazon S3 Intelligent-Tiering" },
        { "id": "c", "text": "Amazon EFS" },
        { "id": "d", "text": "Amazon EBS" }
      ],
      "correctAnswer": "b",
      "explanation": {
        "correct": "S3 Intelligent-Tiering automatically moves data between access tiers.",
        "whyOthersWrong": {
          "a": "S3 Standard keeps high-cost frequent-access pricing.",
          "c": "EFS is more expensive for large-scale storage.",
          "d": "EBS is not suited to shared 500 TB training data."
        }
      },
      "references": ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html"],
      "tags": ["storage", "s3", "cost-optimization"],
      "metadata": { "createdAt": "2024-01-15", "lastReviewed": "2024-01-15", "source": "official-guide" }
    }
  ]
}
```

Field notes:

- `type` is `"multiple-choice"` or `"multi-select"`.
- `difficulty` is `"easy"`, `"medium"`, or `"hard"`.
- `correctAnswer` is a string for `multiple-choice` and a string array for
  `multi-select`.
- `explanation.whyOthersWrong` maps each incorrect option id to a short
  explanation.

## Testing

CertFlow uses [Vitest](https://vitest.dev) with React Testing Library and
happy-dom. AI-dependent code is tested against the Mock provider and never hits
a real network.

```bash
npm test              # run tests in watch mode
npm run test:run      # run once (CI)
npm run test:ui       # Vitest UI
npm run test:coverage # run once with coverage
npm run lint          # ESLint
```

## Deployment

```bash
npm run build   # production build
npm start       # serve the production build
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for platform-specific configuration
(Vercel, Netlify, Railway, Render) and troubleshooting.

## Architecture & Roadmap

- State is managed with React hooks and Context (`SettingsProvider`); content
  is static JSON under `public/data/`; AI access goes through a pluggable
  `AIProvider` interface behind `AIService`.
- The full implementation history and remaining roadmap are tracked in
  [`IMPLEMENTATION_PLAN_UPDATED.md`](IMPLEMENTATION_PLAN_UPDATED.md).

## License

Released under the [MIT License](LICENSE) — Copyright (c) 2026 Light.

The `package.json` still carries `"private": true`, which only prevents
accidental publication to the npm registry; it does not restrict use of the
source, which is governed by the MIT License above.

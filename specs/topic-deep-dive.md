# Topic Deep Dive with AI

| Field         | Value                                                    |
|---------------|----------------------------------------------------------|
| **Title**     | Topic Deep Dive with AI                                  |
| **Type**      | feature                                                  |
| **Scope**     | Topic detail page — `DeepDiveButton` and AI deep-dive path |
| **Created**   | 2026-07-07 00:00:00                                     |
| **Status**    | IMPLEMENTED                                              |

## Problem Statement

The "Deep Dive with AI" button on the topic detail page is a placeholder.
[`app/topics/[topicId]/components/DeepDiveButton.tsx`](app/topics/[topicId]/components/DeepDiveButton.tsx)
only fires `alert("AI Deep Dive feature coming soon for <topicName>!")`, ignores
its `topicId` prop, and makes no AI call. This leaves the "Deep dive with AI"
item from the original `prompt.md` unfulfilled and presents a broken-feeling
feature to users. Phase 13 of `IMPLEMENTATION_PLAN_UPDATED.md` calls for
replacing the stub with a real, topic-grounded AI explanation.

## Desired Outcome

Clicking "Deep Dive with AI" on a topic detail page calls the user's configured
AI provider (via `getAIService()`), passing the topic's `name`, `description`,
and `keyPoints` as grounding context, and requests a structured markdown
explanation covering: an overview, worked examples, real-world context, and exam
tips. The response renders as markdown in an **inline expandable panel** on the
topic detail page (below the button), reusing the tutor's `react-markdown` +
`remark-gfm` + `rehype-raw` setup. The panel shows a loading state while the call
is in flight and a friendly, per-error-code message with a retry affordance on
failure. The `alert()` is removed entirely. With the mock provider configured,
the feature returns a sensible canned deep-dive without any network call.

## Current Behavior

- `DeepDiveButton` renders a styled button; `onClick` calls
  `alert("AI Deep Dive feature coming soon for ${topicName}!")`.
- The `topicId` prop is accepted but never used.
- No AI call, no markdown rendering, no loading/error handling.

## Acceptance Criteria

- [ ] Clicking "Deep Dive with AI" triggers a call through `getAIService()` from
      [`lib/ai/ai-service.ts`](lib/ai/ai-service.ts) that includes the topic's
      `name`, `description`, and `keyPoints` in the prompt context.
- [ ] The AI response is requested and rendered as markdown covering overview,
      worked examples, real-world context, and exam tips, using the same
      `react-markdown` + `remark-gfm` + `rehype-raw` rendering approach as
      [`app/tutor/components/ChatMessage.tsx`](app/tutor/components/ChatMessage.tsx).
- [ ] The result renders in an **inline expandable panel** on the topic detail
      page (not a modal), directly associated with the button.
- [ ] While the call is in flight, a loading state is shown in the panel.
- [ ] On failure, each `AIServiceError` code — `MISSING_API_KEY`,
      `INVALID_API_KEY`, `RATE_LIMIT`, `QUOTA_EXCEEDED`, `NETWORK_ERROR`,
      `MODEL_NOT_FOUND` — surfaces a clear, user-friendly message (mirroring
      [`app/tutor/page.tsx`](app/tutor/page.tsx)), with a retry affordance.
      Errors are never surfaced via `alert()`.
- [ ] The feature is wired into
      [`app/topics/[topicId]/page.tsx`](app/topics/[topicId]/page.tsx) using the
      topic data already loaded on that page.
- [ ] With the mock provider configured, "Deep Dive" returns a sensible canned
      response without any network call.
- [ ] A generated deep-dive is cached in component/page memory for the current
      page visit, so re-opening the panel within the same visit does not trigger
      a fresh AI call.
- [ ] No `alert()` call remains anywhere in `DeepDiveButton.tsx`.
- [ ] A component test using `MockAIProvider` verifies: the call fires with the
      topic context, markdown renders, the loading state shows, and an error path
      renders a friendly message (not an alert). No test hits a real network.

## Edge Cases & Error Handling

- **No/invalid API key** (`MISSING_API_KEY`, `INVALID_API_KEY`): show a clear
  message telling the user to configure their provider in Settings; offer retry.
- **Rate limit / quota** (`RATE_LIMIT`, `QUOTA_EXCEEDED`): show the specific
  message and let the user retry.
- **Network / model errors** (`NETWORK_ERROR`, `MODEL_NOT_FOUND`): show the
  specific message with retry.
- **Empty or malformed AI response**: surface a friendly fallback message rather
  than rendering blank or crashing.
- **Re-opening the panel in the same visit**: serve the cached in-memory result
  instead of re-calling the provider.
- **Topic with no or empty `keyPoints`**: still produce a grounded prompt from
  `name` and `description` without erroring.

## Dependencies & Constraints

- Builds on the existing Phase 7 AI layer:
  [`lib/ai/ai-service.ts`](lib/ai/ai-service.ts) and the
  `AIProvider` / `ChatMessage` / `ChatResponse` / `AIServiceError` contract in
  [`lib/ai/types.ts`](lib/ai/types.ts). No new provider work.
- Must honor the `Topic` / `Subtopic` types in
  [`lib/types/certification.ts`](lib/types/certification.ts).
- Reuse the markdown rendering stack already used by the tutor components
  (`react-markdown`, `remark-gfm`, `rehype-raw`).
- Deep-dive prompt/call path lives in a focused helper (e.g. `lib/ai/deep-dive/`
  or an equivalent focused module).
- Client-side only; runs against the user's configured provider.
- Benefits from Phase 8 patterns but does not require the validator or generator.

## Out of Scope

- Persisting deep-dive output to `localStorage` or disk (in-memory-only caching
  for the current visit is allowed).
- Retrieval-augmented generation (RAG).
- Generating quizzes or questions from the topic.
- Any modal/overlay presentation (an inline expandable panel is required).
- Changes to other AI providers or the AI service contract.

## Notes

- Reference: Phase 13 of `IMPLEMENTATION_PLAN_UPDATED.md` (slug `topic-deep-dive`),
  including its embedded spec-define prompt.
- Presentation decision (inline panel vs. modal) and in-memory caching were
  confirmed with the user during definition.

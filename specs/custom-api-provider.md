# Custom API Provider

| Field         | Value                                                       |
|---------------|-------------------------------------------------------------|
| **Title**     | Custom API Provider                                         |
| **Type**      | feature                                                     |
| **Scope**     | lib/ai/ (providers, ai-service), lib/types/ai-settings.ts, app/settings/ |
| **Created**   | 2026-07-21 00:00:00                                         |
| **Status**    | IMPLEMENTED                                                 |

## Problem Statement

The Settings page already advertises a "Custom API" provider option
(`provider: 'custom'`, with `apiKey` and `baseUrl` fields), but it is not
implemented. `AIService.createProvider()` has no `custom` case, so selecting
it silently falls back to the mock provider (canned demo responses) with no
error and no real endpoint call. This is misleading and means the app cannot
be connected to an OpenAI-compatible endpoint.

The concrete motivation is to use an IBM Consulting Advantage (ICA)
subscription — which serves Claude and GPT models through an OpenAI-compatible
gateway — to test the app's AI features (exam question generation, the
validator, and the tutor) without paying OpenAI/Anthropic directly or relying
only on Gemini's free tier.

## Current Behavior

- Selecting "Custom API" in Settings → the app silently uses the mock
  provider. No error, no real endpoint call.
- The OpenAI/Anthropic providers are hardwired to their official endpoints,
  so an IBM (or any custom) key cannot be used with them.

## Desired Outcome

- A real Custom API provider that talks to any OpenAI-compatible
  chat-completions endpoint using a user-supplied base URL and API key
  (Bearer token).
- It works end-to-end for all three AI features that flow through
  `AIService.chat()`: tutor chat, question generation, and validation —
  including the server-side `/api/generate-questions` route and the tutor's
  `/api/chat` route (a custom endpoint may or may not be reachable from the
  browser).
- The implementation reuses the existing OpenAI SDK with a `baseURL`
  override (the endpoint is OpenAI-compatible) rather than a bespoke HTTP
  client, unless there is a good reason not to.
- It supports the same capabilities the other providers already support:
  passing the system message (for exam grounding / generator + validator
  prompts), `temperature`/`maxTokens`, and reporting token usage (from the
  OpenAI-style `usage` field) so the generating page's token counter works.
- The Custom provider is fully generic: base URL, API key, and model are
  empty by default and entered by the user. IBM ICA is the concrete
  verification target, not a hardwired default.

## Acceptance Criteria

- [ ] Choosing "Custom API" in Settings with a base URL + API key actually
      calls that endpoint — no silent mock fallback.
- [ ] The tutor answers using the custom endpoint, with the
      certification/exam system prompt honored.
- [ ] Question generation and validation run through the custom endpoint
      (via the server route), producing real AI questions and scores.
- [ ] Token usage is reported and shown on the generating page.
- [ ] The Settings UI lets the user enter base URL, API key, and a
      free-text model name for the Custom provider. Base URL and API key are
      required.
- [ ] The model field is required for the Custom provider: leaving it blank
      fails with a clear validation/error message (no silent default model).
- [ ] There is a sensible validation/error message if the endpoint is
      unreachable or returns an error, surfaced consistently with the other
      providers.
- [ ] The base URL can be pointed at the IBM ICA chat-models namespace and
      successfully generate questions / use the tutor.
- [ ] Existing simulator / tutor / provider tests remain green; the custom
      endpoint is mockable in tests (no real network).

## Edge Cases & Error Handling

- **Base URL with/without trailing path or slash**: handle gracefully so the
  SDK builds the correct `/chat/completions` URL regardless of whether the
  user includes or omits a trailing segment/slash.
- **Missing base URL or API key**: fail clearly rather than falling back to
  the mock provider.
- **Missing model**: fail with a clear error rather than sending a default
  model id.
- **Endpoint errors** (401/403 auth, 404 wrong path, 429 rate limit, 5xx):
  surface as friendly provider errors, consistent with how
  OpenAI/Anthropic/Google errors are handled today.
- **Reachability**: because a custom endpoint may not be reachable from the
  browser, the three features must work via their server routes
  (`/api/generate-questions`, `/api/chat`).

## Dependencies & Constraints

- Reuse the existing `openai` SDK dependency with a `baseURL` override.
- Must integrate with the existing `AIProvider` interface, `AIService`
  provider factory (`createProvider`), and `AIConfig`/`AISettings` types.
- Error surfacing must match the existing pattern (`AIServiceError` with
  friendly messages and error codes as used by the OpenAI provider).
- Token usage mapping follows the existing OpenAI-style
  `prompt_tokens`/`completion_tokens`/`total_tokens` → `promptTokens`/
  `completionTokens`/`totalTokens` convention.

### IBM ICA verification target (concrete endpoint)

- **Base API URL**: `https://api.nextgen-beta.ica.ibm.com/ica/v1`
- **Auth**: `Authorization: Bearer <developer API key>` (OpenAI-style).
- **Chat endpoint (raw models namespace)**:
  `POST /ica/v1/chat-models/chat/completions` — i.e. for the OpenAI SDK,
  `baseURL = https://api.nextgen-beta.ica.ibm.com/ica/v1/chat-models`
  (the SDK appends `/chat/completions`).
- **Request/response shape** is OpenAI-compatible
  (`ChatCompletionRequest`/`ChatCompletionResponse`).
- **Model id** is chosen by the user (from `GET /chat-models/models`) and
  passed as the OpenAI `model` field — hence a free-text model field in
  Settings (no fixed dropdown list).
- **Docs**:
  `https://nextgen-beta.ica.ibm.com/ica/services/apis/docs/swagger-ui/index.html`

## Out of Scope

- IBM ICA-specific features beyond chat (Files, Document Collections,
  Assistants/Agents/Digital-Workforce namespaces) — only the chat-models
  OpenAI-compatible chat path is needed.
- Any IBM-specific auth beyond a Bearer API key (no IAM token exchange /
  `project_id` handling), since ICA uses a plain OpenAI-style bearer key.
- Streaming responses (the other providers in this app do not stream).

## Notes

This is essentially "make the already-advertised Custom API option real,"
using the OpenAI SDK's `baseURL` override, and verified against IBM ICA as
the concrete test target.

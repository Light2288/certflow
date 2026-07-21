# Plan: Custom API Provider

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Custom API Provider                |
| **Spec**     | specs/custom-api-provider.md       |
| **Type**     | feature                            |
| **Branch**   | feat/custom-api-provider           |
| **Created**  | 2026-07-21 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The Settings page advertises a "Custom API" provider, but `AIService.createProvider()`
has no `custom` case, so selecting it silently falls back to the mock provider. This
plan implements a real Custom provider that talks to any OpenAI-compatible
chat-completions endpoint using a user-supplied base URL, API key (Bearer token), and
free-text model — reusing the existing `openai` SDK with a `baseURL` override — and
wires the three AI features (tutor, question generation, validation) to route through
it. IBM Consulting Advantage (ICA) is the concrete verification target.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. This repo's
> base is `develop`. The branch name is `feat/custom-api-provider`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout develop && git pull --ff-only && git checkout -b feat/custom-api-provider
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

Branch type mapping:

- feature → `feat/<slug>`

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one commit.

## Build & Test Commands

| Action | Command          |
|--------|------------------|
| Test   | `npm run test:run` |
| Build  | `npm run build`  |
| Lint   | `npm run lint`   |

## Tasks

### Task 1: Implement the Custom API provider `[M]`

**Goal**: Add a `CustomProvider` that calls any OpenAI-compatible chat-completions
endpoint via the OpenAI SDK with a `baseURL` override, requiring base URL, API key,
and model, and surfacing friendly errors.

**Files**:

| File                                       | Action | Description                                   |
|--------------------------------------------|--------|-----------------------------------------------|
| `lib/ai/providers/custom-provider.ts`      | create | New `CustomProvider implements AIProvider`.   |

**Reuse**:

| File                                    | What to reuse                                                            |
|-----------------------------------------|--------------------------------------------------------------------------|
| `lib/ai/providers/openai-provider.ts`   | Overall structure: SDK usage, message mapping (system role flows through history), `usage` → `promptTokens/completionTokens/totalTokens` mapping, `mapFinishReason`, `getErrorMessage`/`getErrorCode` status handling (401/403/404/429/5xx). |
| `lib/ai/types.ts`                       | `AIProvider`, `ChatMessage`, `ChatOptions`, `ChatResponse`, `AIConfig`, `AIServiceError`. |
| `openai` SDK (`new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser })`) | `baseURL` override — the SDK appends `/chat/completions`. |

**Steps**:

1. Create `CustomProvider` with `readonly name = 'custom'`, storing `config` and
   lazily building an `OpenAI` client only when `baseUrl` and `apiKey` are both
   present. Pass `baseURL: normalizeBaseUrl(config.baseUrl)`, `apiKey`, and
   `dangerouslyAllowBrowser: true` (matches OpenAI provider; server routing is added
   in Task 3 but client construction must not crash).
2. Add a private `normalizeBaseUrl(url)` helper: trim whitespace, strip any trailing
   slash(es) so the SDK builds a correct `<baseUrl>/chat/completions` URL regardless
   of whether the user included a trailing slash. Do not otherwise rewrite the path
   (the user supplies the full namespace, e.g. `.../ica/v1/chat-models`).
3. In `chat()`: throw `AIServiceError('Custom API base URL not configured', 'MISSING_BASE_URL', 'custom')`
   if base URL missing; `('Custom API key not configured', 'MISSING_API_KEY', 'custom')`
   if API key missing; and `('Custom API model not configured', 'MISSING_MODEL', 'custom')`
   if no model is resolvable from `options.model`/`config.model` (no silent default —
   per spec, model is required). These must fire before any network call so there is
   no silent mock fallback.
4. Build the messages array exactly like the OpenAI provider: map `history`
   (preserving `system`/`user`/`assistant` roles so the exam/tutor system prompt is
   honored) then append the current user message. Call
   `client.chat.completions.create({ model, messages, temperature, max_tokens })`.
5. Map the response like the OpenAI provider: extract `choices[0].message.content`
   (throw `EMPTY_RESPONSE` if absent), map `usage` to
   `promptTokens/completionTokens/totalTokens`, return `model` and mapped
   `finishReason`.
6. Reuse the OpenAI provider's error handling shape: on an error object with `status`,
   map 401/403 → invalid/forbidden key, 404 → endpoint/path not found, 429 → rate
   limit, 5xx → service unavailable, else the error message; otherwise a generic
   `REQUEST_FAILED`. Use provider name `'custom'` and phrase messages generically
   (e.g. "custom API endpoint") so they read sensibly for any endpoint.
7. Implement `validateConfig(config)`: return `false` unless
   `config.provider === 'custom'`, `config.baseUrl` is a non-empty trimmed string,
   `config.apiKey` is a non-empty trimmed string, and `config.model` is a non-empty
   trimmed string. Do not enforce an `sk-` prefix (custom keys are arbitrary).
8. Implement `testConnection()`: return `false` if the client is not built; otherwise
   make a minimal `create({ model, messages: [{role:'user',content:'test'}], max_tokens: 5 })`
   and return `true`/`false` in a try/catch (mirrors OpenAI provider).

**Tests**:

- New `lib/ai/providers/__tests__/custom-provider.test.ts`, modeled on
  `openai-provider.test.ts` (mock the `openai` module the same way — no real network).
  Cover: successful chat with `baseURL` passed to the SDK constructor; system message
  in history is forwarded; `usage` mapping; base URL trailing-slash normalization
  (constructor receives normalized `baseURL`); missing base URL / API key / model each
  throw the specific `AIServiceError` code before any `create` call; 401/403/404/429/503
  error mapping; empty-response handling; `validateConfig` accept/reject cases; and
  `testConnection` true/false/no-client.

**Acceptance criteria covered**: real endpoint call (no mock fallback); system prompt
honored; token usage reported; error surfacing; missing base URL/key/model failures;
trailing-slash normalization; endpoint mockable in tests.

**Commit**: `feat(ai): add OpenAI-compatible custom API provider`

---

### Task 2: Wire the Custom provider into AIService `[S]`

**Goal**: Route `provider: 'custom'` to the new `CustomProvider` in the service factory
so no config silently falls back to mock.

**Files**:

| File                       | Action | Description                                        |
|----------------------------|--------|----------------------------------------------------|
| `lib/ai/ai-service.ts`     | modify | Import `CustomProvider`; add `case 'custom'`.      |

**Reuse**:

| File                       | What to reuse                                             |
|----------------------------|----------------------------------------------------------|
| `lib/ai/ai-service.ts`     | Existing `createProvider` switch and import style.        |

**Steps**:

1. Add `import { CustomProvider } from './providers/custom-provider';` alongside the
   other static provider imports. (The OpenAI SDK is already client-safe via
   `dangerouslyAllowBrowser`, so a static import is consistent with OpenAI/Anthropic;
   no lazy wrapper needed like Ollama.)
2. Add `case 'custom': return new CustomProvider(config);` to `createProvider`, before
   the `default` mock fallback.

**Tests**:

- Extend `lib/ai/__tests__/ai-service.test.ts` "Provider Creation" block with a test
  that `new AIService({ provider: 'custom', apiKey: '...', baseUrl: '...', model: '...' })`
  yields `getProviderName() === 'custom'` (not `'mock'`).

**Acceptance criteria covered**: choosing Custom API actually uses the custom provider
(no silent mock fallback).

**Commit**: `feat(ai): route custom provider in AIService factory`

---

### Task 3: Route tutor and deep-dive through the server for the Custom provider `[M]`

**Goal**: Because a custom endpoint may not be reachable from the browser (CORS/network),
send tutor and deep-dive requests through the existing `/api/chat` route for the
`custom` provider, exactly as is already done for `ollama`. (Question generation already
routes server-side via `generate-questions-client.ts`, so no change there.)

**Files**:

| File                                                        | Action | Description                                              |
|-------------------------------------------------------------|--------|----------------------------------------------------------|
| `app/tutor/page.tsx`                                        | modify | Broaden the server-route condition to include `custom`.  |
| `app/topics/[topicId]/components/DeepDiveButton.tsx`        | modify | Broaden the server-route condition to include `custom`.  |

**Reuse**:

| File                      | What to reuse                                                     |
|---------------------------|------------------------------------------------------------------|
| `app/tutor/page.tsx`      | Existing `if (settings.provider === 'ollama')` fetch-to-`/api/chat` branch (system prompt already travels inside `history`). |
| `app/topics/[topicId]/components/DeepDiveButton.tsx` | Existing Ollama fetch-to-`/api/chat` branch. |
| `app/api/chat/route.ts`   | No change — it already builds an `AIService` from the posted config. |

**Steps**:

1. In `app/tutor/page.tsx`, change the branch condition from
   `settings.provider === 'ollama'` to
   `settings.provider === 'ollama' || settings.provider === 'custom'` so custom uses the
   server route. The posted `config` already carries `baseUrl`, `apiKey`, and `model`.
2. In `DeepDiveButton.tsx`, make the same condition change on its Ollama branch.
3. Leave `generate-questions-client.ts` and the two API routes unchanged — they are
   already provider-agnostic and pass the full config to `AIService`.

**Tests**:

- If the existing tutor/deep-dive tests assert the routing branch, extend them to cover
  `provider: 'custom'` taking the `/api/chat` path (mock `fetch`). Otherwise add a
  focused test in the relevant `__tests__` file asserting that a custom-provider send
  calls `/api/chat` rather than the client-side `aiService.chat`. Keep existing
  Ollama/other-provider tests green.

**Acceptance criteria covered**: tutor answers via the custom endpoint with system
prompt honored; features work via the server route when the endpoint is not
browser-reachable.

**Commit**: `feat(tutor): route custom provider chat through server API`

---

### Task 4: Settings UI support for the Custom provider `[M]`

**Goal**: Let the user enter base URL, API key, and a free-text model for the Custom
provider, require base URL + API key + model before saving, and give a clear message
when required fields are missing.

**Files**:

| File                                          | Action | Description                                                        |
|-----------------------------------------------|--------|--------------------------------------------------------------------|
| `app/settings/page.tsx`                       | modify | Extend `canSave` and base-URL/model requirement for `custom`.      |
| `app/settings/components/BaseUrlInput.tsx`    | modify | Make base URL required + validation message when provider is custom. |
| `app/settings/components/ModelSelector.tsx`   | modify | Free-text model help for custom (no fixed list) + required hint.   |

**Reuse**:

| File                                        | What to reuse                                                        |
|---------------------------------------------|----------------------------------------------------------------------|
| `app/settings/page.tsx`                     | `supportsBaseUrl` (already includes `custom`), `canSave` gate, existing handlers. |
| `app/settings/components/BaseUrlInput.tsx`  | Existing input; add `required`/error props like `ApiKeyInput`.       |
| `app/settings/components/ModelSelector.tsx` | Free-text input already supports empty `defaultModels` (custom has `[]`). |
| `lib/types/ai-settings.ts`                  | `AI_PROVIDERS.custom` metadata (already `requiresApiKey: true`, `defaultModels: []`). |

**Steps**:

1. In `app/settings/page.tsx`, extend the save gate: for `provider === 'custom'`,
   require non-empty `baseUrl`, `apiKey`, and `model`. Implement as an added condition
   to `canSave` (e.g. a `customValid` boolean) so the Save button stays disabled and a
   clear inline message explains what is missing. Keep other providers' `canSave`
   behavior unchanged.
2. In `BaseUrlInput.tsx`, add optional `required` and `errorMessage`/`showError` props
   (mirroring `ApiKeyInput`'s required pattern) and render a red validation message when
   the field is required and empty. When custom is selected, update the placeholder/help
   text to indicate an OpenAI-compatible base URL is required (generic wording; mention
   the SDK appends `/chat/completions`). Pass `required` from the settings page only for
   custom so Ollama's "optional" behavior is preserved.
3. In `ModelSelector.tsx`, add a `provider === 'custom'` help block explaining the model
   is a free-text field (the id from the provider's model list) and is required. Custom
   already has `defaultModels: []`, so no dropdown is shown — verify the empty-list
   branch renders the "Enter any model name" help.
4. Do not pre-fill any IBM ICA defaults — keep fields generic/empty per the spec.

**Tests**:

- Extend `app/settings/components/__tests__/BaseUrlInput.test.tsx` for the required +
  error-message behavior.
- Extend `app/settings/components/__tests__/ModelSelector.test.tsx` for the custom
  free-text/required help.
- Extend `app/settings/__tests__/page.test.tsx` to assert Save is disabled for custom
  until base URL, API key, and model are all provided, and enabled once they are.

**Acceptance criteria covered**: Settings UI accepts base URL + API key + free-text
model; base URL and key required; model required with clear message; sensible
validation messaging.

**Commit**: `feat(settings): configure custom API base URL, key, and model`

---

**Task ordering**: Task 1 → Task 2 (factory needs the provider). Tasks 3 and 4 depend
on the config path existing (Task 2) but are independent of each other and can be done
in either order after Task 2.

## Edge Cases & Error Handling

- Base URL with/without trailing slash → `normalizeBaseUrl` strips trailing slashes so
  the SDK builds the right `/chat/completions` URL (Task 1).
- Missing base URL / API key / model → distinct `AIServiceError`s thrown before any
  network call; no mock fallback (Task 1); Save disabled with a clear message (Task 4).
- Endpoint errors (401/403 auth, 404 wrong path, 429 rate limit, 5xx) → friendly
  provider errors mirroring the OpenAI provider's status mapping (Task 1); surfaced to
  the UI via the same `/api/chat` / `/api/generate-questions` error plumbing already in
  place (Tasks 2–3).
- Endpoint not reachable from the browser → tutor/deep-dive routed server-side for
  custom (Task 3); question generation already server-side.
- Existing tests stay green; the custom endpoint is mocked via the `openai` module mock
  (Task 1), no real network.

## Verification

1. `npm run test:run` — all suites green, including the new custom-provider tests and
   the extended service/settings/tutor tests.
2. `npm run lint` and `npm run build` succeed.
3. Manual: in Settings choose **Custom API**, set base URL to
   `https://api.nextgen-beta.ica.ibm.com/ica/v1/chat-models`, paste an ICA API key, and
   enter a model id from the ICA model list. Confirm:
   - Save is blocked until base URL, key, and model are all present.
   - The tutor answers using the endpoint with the certification system prompt honored.
   - Question generation/validation produce real questions and the generating page shows
     a non-zero token count.
   - A bad key/URL surfaces a friendly error (not a silent mock response).

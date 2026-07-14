# Tutor Certification Grounding

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Tutor Certification Grounding                          |
| **Type**      | feature                                                |
| **Scope**     | AI Tutor (app/tutor) + chat request paths             |
| **Created**   | 2026-07-14 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

The AI Tutor (`app/tutor/page.tsx`) sends only the raw user message plus
prior chat history to the provider. It provides no system prompt and no
certification context, and it does not even read `currentCertificationId`
from `useSettings()` (it reads only `settings` and `isLoading`). As a
result, answers are generic and disconnected from the chosen exam — for
example, "give me study tips" returns filler unrelated to the selected
certification.

## Desired Outcome

Every tutor request is grounded in the currently selected certification.
A system prompt is built from that certification's data and injected on
every request, so answers are specific to the chosen exam (its domains,
weights, subtopics, and key points) rather than generic.

- The tutor reads `currentCertificationId` from `useSettings()`.
- Context is sourced from the certification's `config.json`
  (`name`, `code`, `examDetails`) and `topics.json` (domains/topics with
  their `weight`, subtopics, and `keyPoints`) for
  `currentCertificationId`, loaded via the existing certification loader
  functions (`loadCertificationConfig`, `loadCertificationTopics`).
- A system-prompt builder produces a certification-grounded system prompt,
  mirroring the structure and intent of the generator's
  `GENERATOR_SYSTEM_PROMPT` / `buildGenerationPrompt` pattern in
  `lib/ai/generator/prompts.ts` (framing role + injected context sections).
- The system prompt is injected as a `system`-role `ChatMessage` prepended
  as the first element of the `history` array passed to the provider —
  the same mechanism the generator uses (`aiService.chat(userPrompt,
  [systemMessage, ...])`). This requires no change to the `AIProvider`
  interface.
- Both provider paths receive the system prompt:
  - **Client-side path** (`aiService.chat(content, history)`): the built
    system message is prepended to `history` before the call.
  - **Ollama server path** (`POST /api/chat` → `AIService`): the same
    built system message is prepended into the `history` array in the
    request body client-side, so `app/api/chat/route.ts` forwards it
    unchanged. No new API request field and no server-side certification
    loading are introduced.
- The certification context is loaded once per certification and the built
  system prompt is memoized, so it is reused across messages and rebuilt
  only when `currentCertificationId` changes.

## Acceptance Criteria

- [ ] `app/tutor/page.tsx` reads `currentCertificationId` from
      `useSettings()`.
- [ ] A system-prompt builder (mirroring the generator prompt pattern)
      produces a certification-grounded system prompt from `config.json`
      (`name`, `code`, `examDetails`) and `topics.json` (domains, weights,
      subtopics, key points) for the current certification.
- [ ] On the client-side provider path, the built system message is
      prepended as the first element of `history` in `aiService.chat(...)`.
- [ ] On the Ollama path, the same system message is included as the first
      element of the `history` array in the `POST /api/chat` request body,
      and `app/api/chat/route.ts` forwards it to `AIService` unchanged.
- [ ] The certification context is loaded once per certification and the
      built system prompt is memoized; it is rebuilt only when
      `currentCertificationId` changes.
- [ ] When `currentCertificationId` is empty/unset, or when loading
      `config.json`/`topics.json` fails, the tutor falls back to sending
      the message with no system prompt (current behaviour); the failure is
      logged but no error is surfaced to the user.
- [ ] No changes to the `AIProvider` interface / provider `chat(...)`
      signature.
- [ ] No new dependencies are added.
- [ ] Existing tutor tests remain green.

## Edge Cases & Error Handling

- **No certification selected** (`currentCertificationId` empty/unset):
  send with no system prompt; tutor works as before.
- **Certification data fails to load** (`config.json` or `topics.json`
  missing, invalid, or network error): log a warning, fall back to no
  system prompt; do not surface an error to the user.
- **Certification switched mid-conversation**: subsequent messages use the
  system prompt built for the new certification (memoized per cert id);
  prior chat history is unaffected.
- **Retry path** (`handleRetry`): the retried message must carry the same
  system prompt as a fresh send.

## Dependencies & Constraints

- No new dependencies.
- Keep schema-compatible: `ChatMessage` already supports the `system`
  role; the `AIConfig` / API request shape need not change (system message
  travels inside the existing `history` array).
- Do not change the `AIService` / `AIProvider` provider interface if
  avoidable.
- Existing tutor tests must stay green.
- Reuse existing loaders (`loadCertificationConfig`,
  `loadCertificationTopics`) which already resolve base URLs for both
  client and server contexts.

## Out of Scope

- Full RAG over transcripts/questions (retrieval-augmented grounding).
  Noted as a **future enhancement**: the memoized system prompt could
  later be extended to include retrieved passages.
- Changing the `AIService` provider interface.
- Server-side certification loading inside `app/api/chat/route.ts`.

## Notes

- Pattern to mirror: `lib/ai/generator/prompts.ts`
  (`GENERATOR_SYSTEM_PROMPT` for the framing/role, `buildGenerationPrompt`
  for how context sections are assembled) and
  `lib/ai/generator/question-generator.ts` `callAi(...)`, which prepends a
  `system`-role `ChatMessage` as `history[0]` when calling
  `aiService.chat(...)`.
- `useSettings()` already exposes `currentCertificationId`; only the tutor
  page needs to start consuming it.

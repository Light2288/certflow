# Settings — Advanced Options Controls

| Field         | Value                                                  |
|---------------|--------------------------------------------------------|
| **Title**     | Settings — Advanced Options Controls                   |
| **Type**      | feature                                                |
| **Scope**     | Settings page / AI settings form                       |
| **Created**   | 2026-07-21 00:00:00                                    |
| **Status**    | IMPLEMENTED                                            |

## Problem Statement

`AISettings` (`lib/types/ai-settings.ts`) already defines `temperature`,
`maxTokens`, and `baseUrl`. These fields are defaulted via
`DEFAULT_AI_SETTINGS` and are already consumed by `AIService`
(`lib/ai/ai-service.ts`), the tutor, and the generator — but there is no UI
to change them. The Settings page's "Advanced Options" section
(`app/settings/page.tsx`, ~lines 193–201) is a placeholder reading
"Additional configuration options coming soon." Users cannot tune model
behavior or point Ollama / a custom provider at a specific host.

## Desired Outcome

The "Advanced Options" placeholder is replaced with real, working controls:

- **Temperature** — a slider spanning `0`–`1`.
- **Max Tokens** — a numeric input, positive integer.
- **Base URL** — a text field, especially useful for pointing Ollama or a
  custom provider at a specific host.

All three are wired through the existing settings context
(`lib/contexts/settings-context.tsx`) with localStorage persistence, and
follow the existing settings-form component patterns
(`ProviderSelector`, `ApiKeyInput`, `ModelSelector`).

## Acceptance Criteria

- [ ] The "Advanced Options coming soon" placeholder is removed from
      `app/settings/page.tsx` and replaced with functional controls.
- [ ] A temperature slider (range `0`–`1`) is present, reflects the current
      `temperature` value, and updates draft settings on change.
- [ ] A max tokens numeric input is present, reflects the current
      `maxTokens` value, and updates draft settings on change.
- [ ] A base URL text field is present, reflects the current `baseUrl`
      value, and updates draft settings on change.
- [ ] The controls follow the existing settings-form component patterns
      (e.g. new components under the same directory/style as
      `ProviderSelector`, `ApiKeyInput`, `ModelSelector`).
- [ ] Changes flow through the settings context and persist to localStorage,
      consistent with existing settings persistence.
- [ ] Editing any control triggers the existing unsaved-changes / save flow
      on the Settings page.
- [ ] Temperature is validated to the range `0`–`1`.
- [ ] Max tokens is validated to be a positive number.
- [ ] Existing settings tests remain green.

## Edge Cases & Error Handling

- **Temperature out of range**: values below `0` or above `1` are rejected /
  clamped; the user cannot persist an invalid value.
- **Max tokens non-positive or non-numeric**: zero, negative, or non-numeric
  input is rejected; the user cannot persist an invalid value.
- **Empty base URL**: an empty value is acceptable and falls back to the
  provider's default behavior (no host override).
- **Missing values (loading legacy/partial settings)**: controls fall back
  to `DEFAULT_AI_SETTINGS` (`temperature: 0.7`, `maxTokens: 2000`, no
  `baseUrl`) rather than rendering blank/broken.
- **Base URL visibility**: the base URL field is shown only for providers
  that use it (Ollama and Custom); temperature and max tokens are always
  shown. (Assumption — see Notes.)

## Dependencies & Constraints

- Must reuse the existing settings context
  (`lib/contexts/settings-context.tsx`) and its localStorage persistence.
- Must follow the existing settings-form component patterns
  (`ProviderSelector`, `ApiKeyInput`, `ModelSelector`).
- Existing settings tests must stay green.
- Fields are already defined on `AISettings` and consumed downstream by
  `AIService`, the tutor, and the generator — no downstream wiring changes
  should be required.

## Out of Scope

- Adding any new setting fields not already present on `AISettings`.
- Changes to how `AIService`, the tutor, or the generator consume these
  values.

## Notes

- Assumption: the base URL field is rendered only when the selected provider
  is Ollama or Custom, matching the field's documented intent ("for custom
  providers or Ollama") and avoiding confusion on hosted providers. If the
  team prefers it always visible, adjust the relevant acceptance criterion.

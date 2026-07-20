# Plan: Settings — Advanced Options Controls

| Field        | Value                              |
|--------------|------------------------------------|
| **Title**    | Settings — Advanced Options Controls |
| **Spec**     | specs/settings-advanced-options.md |
| **Type**     | feature                            |
| **Branch**   | feat/settings-advanced-options     |
| **Created**  | 2026-07-21 00:00:00                |
| **Status**   | IMPLEMENTED                        |

## Context

The `AISettings` type already defines `temperature`, `maxTokens`, and
`baseUrl`, and these are consumed downstream by `AIService`, the tutor, and
the generator — but the Settings page's "Advanced Options" section is a
placeholder with no controls. This plan replaces that placeholder with three
new form controls (temperature slider, max tokens input, base URL field),
following the existing `ProviderSelector` / `ApiKeyInput` / `ModelSelector`
component and test patterns, wired through the existing draft-state / save
flow on the Settings page.

## Branch Strategy

> **Before implementation, create a new branch from the repo's base
> branch.** The implementer auto-detects the base in this priority
> order: `develop` → `main` → `master` → `origin/HEAD`. The branch
> name is `feat/settings-advanced-options`.
>
> Reference command (the implementer adapts to the detected base):
>
> ```bash
> git checkout <base> && git pull --ff-only && git checkout -b feat/settings-advanced-options
> ```
>
> If the repo is not a git workspace, branch creation is skipped and
> noted in the implementation report.

## Commit Strategy

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[(<scope>)]: <imperative description>`

One commit per task. Each task in the Tasks section maps to exactly one
commit.

## Build & Test Commands

| Action | Command |
|--------|---------|
| Test   | `npm run test:run` (single run) or `npm test` (watch) |
| Build  | `npm run build`   |
| Lint   | `npm run lint`    |

## Tasks

### Task 1: Add TemperatureSlider component `[S]`

**Goal**: Provide a labelled slider (range `0`–`1`) for `temperature` that
reports changes via `onChange`, following existing component conventions.

**Files**:

| File                                                              | Action | Description                                       |
|-------------------------------------------------------------------|--------|---------------------------------------------------|
| `app/settings/components/TemperatureSlider.tsx`                   | create | Controlled `input[type=range]`, min 0 / max 1 / step 0.1, current value display, help text |
| `app/settings/components/__tests__/TemperatureSlider.test.tsx`    | create | Rendering, label association, onChange, disabled, range attributes |

**Reuse**:

| File                                              | What to reuse                                  |
|---------------------------------------------------|------------------------------------------------|
| `app/settings/components/ApiKeyInput.tsx`         | Label + wrapper markup, Tailwind class conventions, `disabled` handling, `helpText` pattern |
| `app/settings/components/__tests__/ModelSelector.test.tsx` | Test structure (describe blocks, `vi.fn()` mock, `getByLabelText`, disabled/accessibility cases) |

**Steps**:

1. Create `TemperatureSlider` with props
   `{ value: number; onChange: (v: number) => void; disabled?: boolean }`.
2. Render a `<label htmlFor="temperature">Temperature</label>` and an
   `input[type="range"]` with `min={0} max={1} step={0.1}`, `id="temperature"`,
   value bound to `value`, calling `onChange(parseFloat(e.target.value))`.
   Because the slider constrains input to `0`–`1`, out-of-range values cannot
   be produced (satisfies the temperature range validation criterion at the
   control level).
3. Display the current numeric value next to the slider and short help text
   (e.g. "Lower = more focused, higher = more creative"). Apply the same
   focus/disabled Tailwind classes used in the other components.

**Tests**:

- File: `app/settings/components/__tests__/TemperatureSlider.test.tsx`.
- Renders with label; input has `type="range"`, `min="0"`, `max="1"`.
- Reflects the passed `value`; calls `onChange` with a numeric value on change.
- Respects `disabled`; has proper label association and focus classes.

**Acceptance criteria covered**: temperature slider present/reflects value/
updates on change; temperature range `0`–`1` validation (control-level);
follows existing component patterns.

**Commit**: `feat(settings): add temperature slider component`

---

### Task 2: Add MaxTokensInput component `[S]`

**Goal**: Provide a numeric input for `maxTokens` that enforces a positive
value and reports changes via `onChange`.

**Files**:

| File                                                          | Action | Description                                             |
|---------------------------------------------------------------|--------|---------------------------------------------------------|
| `app/settings/components/MaxTokensInput.tsx`                  | create | Controlled `input[type=number]`, `min=1`, positive-value validation + inline error |
| `app/settings/components/__tests__/MaxTokensInput.test.tsx`   | create | Rendering, onChange, positive-value validation, disabled, accessibility |

**Reuse**:

| File                                              | What to reuse                                  |
|---------------------------------------------------|------------------------------------------------|
| `app/settings/components/ApiKeyInput.tsx`         | Label/input/error markup, `showError` inline-error pattern, `aria-invalid` / `aria-describedby`, Tailwind classes |
| `app/settings/components/__tests__/ApiKeyInput.test.tsx` | Test structure for error/validation states |

**Steps**:

1. Create `MaxTokensInput` with props
   `{ value: number; onChange: (v: number) => void; disabled?: boolean }`.
2. Render `<label htmlFor="max-tokens">Max Tokens</label>` and
   `input[type="number"]` with `min={1}`, `step={1}`, `id="max-tokens"`,
   value bound to `value`; on change parse the integer and call `onChange`.
3. Treat zero, negative, empty, or non-numeric input as invalid: show an
   inline error (mirroring `ApiKeyInput`'s `showError`) and set
   `aria-invalid`. Do not call `onChange` with an invalid value (so an
   invalid value cannot be committed to draft state).
4. Add short help text describing the field.

**Tests**:

- File: `app/settings/components/__tests__/MaxTokensInput.test.tsx`.
- Renders with label; input `type="number"`, `min="1"`.
- Reflects value; calls `onChange` with a positive integer on valid change.
- Shows validation error and does not emit `onChange` for `0`, negative, or
  non-numeric input.
- Respects `disabled`; proper label association.

**Acceptance criteria covered**: max tokens input present/reflects value/
updates on change; max tokens positive-value validation; follows existing
component patterns.

**Commit**: `feat(settings): add max tokens input component`

---

### Task 3: Add BaseUrlInput component `[S]`

**Goal**: Provide a text field for `baseUrl` that reports changes via
`onChange`, with an empty value being valid.

**Files**:

| File                                                        | Action | Description                                        |
|-------------------------------------------------------------|--------|----------------------------------------------------|
| `app/settings/components/BaseUrlInput.tsx`                  | create | Controlled `input[type=text/url]`, optional value, help text about Ollama / custom host |
| `app/settings/components/__tests__/BaseUrlInput.test.tsx`   | create | Rendering, onChange, empty value allowed, disabled, accessibility |

**Reuse**:

| File                                              | What to reuse                                  |
|---------------------------------------------------|------------------------------------------------|
| `app/settings/components/ApiKeyInput.tsx`         | Label/input markup, `helpText` pattern, clear-button idea (optional), Tailwind classes |
| `app/settings/components/__tests__/ModelSelector.test.tsx` | Test structure |

**Steps**:

1. Create `BaseUrlInput` with props
   `{ value: string; onChange: (v: string) => void; disabled?: boolean }`.
2. Render `<label htmlFor="base-url">Base URL</label>` and an
   `input[type="url"]` (or `text`) with `id="base-url"`, value bound to
   `value`, calling `onChange(e.target.value)`; empty is accepted.
3. Add help text explaining it is used to point Ollama / a custom provider at
   a specific host (e.g. `http://localhost:11434`), and a placeholder.

**Tests**:

- File: `app/settings/components/__tests__/BaseUrlInput.test.tsx`.
- Renders with label; reflects value; calls `onChange` on typing.
- Accepts an empty value (no error shown for empty).
- Respects `disabled`; proper label association.

**Acceptance criteria covered**: base URL text field present/reflects value/
updates on change; empty base URL edge case; follows existing component
patterns.

**Commit**: `feat(settings): add base url input component`

---

### Task 4: Wire Advanced Options controls into the Settings page `[M]`

**Goal**: Replace the "coming soon" placeholder with the three new controls,
wired to draft state, the unsaved-changes/save flow, and context persistence;
show `BaseUrlInput` only for Ollama/Custom providers.

**Files**:

| File                                          | Action | Description                                                        |
|-----------------------------------------------|--------|-------------------------------------------------------------------|
| `app/settings/page.tsx`                       | modify | Import the three components; add change handlers; replace placeholder block (~lines 193–201) with the controls; render base URL conditionally |
| `app/settings/__tests__/page.test.tsx`        | modify | Add assertions for the new controls; keep existing tests green    |

**Reuse**:

| File                                              | What to reuse                                             |
|---------------------------------------------------|-----------------------------------------------------------|
| `app/settings/page.tsx`                           | Existing `draftSettings` state, `handleModelChange`-style handlers, `hasUnsavedChanges` diff, `handleSave` → `updateSettings` (context persistence), `AI_PROVIDERS[provider]` lookup |
| `lib/contexts/settings-context.tsx`               | `updateSettings` (persists to localStorage) — no changes needed |
| `lib/types/ai-settings.ts`                        | `DEFAULT_AI_SETTINGS` for fallbacks (`temperature: 0.7`, `maxTokens: 2000`) |

**Steps**:

1. Import `TemperatureSlider`, `MaxTokensInput`, `BaseUrlInput`.
2. Add handlers mirroring the existing ones, each doing
   `setDraftSettings({ ...draftSettings, <field> })` and
   `setSaveStatus('idle')`:
   - `handleTemperatureChange(temperature: number)`
   - `handleMaxTokensChange(maxTokens: number)`
   - `handleBaseUrlChange(baseUrl: string)`
3. Replace the placeholder `<div>` (the "Advanced Options coming soon"
   block, ~lines 193–201) with the "Advanced Options" heading followed by a
   `space-y-6` container rendering:
   - `TemperatureSlider` with `value={draftSettings.temperature ?? DEFAULT_AI_SETTINGS.temperature}`.
   - `MaxTokensInput` with `value={draftSettings.maxTokens ?? DEFAULT_AI_SETTINGS.maxTokens}`.
   - `BaseUrlInput` with `value={draftSettings.baseUrl || ''}`, rendered only
     when `draftSettings.provider === 'ollama' || draftSettings.provider === 'custom'`
     (per spec Notes assumption).
   Pass `disabled={isSaving}` to each, matching the other controls.
4. Because changes flow through `draftSettings`, the existing
   `hasUnsavedChanges` diff, banners, Save, and Cancel all work unchanged;
   `handleSave` already calls `updateSettings` which persists to localStorage
   via the context.

**Tests**:

- File: `app/settings/__tests__/page.test.tsx`.
- Add a test that the Advanced Options controls render: temperature slider
  (by label) and max tokens input (by label) are present after load.
- Add a test that adjusting a control (e.g. changing max tokens or
  temperature) enables the Save button / shows the unsaved-changes banners,
  and that saving persists the value through the context to localStorage.
- Add a test that the base URL field is hidden for `mock`/`openai` and shown
  after selecting `ollama` (or `custom`).
- Verify existing page tests still pass — notably the "Advanced Options"
  heading assertion (line 59) remains valid, and no new control uses a label
  that collides with existing `getByLabelText(/Model/i)` / `/AI Provider/i`
  queries ("Max Tokens", "Temperature", "Base URL" do not match those).

**Acceptance criteria covered**: placeholder removed/replaced; all three
controls wired to draft state and save flow; changes persist via context to
localStorage; editing triggers unsaved-changes/save flow; base URL visibility
rule; existing settings tests remain green.

**Task ordering**: Tasks 1–3 are independent and may be done in any order.
Task 4 depends on all three (it imports and renders them).

## Edge Cases & Error Handling

- Temperature out of range: prevented by the slider's `min`/`max` bounds
  (Task 1).
- Max tokens non-positive/non-numeric: rejected with inline error; `onChange`
  not emitted for invalid input, so it cannot reach draft state (Task 2).
- Empty base URL: accepted; no error; falls back to provider default behavior
  downstream (Task 3).
- Missing/partial settings on load: controls fall back to `DEFAULT_AI_SETTINGS`
  values via `?? DEFAULT_AI_SETTINGS.*` (Task 4).
- Base URL visibility: shown only for Ollama/Custom providers (Task 4).

## Verification

1. Run `npm run test:run` — all existing settings tests plus the new
   component and page tests pass.
2. Run `npm run lint` and `npm run build` — no errors.
3. Manual: open `/settings`, confirm the Advanced Options section shows the
   temperature slider and max tokens input; select Ollama/Custom and confirm
   the base URL field appears; adjust each control, confirm the unsaved-changes
   banner appears, save, reload, and confirm values persist.

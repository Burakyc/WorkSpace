# Plan — Phase 9.3 API mode

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/9.3-ai-api-mode` from `claude/milestone-9-145c99`.

Every task ends with `npm run check` (after `npx prettier --write src electron` in `apps/desktop`). A task is committed only when it passes. One new package: `Anthropic` 13.6.0 (task 3).

## Tasks

### 1. Keys reach the API

**Commit:** `feat(secrets): store the AI API keys`

- `SecretName` and `SECRET_NAMES` get `anthropicApiKey`, `geminiApiKey`; `apiEnvironment` passes both (empty when none); `main.ts`.
- `secrets.test.ts`, `apiProcess.test.ts` (T1).

### 2. Provider setting and table

**Commit:** `feat(ai): list the AI providers with their prices`

- `Modules/Ai/AiProviders.cs` (table), `AiController` (`GET /api/ai/providers`), `AddAi()`; `aiProvider` in `SettingsService`, `PUT /api/settings/ai-provider`.
- `types.ts`, `client.ts`, fakes (additive).
- Tests T2–T3.

### 3. Claude client

**Commit:** `feat(ai): call Claude with the official SDK`

- `Anthropic` 13.6.0 in `DevPath.Api.csproj`.
- `Modules/Ai/ClaudeClient.cs`, `AiAnswer`, named client with redacted headers.
- Tests T4–T5.

### 4. Gemini client

**Commit:** `feat(ai): call Gemini over HTTP`

- `Modules/Ai/GeminiClient.cs`.
- Tests T6–T7.

### 5. Run and import

**Commit:** `feat(ai): run a prompt and import the answer`

- `AiService`, `POST /api/ai/run`, `DEVPATH_AI_STUB_URL` in Development; `client.ts` (`runAi`).
- Tests T8–T11.

### 6. API mode in the panel and Ayarlar

**Commit:** `feat(ai): add the API mode with a cost note`

- `api` in `AiModes.Available`; "API" label.
- `modules/ai/ApiRunBody.tsx`, `aiCost.ts`, `AiProviderSelect.tsx`, `AiContentPanel`.
- `modules/settings/AiApiSection.tsx`, `SettingsPage`.
- Fake routes, tests T12–T16.

### 7. Docs

**Commit:** `docs: document the API mode`

- `specs/tech-stack.md`: overview row, API mode rules, security rules (allow list, variables), layout.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 9.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 9.3 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-9-145c99` to the phase branch. Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(secrets): store the AI API keys` |
| 2 | `feat(ai): list the AI providers with their prices` |
| 3 | `feat(ai): call Claude with the official SDK` |
| 4 | `feat(ai): call Gemini over HTTP` |
| 5 | `feat(ai): run a prompt and import the answer` |
| 6 | `feat(ai): add the API mode with a cost note` |
| 7 | `docs: document the API mode` |
| 8 | `docs(roadmap): mark phase 9.3 done` |

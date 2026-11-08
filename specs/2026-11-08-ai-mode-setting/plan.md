# Plan — Phase 9.1 Mode setting and copy-paste mode

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/9.1-ai-mode-setting` from `claude/milestone-9-145c99`.

Every task ends with `npm run check` (after `npx prettier --write src electron` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Store the mode per module

**Commit:** `feat(settings): store the AI mode per module`

- `Modules/Settings/AiModes.cs`: module and mode lists, `Available`, defaults.
- `SettingsService`: read `aiModes` (forgiving), `SaveAiModeAsync(module, mode)`; `AppSettings` gets `AiModes`.
- `SettingsController`: `PUT /api/settings/ai-modes/{module}`.
- `types.ts`, `client.ts` (`saveAiMode`), `fakeGoalsApi.ts` (additive).
- `SettingsServiceTests`, `SettingsEndpointTests` (T1–T3).

### 2. Mode select and panel

**Commit:** `feat(ai): choose a module's AI mode and show its panel`

- `src/modules/ai/`: `aiModes.ts` (lists and labels), `useAiMode.ts`, `AiModeSelect.tsx`, `AiContentPanel.tsx`, CSS module.
- `CopyPromptButton`: optional `prompt`.
- `AiContentPanel.test.tsx` (T4–T6).

### 3. Modules use the panel

**Commit:** `feat(content): add content through the module's AI mode`

- `TopicListPage`: `AiContentPanel` replaces `CopyPromptButton` and `ImportPanel`; empty state text.
- Module page tests follow the new empty state text (T7).

### 4. Ayarlar section

**Commit:** `feat(settings): list the AI mode of each module`

- `src/modules/settings/AiModesSection.tsx`, rendered in `SettingsPage`; test (T8).

### 5. Docs

**Commit:** `docs: document the AI mode setting`

- `specs/tech-stack.md`: `aiModes` in settings, `modules/ai/`, the panel's props as the way other modules use the modes.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 9.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 9.1 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-9-145c99` to the phase branch. Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(settings): store the AI mode per module` |
| 2 | `feat(ai): choose a module's AI mode and show its panel` |
| 3 | `feat(content): add content through the module's AI mode` |
| 4 | `feat(settings): list the AI mode of each module` |
| 5 | `docs: document the AI mode setting` |
| 6 | `docs(roadmap): mark phase 9.1 done` |

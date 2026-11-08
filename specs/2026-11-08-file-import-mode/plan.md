# Plan — Phase 9.2 File import mode

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/9.2-file-import-mode` from `claude/milestone-9-145c99`.

Every task ends with `npm run check` (after `npx prettier --write src electron` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Inbox folder setting

**Commit:** `feat(settings): store an inbox folder per module`

- `SettingsService`: read `aiInbox`, `SaveAiInboxAsync`; `AppSettings` gets `AiInbox`; `PUT /api/settings/ai-inbox/{module}`.
- `types.ts`, `client.ts` (`saveAiInbox`), fakes (additive).
- Tests T1–T2.

### 2. Scan an inbox

**Commit:** `feat(content): scan a module's inbox folder`

- `Modules/Content/InboxService.cs`, `InboxController.cs`; `ImportValidator.ReadType`; registered in `AddContent`.
- `types.ts`, `client.ts` (`scanInbox`).
- Tests T3–T5.

### 3. Import from an inbox

**Commit:** `feat(content): import inbox files and move them to done`

- `InboxService.ImportAsync`, `POST …/import`; `client.ts` (`importInbox`).
- Tests T6–T8.

### 4. Folder dialog

**Commit:** `feat(settings): pick a folder through main`

- `devpath:pick-folder` in `main.ts`, `settings.pickFolder(title)` in preload and `DevPathBridge`.
- Checked in M2.

### 5. File mode in the panel and Ayarlar

**Commit:** `feat(ai): add the file import mode`

- `file` in `AiModes.Available`; label without "(yakında)".
- `modules/ai/InboxFolderField.tsx`, `FileImportBody.tsx`, `AiContentPanel`; `AiModesSection` shows the field; `formatImportReport` shared with `ImportPanel`.
- Fake inbox routes (`fakeContentApi.ts`), tests T9–T11; T3 of 9.1 follows (`file` is accepted now).

### 6. Docs

**Commit:** `docs: document the file import mode`

- `specs/tech-stack.md`: inbox rules, preload function, `aiInbox` in `settings.json`.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 9.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 9.2 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-9-145c99` to the phase branch. Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(settings): store an inbox folder per module` |
| 2 | `feat(content): scan a module's inbox folder` |
| 3 | `feat(content): import inbox files and move them to done` |
| 4 | `feat(settings): pick a folder through main` |
| 5 | `feat(ai): add the file import mode` |
| 6 | `docs: document the file import mode` |
| 7 | `docs(roadmap): mark phase 9.2 done` |

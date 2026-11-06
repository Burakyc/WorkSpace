# Plan — Phase 8.1 Daily backups

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Work on this worktree's branch `claude/milestone-8-59e357` (cut from `main` at `5642602`).

Every task ends with `npm run check` (after `npx prettier --write src electron` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Daily backup and retention

**Commit:** `feat(backups): copy the data folder daily and prune old backups`

- `electron/backups.ts`: `backupDate(now)`, `restoreStamp(now)`, `listBackups(dataDir)`, `pruneBackups(dataDir)`, `dailyBackup(dataDir, now)`; type `BackupInfo` in `src/shared/api/types.ts`.
- `electron/backups.test.ts` (T1–T5) against a temp folder.
- Check: `npm run check`.

### 2. Restore

**Commit:** `feat(backups): restore a backup over the data folder`

- `restoreBackup(dataDir, name, now)` in `electron/backups.ts`, with the rollback from the pre-restore backup.
- `electron/backups.test.ts` (T6–T8).
- Check: `npm run check`.

### 3. Start-up backup and IPC

**Commit:** `feat(backups): back up on start and restore through IPC`

- `apiProcess.ts`: `ApiHandle.exited` (resolves when the process has exited); `apiProcess.test.ts` (T9) if the existing tests cover the handle, else checked manually (M3).
- `main.ts`: `dailyBackup` in `launch()` before the API starts (errors logged); handlers `devpath:list-backups`, `devpath:restore-backup`.
- `preload.ts` and `DevPathBridge`: `settings.listBackups()`, `settings.restoreBackup(name)`.
- Check: `npm run check`; manual M1–M2.

### 4. Restore from Ayarlar

**Commit:** `feat(settings): restore from a backup`

- `src/modules/settings/BackupsSection.tsx` (+ styles in `SettingsPage.module.css`), rendered in `SettingsPage.tsx` after the data folder card; existing `SettingsPage.test.tsx` stubs get the two new functions.
- `BackupsSection.test.tsx` (T10–T12).
- Check: `npm run check`; manual M3–M6.

### 5. Docs

**Commit:** `docs: document daily backups`

- `specs/tech-stack.md`: backups inside the data folder, start-up backup, restore flow, preload functions, layout tree.
- `README.md`: backup location wording.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 8.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 8.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(backups): copy the data folder daily and prune old backups` |
| 2 | `feat(backups): restore a backup over the data folder` |
| 3 | `feat(backups): back up on start and restore through IPC` |
| 4 | `feat(settings): restore from a backup` |
| 5 | `docs: document daily backups` |
| 6 | `docs(roadmap): mark phase 8.1 done` |

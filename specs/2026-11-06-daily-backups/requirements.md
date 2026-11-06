# Requirements — Phase 8.1 Daily backups

**Roadmap phase:** 8.1 Daily backups (Post-MVP)
**Branch:** `claude/milestone-8-59e357` (this worktree's branch; not merged into `main` by this session)
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

All data lives in one local folder, so one bad edit, a broken import or a corrupted file can lose work. On the first start of each day the app copies the data folder to `backups/YYYY-MM-DD/` and keeps the backups of the last 14 days that have one. Ayarlar gets a "Yedekten geri yükle" section that lists the backups and restores one after a confirmation; the current data is backed up first, so a wrong restore can be undone.

## Scope

- **Electron main** (`electron/backups.ts`): daily backup, retention cleanup, listing, restore. Wired into start-up (`launch()`) and two IPC handlers.
- **Preload / types**: `settings.listBackups()` and `settings.restoreBackup(name)`.
- **Renderer**: a "Yedekler" section on the Ayarlar page (`BackupsSection.tsx`).
- `apiProcess.ts`: the API handle exposes when the process has exited, so a restore waits for the files to be released.
- `tech-stack.md`, `README.md` and `roadmap.md` updated.

The API does not change.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Where backups live | **Inside the data folder**: `<dataDir>\backups\`. Every data folder has its own backups and they move with it; development (`dev-data`) and the installed app (`data`) never mix. A copy skips `backups\`; a restore keeps it. This replaces the sibling `%APPDATA%\DevPath\backups` sketched in tech-stack.md. If the data folder is the repo's `data/`, `backups/` inside it is gitignored too (`data/` and `backups/` are both in `.gitignore`). |
| Who copies | **Electron main**, with Node `fs.cpSync`. The daily backup runs in `launch()` after the data folder is created and **before the API starts**, so no file is being written during the copy. |
| How a restore runs | Main stops the API and waits for the process to exit, backs up the current data, replaces the data folder's contents with the backup, starts the API again (new port and token) and reloads the window, the same way the data folder switch works. |
| Retention | **The 14 newest dates that have a backup** are kept; folders of older dates are deleted. Not calendar based: after a month away, 14 backups still exist. |
| Backup before a restore | A separate folder `backups\YYYY-MM-DD-HHmmss\` (local time), listed as "Geri yükleme öncesi". It counts toward its date in the retention rule (a date may hold the daily backup and several pre-restore backups). |
| First start of the day | The local date of the machine. Today's backup exists when `backups\YYYY-MM-DD\` exists; otherwise it is made at start-up. Switching the data folder at runtime does not make a backup; the next start does. |
| Empty data folder | No backup is made when the data folder holds nothing but `backups\` (first run). |
| Backup failure at start-up | Logged (`console.error`) and the app starts anyway: a missing backup must not lock the user out of their data. |
| Atomic backup | A backup is copied to `backups\<name>.partial\` and renamed when complete; a leftover `.partial` (crash) is deleted by the next backup and never listed. |
| What is copied | Everything in the data folder except `backups\` and `*.tmp` files (half-written atomic writes). |
| Confirmation | Inline panel like the note delete confirmation (`role="alertdialog"`), no native dialog. |
| Pre-restore label shows seconds (found in M4) | Two restores in the same minute gave two identical "15:37" rows, so the label shows `HH:mm:ss` (separate `fix(settings)` commit). The confirmation also got spacing between its text and buttons (found in M3, separate `fix(settings)` commit). |
| Failed restore message (implementation) | An unknown backup name is refused **before** the API is stopped and the page shows "Yedek bulunamadı.". A failed copy (rolled back) happens after the API restarted on a new port and token, so the page must reload anyway: main shows the message in an error message box (`dialog.showMessageBox`) and then reloads, instead of returning it to the page. |

## User stories

1. **As the user**, I never think about backups: every day I open the app, yesterday's state is saved.
2. **As the user**, after a bad import or a mistake I open Ayarlar, pick the backup from a date and restore it.
3. **As the user**, if I restored the wrong backup, I restore the "Geri yükleme öncesi" backup and I am back where I was.

## Business and technical rules

### Backup folder names

- Daily: `YYYY-MM-DD` (local date). Before a restore: `YYYY-MM-DD-HHmmss` (local time).
- Only folders whose name matches `^\d{4}-\d{2}-\d{2}(-\d{6})?$` are backups. Anything else in `backups\` (files, `.partial` folders, other names) is ignored by listing and retention, and left alone.

### Daily backup (`dailyBackup(dataDir, now)`)

1. If `backups\<today>\` exists, do nothing.
2. If the data folder has no entries other than `backups\`, do nothing.
3. Delete a leftover `backups\<today>.partial\`, copy the data folder into it (skipping the top-level `backups\` and every `*.tmp` file), rename it to `backups\<today>\`.
4. Prune (below).

### Retention (`pruneBackups(dataDir)`)

- Group backups by their first 10 characters (the date). Keep every backup of the 14 newest dates; delete the rest recursively.

### Listing (`listBackups(dataDir)`)

- Returns `{ name, kind }[]` (`kind`: `daily` | `beforeRestore`), newest first (by name, descending). A missing `backups\` folder gives `[]`.

### Restore (`restoreBackup(dataDir, name, now)`)

- `name` comes from the renderer: it must be one of the listed backups; otherwise "Yedek bulunamadı." and nothing changes.
- Steps: back up the current data to `backups\<YYYY-MM-DD-HHmmss>\` (same copy rules; made even if today's daily backup exists); delete every entry of the data folder except `backups\`; copy the backup's contents into the data folder; prune. Returns the pre-restore backup's name.
- If deleting or copying fails, the data folder is put back from the pre-restore backup and the error is raised ("Yedek geri yüklenemedi."). The pre-restore backup stays.

### Main and IPC

- `devpath:list-backups` → `BackupInfo[]` for the current data folder.
- `devpath:restore-backup(name)`: `name` must be a string. Main stops the API, waits for it to exit, runs `restoreBackup`, starts the API on the same data folder and reloads the window. An unknown name returns `{ error: "Yedek bulunamadı." }` without stopping the API. If the copy fails, the API is started again on the rolled back data, main shows the message in an error box and reloads the window (see the decisions table). If the API cannot be started again, the error window opens and the app quits (as with a failed data folder switch).
- Preload: `settings.listBackups(): Promise<BackupInfo[]>`, `settings.restoreBackup(name): Promise<void>` (rejects with the Turkish message).

### Renderer — "Yedekler" section on Ayarlar

- Heading "Yedekler", note "Uygulama her gün ilk açılışta veri klasörünü yedekler; son 14 günün yedekleri saklanır."
- List, newest first: daily backups as the long Turkish date ("6 Kasım 2026"); pre-restore backups as date and time with "· Geri yükleme öncesi" ("6 Kasım 2026 14:05:09 · Geri yükleme öncesi"). Each row has "Geri yükle".
- "Geri yükle" opens an inline confirmation under the row: "<label> yedeği geri yüklensin mi? Mevcut veriler önce yedeklenir." with "Geri yükle" and "Vazgeç".
- While restoring, every restore button is disabled and the confirm button reads "Geri yükleniyor…". On success the window reloads (main). On failure the message shows (`role="alert"`) and the list stays.
- Empty: "Henüz yedek yok."; load failure: "Yedekler okunamadı.".

## Out of scope

| Item | Where it goes |
|---|---|
| Manual "Şimdi yedekle" button | Not planned; a restore already makes a backup of the current data |
| Backups on another disk or in the cloud | Not planned (local only) |
| Restoring a single file or module | Not planned; a restore replaces the whole data folder |
| Compression (zip) | Not planned; the data is small JSON |
| A backup when the data folder is switched at runtime | Next start makes it |

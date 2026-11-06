# Validation — Phase 8.1 Daily backups

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 8.1, plus the decisions in [requirements.md](requirements.md):

- [x] On the first start of each day the data folder is copied to `<dataDir>\backups\YYYY-MM-DD\`; the backups of the 14 newest dates are kept.
- [x] Ayarlar → "Yedekler" lists the backups and restores one after a confirmation; the current data is backed up first ("Geri yükleme öncesi").
- [x] Tests: retention cleanup, restore.
- [x] `tech-stack.md` and `README.md` are updated; `backups/` stays out of git.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Daily backup | `electron/backups.test.ts` | Data with `goals.json`, `notes/pages/a.json`, `x.json.tmp` → `backups/2026-11-06/` holds the two JSON files, no `.tmp`, no nested `backups/` |
| T2 | Once a day | same | A second call on the same date changes nothing (a file written in between is not copied); an empty data folder makes no backup; a leftover `2026-11-06.partial` is replaced |
| T3 | Retention | same | 16 daily folders + a pre-restore folder on the oldest kept date → the 14 newest dates stay (with that pre-restore folder), the 2 oldest are deleted; `notes.txt` and `other/` in `backups/` are untouched |
| T4 | Listing | same | Newest first, `kind` `daily` / `beforeRestore`, junk and `.partial` ignored; no `backups/` → `[]` |
| T5 | Names | same | `backupDate` and `restoreStamp` use local time, zero-padded (`2026-01-05`, `2026-01-05-090703`) |
| T6 | Restore | same | Restoring `2026-11-04` → the data folder equals that backup (a file added since is gone); `backups/` kept; a `beforeRestore` backup holds the data from before |
| T7 | Unknown backup | same | `../x`, `2026-11-99-junk`, a name that does not exist → "Yedek bulunamadı.", nothing changes, no backup made |
| T8 | Rollback | same | A failing copy (injected) → data folder back to the pre-restore state, "Yedek geri yüklenemedi." |
| T9 | API exit | — (manual, M3) | The existing tests do not start a process, so this is checked in M3: the old `DevPath.Api` process is gone after the restore and a new one runs |
| T10 | List | `src/modules/settings/BackupsSection.test.tsx` | Daily → "6 Kasım 2026"; pre-restore → "6 Kasım 2026 14:05:09 · Geri yükleme öncesi"; empty → "Henüz yedek yok."; failure → "Yedekler okunamadı." |
| T11 | Confirm and restore | same | "Geri yükle" → confirmation text; "Vazgeç" closes it; confirm → `restoreBackup('2026-11-04')`, buttons disabled, "Geri yükleniyor…" |
| T12 | Restore error | same | Rejected restore → the message in `role="alert"`, list kept, buttons enabled |

## Manual test steps

Never on the shared `%APPDATA%\DevPath\dev-data` or the real `%APPDATA%\DevPath\data`: switch Ayarlar → "Veri klasörü" to a new temporary folder first and delete it at the end. (Done here by starting `electron-vite dev -- --user-data-dir=<temp>\ud` with an `app-config.json` whose `dataDir` is a temporary folder, so the shared development config and its single-instance lock were not touched either. M1 starts with an empty folder: no backup on that start; a goal is created and the next start makes the backup.)

| ID | Step | Expected |
|---|---|---|
| M1 | Temporary data folder with a goal; quit and start the app | `<temp>\backups\<today>\` holds `goals.json`; Ayarlar lists today's backup |
| M2 | Add old folders `backups\2026-10-01` … `2026-10-16` by hand and delete today's daily folder (retention runs when a daily backup is made); restart | Today's backup is made again and only the 14 newest dates remain (`2026-10-04` … `2026-10-16` and today, with today's pre-restore backups) |
| M3 | Add a second goal; Ayarlar → "Geri yükle" on today → confirm | The window reloads, Hedefler shows only the first goal; a "Geri yükleme öncesi" backup appears; no orphan `DevPath.Api` process |
| M4 | Restore the "Geri yükleme öncesi" backup | Both goals are back |
| M5 | "Geri yükle" → "Vazgeç" | Nothing changes |
| M6 | Tab through the Yedekler section | Every button reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M6 done with the expected results
- [x] `roadmap.md` phase 8.1 ticked and set to `done`

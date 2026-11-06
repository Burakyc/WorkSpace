# Validation — Phase 8.1 Daily backups

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 8.1, plus the decisions in [requirements.md](requirements.md):

- [ ] On the first start of each day the data folder is copied to `<dataDir>\backups\YYYY-MM-DD\`; the backups of the 14 newest dates are kept.
- [ ] Ayarlar → "Yedekler" lists the backups and restores one after a confirmation; the current data is backed up first ("Geri yükleme öncesi").
- [ ] Tests: retention cleanup, restore.
- [ ] `tech-stack.md` and `README.md` are updated; `backups/` stays out of git.

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
| T9 | API exit | `electron/apiProcess.test.ts` | `exited` resolves after `stop()` (only if the existing tests start a fake process; otherwise M3) |
| T10 | List | `src/modules/settings/BackupsSection.test.tsx` | Daily → "6 Kasım 2026"; pre-restore → "6 Kasım 2026 14:05 · Geri yükleme öncesi"; empty → "Henüz yedek yok."; failure → "Yedekler okunamadı." |
| T11 | Confirm and restore | same | "Geri yükle" → confirmation text; "Vazgeç" closes it; confirm → `restoreBackup('2026-11-04')`, buttons disabled, "Geri yükleniyor…" |
| T12 | Restore error | same | Rejected restore → the message in `role="alert"`, list kept, buttons enabled |

## Manual test steps

Never on the shared `%APPDATA%\DevPath\dev-data` or the real `%APPDATA%\DevPath\data`: switch Ayarlar → "Veri klasörü" to a new temporary folder first and delete it at the end.

| ID | Step | Expected |
|---|---|---|
| M1 | Temporary data folder with a goal; quit and start the app | `<temp>\backups\<today>\` holds `goals.json`; Ayarlar lists today's backup |
| M2 | Add old folders `backups\2026-10-01` … (16 dates) by hand; restart | Only the 14 newest dates remain |
| M3 | Add a second goal; Ayarlar → "Geri yükle" on today → confirm | The window reloads, Hedefler shows only the first goal; a "Geri yükleme öncesi" backup appears; no orphan `DevPath.Api` process |
| M4 | Restore the "Geri yükleme öncesi" backup | Both goals are back |
| M5 | "Geri yükle" → "Vazgeç" | Nothing changes |
| M6 | Tab through the Yedekler section | Every button reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M6 done with the expected results
- [ ] `roadmap.md` phase 8.1 ticked and set to `done`

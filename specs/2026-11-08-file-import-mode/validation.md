# Validation — Phase 9.2 File import mode

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 9.2, plus the decisions in [requirements.md](requirements.md):

- [ ] An inbox folder can be chosen per module; JSON files there are validated and imported on demand ("İçe aktar" lists new files).
- [ ] Imported files move to `done/` under the inbox folder, with a timestamp on a name clash; invalid ones stay, with errors in the list and a `.errors.txt` report.
- [ ] Content goes through the 5.1 validator and merge; nothing is overwritten and invalid content is never saved.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Folder setting | `SettingsServiceTests` | Defaults to null; a broken section reads as null; saving keeps other sections; empty clears; a missing folder → `folder` error |
| T2 | Endpoint | `SettingsEndpointTests` | `PUT …/ai-inbox/english` saves; `GET /api/settings` returns it; unknown module → 400 |
| T3 | Scan list | `InboxServiceTests` | Valid and invalid vocab files listed by name; a lesson file only counted; subfolders and `.txt` ignored; no folder and missing folder answers |
| T4 | Broken files | same | Not JSON → line error; no `type` → listed invalid; fenced JSON → valid; over 2 MB → error, not read; not UTF-8 → "Dosya okunamadı." |
| T5 | Reports | same | Invalid → `a.json.errors.txt` with "Satır n · …"; fixed → removed; orphan report → removed; another type's file gets none |
| T6 | Import | same | Valid file merged and moved to `done/`; existing topic merges without touching old items; its report removed |
| T7 | Stays | same | A file made invalid after the scan stays, with its report; other names in the call still import |
| T8 | Names and clash | same | `../x.json`, `sub/x.json`, `x.txt` → "Dosya bulunamadı."; a clash in `done/` → timestamped name, old file untouched; a second clash in the same second → `-2` |
| T9 | Body | `AiContentPanel.test.tsx` | File mode shows the folder, prompt and "İçe aktar"; disabled without a folder |
| T10 | Flow | same | Scan shows valid and invalid rows, the skipped count; import shows summaries, calls `onImported`, scans again |
| T11 | Ayarlar | `AiModesSection.test.tsx` | The folder field shows only while the module's mode is `file`; "Klasör seç…" saves the picked path; "Kaldır" clears it |

## Manual test steps

Never on the real `%APPDATA%\DevPath\data`. Use a temporary user-data folder, data folder and inbox, and delete them at the end. The native folder dialog can't be driven over the debugging protocol, so M2 stubs its answer for the folder and checks the dialog handler separately.

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar: set Mülakat to "Dosyadan içe aktar" | Saved; after a reload it is still set; the folder field shows; İngilizce stays copy-paste |
| M2 | Choose a folder | The path shows in Ayarlar and in the Mülakat panel; `settings.json` holds it |
| M3 | Drop one valid and one broken interview file and a vocab file; Mülakat → "İçe aktar" | Valid row, broken row with line errors, "Başka türden 1 dosya atlandı."; `broken.json.errors.txt` appears; the topic isn't created yet |
| M4 | "Geçerlileri içe aktar (1)" | Summary line; the topic appears; the file is in `done/`; the broken one and its report stay |
| M5 | Fix the broken file, list again and import | Report gone, file moved; items merged |
| M6 | Drop a file with the same name as one in `done/`; import | Timestamped name in `done/`; the old file is untouched |
| M7 | Tab through the file mode body | Every control reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 9.2 ticked and set to `done`

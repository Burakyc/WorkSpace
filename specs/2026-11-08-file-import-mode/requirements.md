# Requirements — Phase 9.2 File import mode

**Roadmap phase:** 9.2 File import mode (AI connection modes)
**Branch:** `feat/9.2-file-import-mode`, cut from the milestone branch `claude/milestone-9-145c99`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

An AI tool or agent can leave JSON files in a folder instead of the user pasting them. In the "Dosyadan içe aktar" mode, a module's panel lists the new files in that module's inbox folder on demand, shows which are valid, and imports the valid ones through the same validator and merge as 5.1. Imported files move to `done/`; invalid ones stay, with an error report.

## Scope

- **Electron main / preload:** `settings.pickFolder(title)`: a folder dialog that only answers with the path.
- **API:** `aiInbox` section in `settings.json`; `InboxService` and `POST /api/inbox/{module}/scan`, `POST /api/inbox/{module}/import`; `file` joins `AiModes.Available`.
- **Renderer:** the file mode body in `AiContentPanel`; `InboxFolderField`, used in the panel and in Ayarlar; the "(yakında)" label comes off the file option.
- `tech-stack.md`, `roadmap.md` updated. No new packages.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Inbox folder | **One folder per module** (`aiInbox: { english, learning, interview }`), chosen with a dialog, stored as an absolute path in `settings.json`. |
| Which files a module lists | **By the file's `type`.** A module lists `.json` files whose `type` is its content type. A file of another known type is left alone and only counted ("Başka türden 2 dosya atlandı."). A file without a readable `type` is listed as invalid. So two modules may also share one folder. |
| Error report | **In the list and next to the file:** line-by-line errors in the panel and `<name>.json.errors.txt` next to the file. A report is removed when its file becomes valid, is imported or is gone. |
| Name clash in `done/` | **Timestamp:** `vocab-20261108-143005.json` (local time; `-2`, `-3` … if that exists too). Nothing is ever overwritten. |

## User stories

1. **As the user**, I set Mülakat to "Dosyadan içe aktar" and pick a folder. An agent saves its JSON there.
2. **As the user**, I press "İçe aktar", see the new files with their problems and import the valid ones in one more click; the cards appear.
3. **As the user**, I fix an invalid file (with the report next to it, or by asking the AI again) and press "İçe aktar" again.

## Business and technical rules

### Folder setting

- `settings.json` → `aiInbox: { <module>: "<absolute path>" }`; `GET /api/settings` returns `aiInbox` with every module (`null` when not set).
- `PUT /api/settings/ai-inbox/{module}` with `{ folder }`: `null` or empty clears; otherwise it must be an absolute path of an existing folder, or `400` on `folder`: "Klasör bulunamadı.". Unknown module: `400` on `module`.
- A broken or missing section reads as not set.

### Scan — `POST /api/inbox/{module}/scan` with `{ type }`

POST because it writes and removes error reports.

- Answer: `{ folder, error, files: [{ name, errors }], otherTypeCount }`, files by name.
- No folder set: `folder: null`, empty list. Folder gone: `error: "Klasör bulunamadı."`, empty list.
- Only `*.json` directly in the folder; `done/` and other subfolders are never read.
- Each file: over 2 MB → an error without reading it; unreadable or not UTF-8 → "Dosya okunamadı." Otherwise the text's `type` (Markdown fence ignored, as in the validator) decides: another known type → counted only; anything else → `ImportValidator.Validate` against the module's type, so a broken file gets line-numbered errors.
- Reports: an invalid file gets `<name>.json.errors.txt` with one line per error (`Satır 14 · /items/2/meaning: …`); a listed valid file loses its report; a `*.json.errors.txt` whose `.json` is gone is deleted. A failed report write does not fail the scan. Nothing else in the folder is ever written or deleted.

### Import — `POST /api/inbox/{module}/import` with `{ type, names }`

- Only the given names, one at a time. A name that is not a plain `*.json` file name directly in the folder is refused ("Dosya bulunamadı."): no path can escape the folder.
- Each file is read again and goes through `ImportService.ImportAsync`: invalid (changed since the scan) stays, with its report. Success: moved to `done/`, created when needed, with the clash rule above; its report is removed.
- The merge comes first and the move second. If the move fails, the answer says so ("Dosya taşınamadı.") and the file stays; importing it again only skips what already exists.
- Answer: `{ results: [{ name, report, errors, moved }] }`. A file's failure never stops the others.
- Items are merged as in 5.1: never overwritten.

### Renderer

- File mode body in `AiContentPanel`: the hint "Promptu kopyala, yapay zekânın cevabını klasöre .json dosyası olarak kaydet.", `CopyPromptButton`, `InboxFolderField`, and "İçe aktar" (disabled without a folder).
- "İçe aktar" scans and lists the files: name with "Geçerli", or the errors as "Satır 14 · items[2].meaning: …" (`formatImportError`) and the report's file name. "Yeni dosya yok." for an empty list. Then "Geçerlileri içe aktar (n)" imports the valid files, shows one summary line per file ("Konu: 2 öğe eklendi, 0 öğe zaten vardı.") and scans again.
- `onImported` is called for each saved file, so the topic list reloads.
- `InboxFolderField`: the path or "Klasör seçilmedi.", "Klasör seç…" (`settings.pickFolder`), and "Kaldır" when set. Ayarlar shows it under a module's select while its mode is `file`.
- Ayarlar's note becomes "Yapay zekâ içeriğini her modülün nasıl aldığını seçer."

## Out of scope

| Item | Where it goes |
|---|---|
| Watching the folder, automatic imports | Not planned: the roadmap says on demand |
| Subfolders | Not planned |
| Importing an invalid file partly | Not planned: invalid content is never saved |
| Cleaning up `done/` | Not planned: the user owns that folder |
| API mode | 9.3 |

# Validation — Phase 5.1 Import engine and validator

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 5.1, plus the decisions in [requirements.md](requirements.md):

- [ ] `schemas/vocab.schema.json`, `lesson.schema.json`, `interview.schema.json` with the shared envelope (`schemaVersion`, `type`, `topic`, `level`, `tags`, `items`).
- [ ] `POST /api/import/validate` returns `{ path, line, message }` errors; `POST /api/import` validates, then merges by topic slug and item merge key, and reports added/skipped counts.
- [ ] Rejects non-JSON, files over 2 MB and unknown properties.
- [ ] Shared import UI: paste box or file picker, line-by-line error list, success summary.
- [ ] Prompt templates in `prompts/` and a "Promptu kopyala" button.
- [ ] Error messages are Turkish; the existing level is kept on merge.
- [ ] Tests: validation errors with line numbers, merge never overwrites, duplicates skipped.
- [ ] `tech-stack.md` is updated; the Docker image still builds.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Types | `Modules/Content/ContentTypeTests.cs` | `vocab`, `lesson`, `interview` found with folder, merge key and a schema that builds; `Find("x")` is null |
| T2 | Lines | `Modules/Content/JsonLinesTests.cs` | Pointers of root, nested properties, array items and values on the same line map to their 1-based start lines; `~1`/`~0` escapes work |
| T3 | Keys | `Modules/Content/ContentKeyTests.cs` | "  Follow  up ON " = "follow up on"; "Phrasal verbs — İş toplantıları" → `phrasal-verbs-is-toplantilari`; "Café" → `cafe`; "!!!" → empty; 80-character cap without a trailing `-` |
| T4 | Valid | `Modules/Content/ImportValidatorTests.cs` | A valid vocab, lesson and interview document → no errors, tags normalized; a ```` ```json ```` fence is accepted |
| T5 | Schema errors | same | Missing `meaning` → "Eksik alan: meaning" on the item's line; unknown `q` → "Bilinmeyen alan: q" on its line; wrong level, too long term, number instead of text, empty items, wrong `type` → Turkish messages; no `properties`/`items` summaries; sorted by line |
| T6 | Text errors | same | Empty, over 2 MB, broken JSON (line of the problem), duplicate property, array root, trailing comma → one error each; bad tag → `/tags/0`; topic "!!!" → `/topic` |
| T7 | Merge | `Modules/Content/ImportServiceTests.cs` | First import creates `content/english/<slug>.json` with ids and `addedAt`; second import with 1 new + 2 existing (different case/spaces) → added 1, skipped 2; existing items (including an extra progress field) unchanged; tags unioned; level kept with `levelKept: true`; `updatedAt` unchanged when nothing added |
| T8 | Not saved | same | Invalid text → errors and no file; duplicates inside one file → first added, rest skipped |
| T9 | Endpoints | `Modules/Content/ImportEndpointTests.cs` | `validate` → `200` errors with `line`; `import` → `200` report; second `import` → skipped counts; `type: "x"` → `400` on `type` |
| T10 | Prompts | `Modules/Content/PromptTemplateTests.cs` | The ```` ```json ```` example in each `prompts/<type>.md` passes its schema |
| T11 | Client | `src/shared/api/client.test.ts` | `validateImport('vocab', text)` → `POST /api/import/validate` `{ type, text }`; `importContent` → `POST /api/import` |
| T12 | Error rows | `src/modules/content/formatImportError.test.ts` | `{ path: '/items/2/meaning', line: 14 }` → "Satır 14 · items[2].meaning: …"; no line; empty path |
| T13 | Errors | `src/modules/content/ImportPanel.test.tsx` | Paste + "Kontrol et" → "2 sorun bulundu:" and rows with lines; nothing reported as saved |
| T14 | Import | same | Paste + "İçe aktar" → "<topic>: 2 öğe eklendi, 1 öğe zaten vardı.", level note, box cleared, `onImported` called; buttons disabled while empty |
| T15 | File and failure | same | Picking a file puts its text in the box; a file over 2 MB → message, no request; API failure → "İçe aktarma yapılamadı." |
| T16 | Copy prompt | `src/modules/content/CopyPromptButton.test.tsx` | Click → clipboard gets the template (starts with "Topic:"), "Kopyalandı."; rejected → "Kopyalanamadı." |

## Manual test steps

Run `npm run dev`.

| ID | Step | Expected |
|---|---|---|
| M1 | Open İngilizce, click "Promptu kopyala", paste into a text editor | The vocab template with `Topic:` / `Level:` lines and a JSON example |
| M2 | Paste a valid vocab JSON (3 items, in a ```` ```json ```` fence) and click "Kontrol et", then "İçe aktar" | "Sorun yok, içe aktarılabilir."; then "<topic>: 3 öğe eklendi, 0 öğe zaten vardı."; `content/english/<slug>.json` exists in the data folder |
| M3 | Paste the same topic with 1 new and 2 existing terms (one in capitals) and level `C1` | "1 öğe eklendi, 2 öğe zaten vardı." and "seviyesi değiştirilmedi"; the file has 4 items and the old level |
| M4 | Paste JSON with a missing `meaning`, an extra property and a broken comma on separate lines | Every problem listed with its line; "İçe aktar" saves nothing |
| M5 | Pick a `.json` file with "Ya da bir JSON dosyası seç"; pick a file over 2 MB | Its text appears in the box; the large file shows "Dosya 2 MB'tan büyük olamaz." |
| M6 | Öğrenme and Mülakat: paste a vocab JSON | "type" error; their own templates import into `content/learning/` and `content/interview/` |
| M7 | Tab through the page | Copy button, box, file input and buttons are reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 5.1 ticked and set to `done`

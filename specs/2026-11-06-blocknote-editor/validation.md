# Validation — Phase 4.2 BlockNote editor

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 4.2, plus the decisions in [requirements.md](requirements.md):

- [x] Opening a page shows BlockNote with the `/` command menu, headings, lists, toggle lists, code blocks with syntax highlighting.
- [x] Autosave with a 1-second debounce in the background; no visible typing lag on a 2,000-word page.
- [x] A pending save is flushed when switching page or closing the app.
- [x] The page title is editable above the editor.
- [x] Tests: debounce and flush behavior (Vitest).
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Content round trip | `Modules/Notes/NoteServiceTests.cs` | A new page reads `[]`; saving two blocks writes them with `schemaVersion: 1` and moves `updatedAt` to the clock's time |
| T2 | Content errors | same | Unknown id → null; folder → `id` error; `blocks` not an array → `blocks` error |
| T3 | Missing file | same | A page whose file was deleted reads `[]` |
| T4 | Endpoints | `Modules/Notes/NotesEndpointTests.cs` | `PUT …/content` then `GET` returns the blocks; unknown id → `404`; folder → `400` |
| T5 | Debounce | `src/modules/notes/autosave.test.ts` | Three `schedule` calls within 1 s → one save with the last value after 1 s |
| T6 | Flush | same | `flush()` saves the pending value at once; with nothing pending it does not save |
| T7 | No overlap | same | A value scheduled during a slow save is saved after it, not in parallel |
| T8 | Failure | same | A failed save keeps the value pending; the next `flush` saves it |
| T9 | Client | `src/shared/api/client.test.ts` | `getNoteContent` → `GET /api/notes/<id>/content`; `saveNoteContent` → `PUT` with `{ blocks }` |
| T10 | Open a page | `src/modules/notes/NotesPage.test.tsx` | The (mocked) editor gets the stored blocks; a folder shows no editor |
| T11 | Autosave and switch | same | An editor change saves after 1 s ("Kaydedildi."); a change then opening another page saves at once |
| T12 | Title | same | Editing the title + Enter renames the page in the tree; Escape restores it |
| T13 | Dictionary | `src/modules/notes/editorDictionary.test.ts` | Turkish placeholder and slash menu titles (e.g. "Başlık 1", "Kod bloğu") |
| T14 | Close handshake | `electron/closeGuard.test.ts` | First close is held and the page is asked; `close-ready` closes; no answer closes after 3 s; a second close passes |
| T15 | Flush on close | `src/modules/notes/NotesPage.test.tsx` | The registered close callback saves the pending change |

## Manual test steps

Run `npm run dev` with a page created in 4.1.

| ID | Step | Expected |
|---|---|---|
| M1 | Open the page, type `/`, pick "Başlık 1", then a bulleted list, a toggle list and a C# code block | The menu is in Turkish; each block appears; C# keywords are coloured |
| M2 | Type a sentence and wait | "Kaydedildi." after about a second; `notes/pages/<id>.json` holds the blocks; the day page lists it as "Düzenlendi" (if created earlier) |
| M3 | Paste a 2,000-word text and type at its end | No visible lag; one save after typing stops |
| M4 | Change the title at the top + Enter | The tree shows the new title |
| M5 | Type and immediately open another page; type and immediately close the window (X) | Both changes are in the files after reopening |
| M6 | Switch the OS to dark mode | The editor follows the theme |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M6 done with the expected results
- [x] `roadmap.md` phase 4.2 ticked and set to `done`

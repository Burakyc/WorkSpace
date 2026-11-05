# Plan — Phase 4.2 BlockNote editor

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/4.2-blocknote-editor
```

Every task ends with `npm run check`. A task is committed only when it passes. New packages only in task 2.

## Tasks

### 1. Page content in the API

**Commit:** `feat(notes): read and save page content`

- `NoteService.GetContentAsync` / `SaveContentAsync` (sets `updatedAt`), `NoteContentInput`; `GET` / `PUT /api/notes/{id}/content` with a 5 MB request limit.
- `NoteServiceTests.cs` (T1–T3), `NotesEndpointTests.cs` (T4).
- Check: `npm run check`.

### 2. BlockNote packages

**Commit:** `chore(notes): add BlockNote 0.56.0 and its Mantine UI`

- `npm install -w apps/desktop --save-exact @blocknote/core@0.56.0 @blocknote/react@0.56.0 @blocknote/mantine@0.56.0 @blocknote/code-block@0.56.0 @mantine/core@9 @mantine/hooks@9`.
- `tech-stack.md` overview row "Note editor" names the packages and versions.
- Check: `npm run check`.

### 3. Debounced autosave

**Commit:** `feat(notes): add the debounced autosave`

- `src/modules/notes/autosave.ts`.
- `autosave.test.ts` (T5–T8).
- Check: `npm run check`.

### 4. Renderer client

**Commit:** `feat(notes): add the page content requests`

- `getNoteContent`, `saveNoteContent` in the client; fake API routes.
- `client.test.ts` (T9).
- Check: `npm run check`.

### 5. Editor on pages

**Commit:** `feat(notes): edit pages with BlockNote`

- `NoteEditor.tsx` (BlockNote, code block languages, filtered slash menu, theme), `editorDictionary.ts`, `NotePage.tsx` (load content, editable title, status line, autosave, flush on unmount); `NoteView` uses it for pages.
- `NotesPage.test.tsx` with `NoteEditor` mocked (T10–T12), `editorDictionary.test.ts` (T13).
- Check: `npm run check`; manual M1–M4.

### 6. Flush before the app closes

**Commit:** `feat(notes): save pending changes before the app closes`

- Main: `close` handshake with a 3-second fallback (`electron/closeGuard.ts`); preload `onBeforeClose`; `DevPathBridge` type; the notes page registers its flush.
- `closeGuard.test.ts` (T14), `NotesPage.test.tsx` (T15).
- Check: `npm run check`; manual M5.

### 7. Docs

**Commit:** `docs: document the note editor`

- `specs/tech-stack.md`: content endpoints, autosave and close handshake, preload `onBeforeClose`, editor language and Turkish dictionary.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 4.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 4.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward `main` to `feat/4.2-blocknote-editor`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(notes): read and save page content` |
| 2 | `chore(notes): add BlockNote 0.56.0 and its Mantine UI` |
| 3 | `feat(notes): add the debounced autosave` |
| 4 | `feat(notes): add the page content requests` |
| 5 | `feat(notes): edit pages with BlockNote` |
| 6 | `feat(notes): save pending changes before the app closes` |
| 7 | `docs: document the note editor` |
| 8 | `docs(roadmap): mark phase 4.2 done` |

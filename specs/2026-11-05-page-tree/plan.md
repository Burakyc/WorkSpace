# Plan — Phase 4.1 Page tree

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/4.1-page-tree
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Note tree service

**Commit:** `feat(notes): add the page tree service`

- `Modules/Notes/NoteNode.cs`, `NoteInputs.cs`, `NotesModule.cs` (`AddNotes()`, `notes/index.json`), `NoteService.cs` (list, create, rename, move, shift, delete); `JsonFileStore.DeleteAsync(path)`; registered in `Program.cs`.
- `NoteServiceTests.cs` (T1–T7), `JsonFileStoreTests.cs` (T8).
- Check: `npm run check`.

### 2. Notes endpoints

**Commit:** `feat(notes): add the notes endpoints`

- `Modules/Notes/NotesController.cs`.
- `NotesEndpointTests.cs` (T9–T10).
- Check: `npm run check`.

### 3. Notes of the day

**Commit:** `feat(calendar): list the notes of the day`

- `DayService` takes `IRepository<NoteNode>` and returns `notes`.
- `DayServiceTests.cs` (T11).
- Check: `npm run check`.

### 4. Renderer client

**Commit:** `feat(notes): add the notes requests`

- Types `NoteNode`, `NoteKind`, `DayNote`; client `listNotes`, `createNote`, `renameNote`, `moveNote`, `shiftNote`, `deleteNote` (`DELETE`, empty `204` body); fake API notes route; `modules/notes/noteTree.ts` (children by parent, ancestors, descendants, move targets).
- `client.test.ts` (T12), `noteTree.test.ts` (T13).
- Check: `npm run check`.

### 5. Notes page with the tree

**Commit:** `feat(notes): show and edit the page tree`

- `NotesPage.tsx`, `NoteTree.tsx`, `NoteTreeItem.tsx`, `NoteView.tsx`, `NotesPage.module.css`; routes `/notes` (navigation entry) and `/notes/:id` (`AppRoutes.tsx`).
- Create, rename, shift, delete with confirmation.
- `NotesPage.test.tsx` (T14–T17).
- Check: `npm run check`; manual M1–M3.

### 6. Move items

**Commit:** `feat(notes): move items by drag and drop or a list`

- `MovePanel.tsx` ("Taşı…") and drag and drop in the tree.
- `NotesPage.test.tsx` (T18–T19).
- Check: `npm run check`; manual M4.

### 7. Notes on the day page

**Commit:** `feat(calendar): show the notes of the day`

- "Notlar" section in `DayPage.tsx`.
- `DayPage.test.tsx` (T20).
- Check: `npm run check`; manual M5–M6.

### 8. Docs

**Commit:** `docs: document the page tree`

- `specs/tech-stack.md`: the notes endpoints, the `notes/` file shapes, the `/notes/:id` route, notes on the day page.

### 9. Close the phase

**Commit:** `docs(roadmap): mark phase 4.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 4.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward `main` to `feat/4.1-page-tree`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(notes): add the page tree service` |
| 2 | `feat(notes): add the notes endpoints` |
| 3 | `feat(calendar): list the notes of the day` |
| 4 | `feat(notes): add the notes requests` |
| 5 | `feat(notes): show and edit the page tree` |
| 6 | `feat(notes): move items by drag and drop or a list` |
| 7 | `feat(calendar): show the notes of the day` |
| 8 | `docs: document the page tree` |
| 9 | `docs(roadmap): mark phase 4.1 done` |

# Plan — Phase 4.3 Notes search

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/4.3-notes-search
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Plain text from BlockNote

**Commit:** `feat(notes): extract plain text from pages`

- `Modules/Notes/NoteText.cs`, `Modules/Notes/SearchText.cs` (`Fold`).
- `NoteTextTests.cs` (T1–T2), `SearchTextTests.cs` (T3).
- Check: `npm run check`.

### 2. Search service and endpoint

**Commit:** `feat(notes): search pages by title and text`

- `Modules/Notes/NoteSearchService.cs` (records `NoteSearchResult`, `Highlight`), registered in `AddNotes()`; `GET /api/notes/search` in `NotesController`.
- `NoteSearchServiceTests.cs` (T4–T7), `NotesEndpointTests.cs` (T8).
- Check: `npm run check`.

### 3. Renderer client

**Commit:** `feat(notes): add the search request`

- Types `NoteSearchResult`, `Highlight`; `searchNotes(q)`; fake API route.
- `client.test.ts` (T9).
- Check: `npm run check`.

### 4. Search box and results

**Commit:** `feat(notes): search notes from the tree panel`

- `NoteSearch.tsx` (form, results, `Snippet` with `<mark>`), used in `NoteTree.tsx`; CSS.
- `NotesPage.test.tsx` (T10–T13).
- Check: `npm run check`; manual M1–M4.

### 5. Docs

**Commit:** `docs: document notes search`

- `specs/tech-stack.md`: the search endpoint, matching and ranking rules.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 4.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 4.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward `main` to `feat/4.3-notes-search`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(notes): extract plain text from pages` |
| 2 | `feat(notes): search pages by title and text` |
| 3 | `feat(notes): add the search request` |
| 4 | `feat(notes): search notes from the tree panel` |
| 5 | `docs: document notes search` |
| 6 | `docs(roadmap): mark phase 4.3 done` |

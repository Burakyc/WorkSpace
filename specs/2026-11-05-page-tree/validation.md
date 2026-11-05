# Validation — Phase 4.1 Page tree

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 4.1, plus the decisions in [requirements.md](requirements.md):

- [x] Folders and pages in a tree (`notes/index.json`); create, rename, move (drag or "Taşı…"), reorder, delete with confirmation.
- [x] Subpages: any item can have child items.
- [x] Each new page is stored as an empty `notes/pages/<id>.json`.
- [x] The day page lists the pages created or edited that day.
- [x] Tests: tree operations (move into own child is rejected, delete removes children).
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Create | `Modules/Notes/NoteServiceTests.cs` | Folder and page at the top level and under a parent; `order` 0, 1 among siblings; times from `TimeProvider`; a page writes `notes/pages/<id>.json` with `blocks: []`, a folder writes none |
| T2 | Create errors | same | Empty or 201-character title → `title`; kind `note` → `kind`; unknown parent → `parentId` |
| T3 | Rename | same | Title trimmed and `updatedAt` changed; same title → no change; unknown id → null |
| T4 | Move | same | Moves under a new parent as last child, and to the top level; `updatedAt` unchanged |
| T5 | Move rejected | same | Into itself and into its grandchild → `parentId` error; nothing changed |
| T6 | Shift | same | `-1` / `1` swap with the neighbour; at the first / last place nothing changes; `offset: 2` → `offset` error |
| T7 | Delete | same | Removes the node, its children and grandchildren and their page files; siblings stay; unknown id → false |
| T8 | Delete file | `Infrastructure/Storage/JsonFileStoreTests.cs` | `DeleteAsync` removes the file; a missing file is fine; a path outside the folder throws |
| T9 | Endpoints | `Modules/Notes/NotesEndpointTests.cs` | POST → `201`; GET lists it; PUT renames; move, shift; DELETE → `204` then GET is empty |
| T10 | Endpoint errors | same | Bad title → `400` with `title`; unknown id → `404` for PUT, move, shift, DELETE |
| T11 | Notes of the day | `Modules/Calendar/DayServiceTests.cs` | A page created that day (`created: true`), one created earlier and renamed that day (`created: false`), a folder and a page of another day are left out; time-zone boundary as in 3.2 |
| T12 | Client | `src/shared/api/client.test.ts` | `listNotes`, `createNote`, `renameNote`, `moveNote`, `shiftNote` send the right method, path and body; `deleteNote` sends `DELETE` and resolves on `204` |
| T13 | Tree helpers | `src/modules/notes/noteTree.test.ts` | Children sorted by `order`; ancestors of a deep node; descendants; move targets leave out the item and its descendants |
| T14 | Empty and create | `src/modules/notes/NotesPage.test.tsx` | Empty state; "Yeni sayfa" → "Adsız sayfa" in rename mode; type a title + Enter → saved and shown |
| T15 | Open and nest | same | Click a page → its title and "Sayfa düzenleyici yakında geliyor."; "Alt klasör ekle" → child under it with the breadcrumb |
| T16 | Reorder | same | "Aşağı taşı" on the first item → it is second |
| T17 | Delete | same | "Sil" → confirmation names the child count; "Vazgeç" keeps it; "Sil" removes it and its child; deleting the open page goes to `/notes` |
| T18 | Move panel | same | "Taşı…" lists valid targets only (not itself or children); choose a folder → item is inside it |
| T19 | Drag and drop | same | Drag a page onto a folder → inside it; drag onto "En üste" → top level; drop on its own child → no request |
| T20 | Day notes | `src/modules/calendar/DayPage.test.tsx` | "Notlar" lists the titles with "Oluşturuldu" / "Düzenlendi" linking to `/notes/<id>`; empty → "Bu gün not yok." |

## Manual test steps

Run `npm run dev` with an empty `notes/` folder.

| ID | Step | Expected |
|---|---|---|
| M1 | Notlar → "Yeni klasör", name it "ASP.NET"; "Alt sayfa ekle" twice ("DI", "Middleware") | Tree shows the folder with two pages; `notes/index.json` has three items; `notes/pages/` has two files with `blocks: []` |
| M2 | Open "DI", reload the window (Ctrl+R) | The same page is open; the breadcrumb shows "ASP.NET" |
| M3 | Rename "DI" to "Dependency injection"; "Aşağı taşı" on it | Title changes in the tree and the page; it is now below "Middleware" |
| M4 | Drag "Middleware" onto "Dependency injection"; then "Taşı…" → "En üst seviye" | It becomes a subpage, then a top-level page; dragging a folder onto its own child does nothing |
| M5 | Delete "ASP.NET" with its children | Confirmation names the children; after "Sil" the tree and the page files are gone |
| M6 | Takvim → today | "Notlar" lists today's pages with "Oluşturuldu"; clicking one opens it in Notlar |
| M7 | Tab through the Notlar page | Every link, button and field reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M7 done with the expected results
- [x] `roadmap.md` phase 4.1 ticked and set to `done`

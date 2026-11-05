# Requirements — Phase 4.1 Page tree

**Roadmap phase:** 4.1 Page tree (Milestone 4 — Notes)
**Branch:** `feat/4.1-page-tree`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The Notlar page gets a tree of folders and pages: create, rename, move (drag and drop or "Taşı…"), reorder and delete with confirmation. Any item can hold child items. Each page gets an empty content file `notes/pages/<id>.json` that the editor fills in phase 4.2. The day page (3.2) lists the pages created or edited that day.

## Scope

- **API** (`Modules/Notes/`): `NoteNode` in `notes/index.json`, `NoteService` (tree rules) and the `/api/notes` endpoints; `JsonFileStore.DeleteAsync` for page files; `DayService` adds the notes of the day.
- **Renderer**: the Notlar page with the tree panel and the selected item at `/notes/:id`; a "Notlar" section on the day page.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Moving | **Drag and drop and "Taşı…"**. Dropping an item on another item makes it that item's last child; dropping it on the "En üste" zone moves it to the top level. "Taşı…" opens a small panel with a list of valid targets (keyboard friendly). Native HTML5 drag and drop, no new package. |
| Order | **Manual**. A new or moved item goes to the end of its new parent; "Yukarı taşı" / "Aşağı taşı" swap it with its neighbour. Moving and reordering never change `updatedAt`. |
| Nesting | **Anything can hold anything**: folders and pages can both have folders and pages as children. The only difference: a page has content (a page file, the editor in 4.2), a folder does not. |
| Delete order (implementation) | The plan said one index write; `IRepository<T>` deletes one item at a time, so nodes are deleted **deepest first** (index entry, then page file). An interrupted delete never leaves a child without its parent. |
| Shift (implementation) | After the swap the siblings are renumbered `0..n-1` (only changed ones written), so gaps or ties in `order` never block a move. |
| Tree helpers file (implementation) | The plan named `noteTree.ts`; on Windows' case-insensitive file system `./NoteTree` resolved to it, so it is `treeHelpers.ts`. |
| Notes of the day | **Pages only**, created or edited that day (local date of `createdAt` / `updatedAt` in the page's time zone). "Edited" means title or content changed. Each row links to the page and says "Oluşturuldu" or "Düzenlendi" (created wins when both are on that day). |

## User stories

1. **As the user**, I create folders and pages, nest them as deep as I like, and see them as a tree.
2. **As the user**, I rename an item, move it by dragging or with "Taşı…", and change its place among its siblings.
3. **As the user**, I delete an item after confirming, and its children go with it.
4. **As the user**, I click a page and it opens; the URL keeps it open after a reload.
5. **As the user**, on a day in the calendar I see the notes I created or edited that day and open them.

## Business and technical rules

### Data

- `notes/index.json`: `{ "schemaVersion": 1, "items": [ NoteNode… ] }` through `JsonRepository<NoteNode>`.
- `NoteNode`: `id`, `parentId` (`null` at the top level), `kind` (`"folder"` | `"page"`), `title`, `order` (integer, siblings sorted ascending), `createdAt`, `updatedAt` (ISO 8601 UTC).
- A new page writes `notes/pages/<id>.json` = `{ "schemaVersion": 1, "blocks": [] }` (empty BlockNote document). Folders have no file.

### Endpoints

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/notes` | – | every node, sorted by parent then `order` |
| POST | `/api/notes` | `{ parentId, kind, title }` | `201` node; `order` = last among the new siblings |
| PUT | `/api/notes/{id}` | `{ title }` | node with the new title and `updatedAt` (no write when the title is the same) |
| POST | `/api/notes/{id}/move` | `{ parentId }` | node, now last child of `parentId` (`null` = top level) |
| POST | `/api/notes/{id}/shift` | `{ offset: -1 \| 1 }` | node swapped with the previous / next sibling; at the edge nothing changes |
| DELETE | `/api/notes/{id}` | – | `204`; the node, all its descendants and their page files are removed |

- Unknown `id` → `404`.
- Title: trimmed, required ("Başlık gerekli."), at most 200 characters ("Başlık en fazla 200 karakter olabilir.").
- `kind` must be `folder` or `page` ("Tür klasör veya sayfa olmalı.").
- `parentId` must exist ("Üst öğe bulunamadı.").
- Moving into itself or one of its descendants → `parentId` error "Bir öğe kendi içine veya alt öğelerinden birine taşınamaz.".
- `offset` other than -1 or 1 → `offset` error "Kaydırma -1 veya 1 olmalı.".
- Delete removes the nodes deepest first, each index entry followed by its page file; a missing page file is ignored.

### Day page

- `GET /api/days/{date}` adds `notes`: `[{ id, title, created }]` — pages whose local `createdAt` or `updatedAt` date is the day, `created: true` when `createdAt` is on that day; ordered by `updatedAt`, oldest first.
- The day page shows a "Notlar" section: each title links to `/notes/<id>` with "Oluşturuldu" or "Düzenlendi"; empty: "Bu gün not yok.".

### Renderer

- Route `/notes` and `/notes/:id`, both render `NotesPage` (tree panel + selected item); Notlar stays active in the sidebar. An unknown id shows "Not bulunamadı." with the tree.
- Tree panel: "Yeni sayfa" and "Yeni klasör" (top level). Each item: icon (folder / page), title link (opens it), expand/collapse button when it has children, and an "İşlemler" button with: "Alt sayfa ekle", "Alt klasör ekle", "Yeniden adlandır", "Taşı…", "Yukarı taşı", "Aşağı taşı", "Sil".
- New items are created with the title "Adsız sayfa" / "Yeni klasör", the parent expands, and the new item opens in rename mode. Rename is an inline text field: Enter or blur saves, Escape cancels; API errors show under the field.
- "Taşı…": a panel listing "En üst seviye" and every item except the item itself and its descendants, indented by depth; "Taşı" and "Vazgeç".
- Drag and drop: every item is draggable; dropping on another item moves it inside, on the "En üste" zone (shown while dragging) to the top level. Drops on itself or a descendant are ignored.
- "Sil": an inline confirmation "“Başlık” silinsin mi? 3 alt öğe de silinecek." (the second sentence only when it has children) with "Sil" and "Vazgeç". Deleting the open item (or its ancestor) goes back to `/notes`.
- Selected item: breadcrumb (ancestors as links), title, child list (links). A page shows "Sayfa düzenleyici yakında geliyor." under the title until 4.2.
- Empty tree: the empty state "Henüz not yok." with "Yeni sayfa" / "Yeni klasör".
- After every change the page reloads the list from the API (tech-stack rule). Failed load: "Notlar yüklenemedi."; failed action: "İşlem yapılamadı." (or the field error).

## Out of scope

| Item | Where it goes |
|---|---|
| Page content and the editor | Phase 4.2 |
| Search | Phase 4.3 |
| Reorder by dragging between items | Not planned; "Yukarı/Aşağı taşı" covers it |
| `Ctrl+N` new note | Phase 7.1 |
| Trash / undo delete | Not planned; delete asks first. Backups come post-MVP |
| Full ARIA `tree` keyboard model (arrow keys) | Not planned; items are links and buttons in nested lists, reachable with Tab |

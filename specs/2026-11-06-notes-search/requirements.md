# Requirements — Phase 4.3 Notes search

**Roadmap phase:** 4.3 Notes search (Milestone 4 — Notes)
**Branch:** `feat/4.3-notes-search`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

A search box at the top of the notes tree finds pages by title and text. The API extracts plain text from the stored BlockNote JSON, matches every search word ignoring case and Turkish letter differences, and returns title matches first. Each result shows the title, where the page is, and a short piece of text with the matches marked; clicking it opens the page.

## Scope

- **API** (`Modules/Notes/`): `NoteText` (plain text from BlockNote blocks), `SearchText` (folding for matching), `NoteSearchService` and `GET /api/notes/search?q=`.
- **Renderer**: the search box in the tree panel and the result list.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Where | **Above the tree** in the Notlar page. A search shows the results in place of the tree; clearing the box brings the tree back. |
| When | **On Enter** (form submit). No search while typing. |
| Matching | **Case and Turkish letters ignored, every word must match.** `ı`, `I`, `İ` → `i`; `ş` → `s`; `ç` → `c`; `ğ` → `g`; `ö` → `o`; `ü` → `u`; everything else lower-cased (invariant). Words are split on whitespace; each must occur somewhere in the title or the text (part of a word is enough). |
| Result row | **Title + location + text piece.** Location is the ancestors' titles ("ASP.NET / DI"); the piece is about 120 characters around the first match in the text, with every match marked. |

## User stories

1. **As the user**, I type a few words and press Enter, and see the pages that contain them, the ones whose title matches first.
2. **As the user**, I find "Dependency Injection" by typing "dependency inj", and "Başlangıç" by typing "baslangic".
3. **As the user**, I see where each result is and a piece of the text, and open it with one click.

## Business and technical rules

### Text extraction (`NoteText.Extract(JsonArray blocks)`)

- One line per block, depth first: a block's own text, then its `children`.
- Inline content: `text` items give their `text`; `link` items give the text of their `content`; plain string `content` (e.g. code blocks) is used as it is. Table content (`{ type: "tableContent", rows: [{ cells: [...] }] }`) gives each cell's inline text, separated by spaces.
- Unknown shapes are skipped, never an error.

### Search (`GET /api/notes/search?q=`)

- `q` is trimmed; 2–200 characters, otherwise `400` with `q` "Arama 2 ile 200 karakter arasında olmalı.".
- Searches **pages** only (folders have no text). A page matches when every folded word occurs in its folded title or folded text.
- Order: pages whose **title** contains every word first, then the rest; inside each group the most recently edited (`updatedAt`) first. At most 50 results.
- Result: `{ id, title, path: [ancestor titles, top first], snippet, highlights: [{ start, length }] }`.
  - `snippet`: up to 120 characters of the text around the earliest match of any word (starting about 30 characters before it), newlines turned into spaces, with "…" at a cut start or end. When only the title matches, the first 120 characters of the text.
  - `highlights`: every occurrence of every word inside `snippet` (positions in `snippet`), sorted, overlaps merged.
- Folding keeps the length of the text (one character in, one out), so positions found in the folded text are positions in the original text.
- The service reads every page file per search. ponytail: no index; fine for hundreds of pages, an index can come with SQLite.

### Renderer

- Tree panel header: a search form with `<input type="search">` labelled "Notlarda ara" (placeholder "Ara…"). Enter submits.
- Fewer than 2 characters: "En az 2 karakter yaz." under the box, no request.
- While a search is shown: "Aranıyor…", then "3 sonuç" / "Sonuç yok." and the list, or "Arama yapılamadı." on failure. Each result: the title as a link to `/notes/<id>`, the location in muted text, the snippet with `<mark>` around highlights (text only, no HTML from the API).
- Clearing the box (empty value, or Escape in the box) shows the tree again. Opening a result keeps the results visible.

## Out of scope

| Item | Where it goes |
|---|---|
| `Ctrl+K` to focus search | Phase 7.1 |
| Search index, fuzzy matching, stemming | Not planned for the MVP |
| Searching folders, daily logs or content modules | Not planned |
| Highlighting matches inside the opened page | Not planned |

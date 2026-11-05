# Requirements — Phase 4.2 BlockNote editor

**Roadmap phase:** 4.2 BlockNote editor (Milestone 4 — Notes)
**Branch:** `feat/4.2-blocknote-editor`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

Opening a page in Notlar shows a BlockNote editor with the `/` command menu, headings, lists, toggle lists and code blocks with syntax highlighting. Changes save themselves in the background one second after typing stops; a pending save is flushed when switching page or closing the app. The page title above the editor is editable.

## Scope

- **API** (`Modules/Notes/`): read and save a page's content (`notes/pages/<id>.json`); saving sets the node's `updatedAt`.
- **Packages** (desktop): `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`, `@blocknote/code-block` 0.56.0 with the Mantine peers `@mantine/core`, `@mantine/hooks` (9.x, exact versions).
- **Renderer**: the editor on page items, the editable title, the debounced autosave, the flush on page switch and app close (main ↔ preload handshake).
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| UI package | **`@blocknote/mantine`**, BlockNote's default UI (slash menu, formatting toolbar, side menu with drag handles). Brings `@mantine/core` and `@mantine/hooks` as peers. |
| Version | **0.56.0** (14 October 2026) for every `@blocknote/*` package, pinned exactly like the other dependencies. 0.57.0 was one week old. |
| Code blocks | **`@blocknote/code-block`** with a short language list: C#, TypeScript, JavaScript, JSON, SQL, Bash, HTML, CSS, Markdown (plus plain text). Shiki's JavaScript engine (no WebAssembly, works with the CSP). |
| Title | **Editable above the editor** (Notion-like): Enter or leaving the field saves through `PUT /api/notes/{id}`; the tree updates. Escape restores the saved title. |
| Lazy editor (implementation) | `NoteEditor` is loaded with `React.lazy` on the first page open, so BlockNote (about 2 MB) stays out of the start-up bundle; the language grammars load only when a code block uses them. |
| Slash menu filter (implementation) | BlockNote's default menu items have no `key` in their type, so the offered items are matched by their translated title. |
| Fake API (implementation) | The content routes of the test fake landed with task 5 instead of task 4 (a script edit missed them in task 4). |
| Language of the editor UI | BlockNote 0.56.0 has no Turkish dictionary. The English dictionary is the base; the placeholders and the slash menu items used here are translated to Turkish in `editorDictionary.ts`. Untranslated tooltips stay English. |

## User stories

1. **As the user**, I open a page and write in it with `/` commands: headings, bulleted and numbered lists, checklists, toggle lists and code blocks.
2. **As the user**, I never press save: what I write is there when I come back, even if I switch page or close the app right after typing.
3. **As the user**, a long page (2,000 words) types without lag.
4. **As the user**, I rename a page by editing its title at the top.

## Business and technical rules

### Content endpoints

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/notes/{id}/content` | – | `{ "blocks": [...] }` from `notes/pages/<id>.json` (`[]` when the file is missing) |
| PUT | `/api/notes/{id}/content` | `{ "blocks": [...] }` | `200` with the node (new `updatedAt`); writes `{ "schemaVersion": 1, "blocks": [...] }` atomically |

- Unknown id → `404`. A folder → `400` with `id` "Klasörlerin içeriği yoktur.". `blocks` must be a JSON array ("İçerik bir blok listesi olmalı."). The API stores the blocks as they are (BlockNote JSON); it does not validate block shapes.
- Request bodies up to 5 MB (Kestrel limit on this action); a bigger page → `413`.

### Autosave

- `createAutosave(save, delayMs = 1000)` (`src/modules/notes/autosave.ts`): `schedule(value)` restarts a 1-second timer with the latest value; `flush()` saves a pending value at once and resolves when it is saved; `pending()` tells whether a save is waiting. Saves never overlap: a value scheduled during a save is saved after it. A failed save keeps the value pending and reports the error; the next `schedule` or `flush` tries again.
- The editor calls `schedule(editor.document)` on every change. A status line under the title shows "Kaydediliyor…", "Kaydedildi." or "Kaydedilemedi. Yazmaya devam edince tekrar denenecek." (only after the first change).
- **Page switch:** the editor component is keyed by page id; on unmount it calls `flush()`.
- **App close:** main intercepts the window `close` once, sends `devpath:before-close`, and closes when the page answers `devpath:close-ready` or after 3 seconds. The preload exposes `onBeforeClose(callback: () => Promise<void>)`; the notes page registers a callback that flushes. With no editor open the page answers at once.

### Editor

- `NoteEditor.tsx`: `useCreateBlockNote` with the stored blocks as `initialContent` (`undefined` for an empty page), the Turkish dictionary, and the code block spec from `@blocknote/code-block` restricted to the language list. `BlockNoteView` from `@blocknote/mantine` with `theme` following `prefers-color-scheme`.
- The page loads its content before showing the editor ("Yükleniyor…"; "Sayfa yüklenemedi." on failure).
- BlockNote CSS (`@blocknote/mantine/style.css`, `@blocknote/core/fonts/inter.css` is **not** imported: the app uses the system font) is imported by `NoteEditor.tsx` only.
- Folders keep the 4.1 view (children list, no editor).

## Out of scope

| Item | Where it goes |
|---|---|
| Search over content | Phase 4.3 |
| Images, files, tables, embeds | Not planned for the MVP (slash menu shows only text blocks, lists, toggles, quote and code) |
| Collaboration / Yjs | Not planned (single user) |
| Version history of a page | Not planned; daily backups come post-MVP |
| Full Turkish translation of BlockNote tooltips | Later, if BlockNote ships a Turkish dictionary |

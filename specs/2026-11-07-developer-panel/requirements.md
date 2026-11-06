# Requirements — Phase 7.3 Developer panel

**Roadmap phase:** 7.3 Developer panel (Milestone 7 — MVP polish and release)
**Branch:** `claude/milestone-7-3aa8fa`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

A hidden page, opened with `Ctrl+Shift+D`, shows whether the API is healthy and which version runs, the last 50 errors of the API and of the renderer, and how big the data files are. It never shows secrets or personal content, so it can be shared in a screenshot.

## Scope

- **API**: `Infrastructure/Diagnostics/` — `ErrorBuffer` (last 50, in memory) filled by a logger provider; `Modules/System/` — `DataFileSizes` and `GET /api/dev`.
- **Renderer**: `shared/errors/errorLog.ts` (last 50 renderer errors, in memory), filled by window error events and failed API requests; `modules/devpanel/DevPanelPage.tsx` on the hidden route `/dev`; `Ctrl+Shift+D`.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Error sources | **API and renderer.** The API keeps its `Error`/`Critical` log entries (unhandled exceptions included); the renderer keeps uncaught errors, unhandled promise rejections and failed API requests. The panel shows both, newest first. |
| Privacy | **Type and path, no message.** A row is time, source, kind (exception type or HTTP status) and path. Messages and stack traces are never kept, since they can hold note text or tokens. |
| File sizes | **Files and folder totals.** Each top-level file with its size; each top-level folder with its file count and total size; a grand total. No file inside a folder is named. |
| Opening | **`Ctrl+Shift+D`, not in the help.** `/dev` is not in the sidebar or the `?` help. Pressing it on `/dev` goes back to the previous page (Ana Sayfa when there is none). |

## User stories

1. **As the developer**, I press `Ctrl+Shift+D` when something feels wrong and see whether the API answers and what failed recently.
2. **As the developer**, I see how large `sessions.json` or `notes/` has grown.
3. **As the developer**, I can share a screenshot of the panel without leaking a token or a note.

## Business and technical rules

### API errors

- `ErrorBuffer`: thread-safe, keeps the last **50** entries (oldest dropped), returns them newest first. Entry: `{ at, source, kind, path }`.
- `ErrorBufferLoggerProvider` (registered as an `ILoggerProvider`) records every log entry at `Error` or above:
  - `source`: the type that threw (`exception.TargetSite.DeclaringType.Name`, without compiler-generated parts), otherwise the last part of the log category.
  - `kind`: the exception type name, or `Log` without an exception.
  - `path`: `METHOD route-template` of the current request (e.g. `PUT api/notes/{id}/content`) from the matched endpoint, or `null` outside a request or without a matched route. The real path and query are never kept.
- `GET /api/dev` → `{ startedAt, errors: [...], files: [...], totalBytes }` (token-protected like every endpoint).

### Data file sizes (`DataFileSizes.Measure(dataDir)`)

- Top-level files: `{ name, folder: false, files: 1, bytes }`. Top-level folders: `{ name, folder: true, files: <count, recursive>, bytes: <sum> }`. Sorted by name (ordinal, ignoring case). `totalBytes` is the sum. Files that vanish while measuring are skipped.

### Renderer errors (`errorLog.ts`)

- Same rule: last **50**, newest first, in memory only (lost on reload). Entry `{ at, source: 'renderer', kind, path }`.
- `window` `error` → kind = the error's `name` (or `Error`); `unhandledrejection` → the reason's `name` (or `UnhandledRejection`). `path` is the current route (hash path) with segments masked as below.
- Failed API request (`createApiClient`): `HTTP <status>` for a non-OK answer except `400` (validation is expected), `NetworkError` when `fetch` rejects. `path` = `METHOD /api/...` without the query; a path segment that is not plain lower-case letters (`a–z`) becomes `{…}`, so ids, dates and slugs never show.

### Panel (`/dev`, `DevPanelPage`)

- Title "Geliştirici paneli". Sections:
  - **API**: "Durum: çalışıyor" / "Durum: yanıt yok", "Sürüm: <version>", "Yanıt süresi: <ms> ms" (from `GET /api/health`).
  - **Son hatalar**: a table (Zaman, Kaynak "API"/"Arayüz", Tür, Yol), at most 50 each, merged and sorted newest first; "Hata yok." when empty; "API hataları okunamadı." when `/api/dev` fails (renderer errors still show).
  - **Veri dosyaları**: a table (Ad — folders end with `/`, Dosya, Boyut in B / KB / MB with `tr-TR` numbers), then "Toplam: …".
  - A "Yenile" button reloads everything.
- Times are `tr-TR` local date and time with seconds.

## Out of scope

| Item | Where it goes |
|---|---|
| Writing errors to a log file, crash reports | Not planned for the MVP |
| Main-process errors | Not planned (main shows its own error windows) |
| Clearing the buffers, filtering, copying | Not planned |

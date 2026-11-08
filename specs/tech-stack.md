# Tech Stack

## Overview

| Layer | Choice |
|---|---|
| Desktop shell | Electron (latest stable), Windows only |
| Frontend | React + TypeScript (`strict`), Vite, React Router |
| Note editor | BlockNote 0.56.0 (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` with `@mantine/core` / `@mantine/hooks` 9.7.4, `@blocknote/code-block` for syntax highlighting) |
| Code samples | Shiki 4.6.0 (`@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs-precompiled`, `@shikijs/themes`), C# only, for interview answers and lesson bodies; the same version BlockNote's code blocks bring in |
| Backend | ASP.NET Core Web API on **.NET 10 LTS**, controllers |
| Storage | JSON files behind `IRepository<T>` |
| Validation | JSON Schema files in `schemas/` (draft 2020-12, embedded in the API assembly), validated with JsonSchema.Net 9.6.0 |
| External data | GitHub REST API (public, optional token), YouTube channel RSS |
| Tests | xUnit v2 (VSTest) + `WebApplicationFactory` (backend), Vitest + React Testing Library (frontend) |
| Packaging | electron-builder (per-user NSIS wizard, unsigned) with a self-contained, single-file API executable; `node_modules` is not packaged (electron-vite bundles the renderer) |
| Package manager | npm workspaces |
| Desktop build | electron-vite (main, preload and renderer); TypeScript 6.0 (typescript-eslint does not support 7.x yet) |
| Node | 24, pinned in `.nvmrc` and `engines` |
| Docker (optional) | API-only dev container: multi-stage `apps/api/Dockerfile` (`sdk:10.0` → `aspnet:10.0`, non-root, Production), built with the repo root as context (it needs `schemas/`; the root `.dockerignore` lets in only the API and `schemas/`), and root `docker-compose.yml` (`127.0.0.1` port, token from `.env`, repo `data/` mounted). Never needed by the desktop app or `npm run check`. |

UI text is Turkish. Code, identifiers, comments, commits and docs are English.

## Architecture

```
┌──────────────────────── Electron ────────────────────────┐
│ main process                                             │
│  - picks a free port, generates a per-launch API token   │
│  - spawns the API process, kills it on quit              │
│  - safeStorage (secrets), notifications, reminders       │
│  - reads and writes app config (data folder path)        │
│  - daily backup of the data folder, restore              │
│                                                          │
│ preload (contextBridge, minimal)                         │
│  - getApiConfig(), settings.*, pomodoro.*, onOpenPage(), │
│    onBeforeClose(), secrets.*, openExternal(),           │
│    reminders.refresh()                                   │
│                                                          │
│ renderer (React, sandboxed)                              │
│  - typed fetch client ──HTTP──┐                          │
└───────────────────────────────┼──────────────────────────┘
                                ▼
          ASP.NET Core Web API  (http://127.0.0.1:<port>)
          controllers → services → repositories → JSON files
          background refresh: GitHub, YouTube RSS → cache
          read-only: feed.json, stats.json (written by the agent)
```

### Process lifecycle

1. Electron main reads `app-config.json` from Electron's `userData` folder (non-secret settings such as `dataDir`).
2. It picks a free port, creates a random 32-byte token, and starts the API with environment variables `DEVPATH_PORT`, `DEVPATH_TOKEN`, `DEVPATH_ORIGIN` (the renderer's origin for CORS), `DEVPATH_PARENT_PID` (main's PID), `DEVPATH_DATA_DIR` and decrypted secrets (e.g. `DEVPATH_GITHUB_TOKEN`). Secrets live only in that process's memory. The API's working directory is the exe's folder, so it finds `appsettings.json`.
   - Dev: root `npm run dev` runs `dotnet build apps/api/DevPath.slnx` first; main then spawns `apps/api/DevPath.Api/bin/Debug/net10.0/DevPath.Api.exe` directly. Not `dotnet run`: it is too slow for the 10 s timeout, and killing it on Windows leaves the real API process running.
   - Packaged: `resources/api/DevPath.Api.exe` (with `appsettings.json` next to it), started in `Production`. `npm run package` runs `dotnet publish -r win-x64 --self-contained -p:PublishSingleFile=true` first. The installed app is named `DevPath` through electron-builder `extraMetadata.productName`, so its `userData` is `%APPDATA%\DevPath`, separate from development (`%APPDATA%\@devpath\desktop`). Uninstall keeps `%APPDATA%\DevPath`.
3. Main polls `GET /api/health` (with the token) until it answers `200` (timeout 10 s, or earlier if the API process exits). On failure it shows `dialog.showErrorBox` with a Turkish message and quits; the main window is never opened.
4. When a secret or the data folder changes, main restarts the API. A data folder change (Ayarlar, `settings.changeDataDir()`) creates the folder, writes `app-config.json`, stops the old API, starts a new one on a new port with a new token, and reloads the window. If the new API does not start, the old `app-config.json` is restored and the old API is started again.
5. Daily backup: in `launch()`, after creating the data folder and **before** starting the API (so nothing is written during the copy), main runs `dailyBackup` (`electron/backups.ts`). A failure is logged and the app starts anyway. A restore (Ayarlar → Yedekler, `settings.listBackups()` / `settings.restoreBackup(name)`) checks the name against the list, stops the API and waits for the process to exit (`ApiHandle.exited`), backs up the current data, replaces the data folder's contents with the backup, starts the API again on the same folder and reloads the window. A failed copy is rolled back from the pre-restore backup and shown in an error message box before the reload; if the API cannot start again, the error window opens and the app quits.
6. On quit, main stops the API process. If main dies without quitting, the API notices that `DEVPATH_PARENT_PID` exited and stops itself.

### API rules

- Kestrel binds to `127.0.0.1` only. Nothing listens on `0.0.0.0` or `localhost` (which can resolve to IPv6/other interfaces).
  - **Exception: the optional Docker container.** With `DEVPATH_IN_CONTAINER=1` (set only in `apps/api/Dockerfile`) the API binds `0.0.0.0` inside the container, because Docker's port mapping cannot reach a container's loopback. `docker-compose.yml` publishes the port on `127.0.0.1` only, so nothing outside the machine can reach it, and the token and `Host` checks stay on. Any other value of the variable keeps `127.0.0.1`.
- Every request must carry `X-DevPath-Token: <per-launch token>`; requests without it get `401`. This stops other local processes and web pages from using the API. When `DEVPATH_TOKEN` is not set, the check is off in Development only (with a warning, for running the API on its own); any other environment refuses to start.
- The `Host` must be `127.0.0.1` (built-in host filtering, `AllowedHosts: "127.0.0.1"`, `400` otherwise). This blocks DNS rebinding. The port is not compared: a rebinding attack always changes the host name.
- CORS allows only the origin in `DEVPATH_ORIGIN`: the Vite dev server origin in development, `null` for the `file://` page in a build. Without it, no cross-origin request is allowed. CORS runs before the token check so browser preflights are answered.
- Errors are returned as RFC 7807 `ProblemDetails`. Invalid input: services throw `ValidationException(errors)` and one global `ValidationExceptionFilter` returns `400` `ValidationProblemDetails` with `errors: { camelCaseField: [message] }`. Messages are Turkish because the UI shows them as they are; controllers never validate.
- Each module registers its own storage in an `Add<Module>()` extension: `IRepository<T>` → `JsonRepository<T>` with the module's file name and `DocumentSchema`, plus its service as a concrete class. Services get the time from `TimeProvider` so tests can fix it.
- The built-in OpenAPI document (`/openapi/v1.json`) is served in Development only.
- Without `DEVPATH_PORT` (running the API on its own), the API falls back to port `5180`.
- Controllers are thin: parse input, call one service method, map the result. Business logic lives in services.
- Everything is `async` and takes a `CancellationToken`.
- External calls (GitHub, YouTube) go through `HttpClient` from `IHttpClientFactory`, with a timeout. Results are cached in JSON; on failure the last cache is served with an `error` field so the UI can show an error card.

### Frontend rules

- Function components and hooks only. State is React state plus a few contexts (theme, active pomodoro). No global state library.
- One typed API client (`shared/api/`) wraps `fetch`, adds the token and base URL from `await window.devpath.getApiConfig()` (async: the preload asks main over IPC, and main answers only the app's own page), and returns typed results. No `any`. Pages get it through `getApiClient()`, cached for the page load (the window reloads when the API restarts). A `400` validation problem becomes `ApiError.errors`, shown next to the form fields.
- Pages reload their list from the API after every change (no client-side cache or optimistic updates); effects load data with a promise chain and an `active` flag.
- Design tokens live in one file (`shared/ui/tokens.css`) as CSS variables (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, sidebar widths); light/dark switch on `prefers-color-scheme`. Accent is indigo. Fonts are the system stack (Segoe UI Variable, Cascadia Code); no bundled web fonts. Components use CSS Modules and only token values. `tokens.test.ts` checks WCAG AA contrast of the token pairs in light and dark (text 4.5:1; focus ring and `--color-input-border` for form fields 3:1); card borders (`--color-border`) stay soft.
- Routing: `HashRouter` (the production page is a `file://` URL). One route table (`src/app/navigation.tsx`) drives the sidebar and the routes; paths are English, labels Turkish. A module replaces its empty state entry with its page.
- Layout: sidebar + content area, with a skip link and a visible `:focus-visible` ring. Below 900 px (`width < 900px`, so fractional widths on scaled displays are covered) the sidebar collapses to icons and content goes to one column. Icons are SVG (lucide-react). The API status sits in the sidebar footer.
- `app-config.json` is read and written only by Electron main, atomically, with `schemaVersion: 1`.
- Imported or user text is always rendered as text. No `dangerouslySetInnerHTML`.
- Notes use BlockNote (`@blocknote/mantine` UI, loaded with `React.lazy` on the first page open so start-up does not load it). A page item shows its editable title (Enter or blur saves through `PUT /api/notes/{id}`, Escape restores) and the editor. Content is read with `GET /api/notes/{id}/content` and saved with `PUT /api/notes/{id}/content` (`{ blocks }`, stored as they are, 5 MB request limit; sets the node's `updatedAt`; folders have no content). Saves go through `createAutosave` (`modules/notes/autosave.ts`): debounced by 1 second, one at a time, always the latest document; a failed save stays pending until the next change or flush. The status line shows "Kaydediliyor…", "Kaydedildi." or "Kaydedilemedi…".
- A pending save is flushed when the page component unmounts (another page or module) and before the window closes: main holds the first `close` (`electron/closeGuard.ts`), sends `devpath:before-close`, and closes when the preload has run every `onBeforeClose` callback and answered `devpath:close-ready`, or after 3 seconds.
- The editor UI is Turkish where it matters: BlockNote 0.56.0 has no Turkish dictionary, so `editorDictionary.ts` takes the English one and translates the placeholders and the offered slash menu items (headings 1–3, toggle headings, paragraph, lists, check and toggle lists, quote, code block, divider; media and tables are not offered). Code blocks use `@blocknote/code-block`'s Shiki highlighter (JavaScript engine, grammars loaded on demand) with C#, TypeScript, JavaScript, JSON, SQL, Bash, HTML, CSS, Markdown and plain text; the default is C#. The editor's colours are the app's tokens (a BlockNote theme object of `var(--color-*)` values), so it matches the page in light and dark mode; BlockNote takes the light/dark scheme of its menus from the OS.
- The Notlar page (`/notes`, the open item at `/notes/:id`) shows the tree from `GET /api/notes` (every node, sorted by parent and `order`). Changes: `POST /api/notes` (`{ parentId, kind, title }`, appended as the last child; a page also gets an empty `notes/pages/<id>.json`), `PUT /api/notes/{id}` (`{ title }`, 1–200 characters, sets `updatedAt`), `POST /api/notes/{id}/move` (`{ parentId }`, last child of the new parent; never into itself or a descendant), `POST /api/notes/{id}/shift` (`{ offset: -1 | 1 }`, swap with a sibling, then siblings renumbered `0..n-1`) and `DELETE /api/notes/{id}` (the node, its descendants and their page files, deepest first). Moving and reordering never change `updatedAt`. Any node can hold folders and pages; only pages have content. Items move with "Taşı…" or native drag and drop (onto an item = inside it, onto "En üste" = top level).
- Notes search: the box above the tree ("Notlarda ara", Enter searches, at least 2 characters) calls `GET /api/notes/search?q=` (2–200 characters). The API turns each page's blocks into plain text (`NoteText`: one line per block, depth first; text, link and table cell text, code as is) and folds title, text and query the same way (`SearchText.Fold`: invariant lower case, `ı/I/İ` → `i`, `ş` → `s`, `ç` → `c`, `ğ` → `g`, `ö` → `o`, `ü` → `u`, one character in, one out). A page matches when every query word occurs in its title or text. Pages whose title holds every word come first, then newest edit first; at most 50. Each result has `path` (ancestor titles), a ~120-character `snippet` around the first match and `highlights` (`{ start, length }` in the snippet), shown with `<mark>`. Results replace the tree until the box is cleared; there is no index (every page file is read per search).
- The day page also lists `notes` from `GET /api/days/{date}`: pages whose local `createdAt` or `updatedAt` date is that day (`created: true` when created that day), oldest edit first, each linking to `/notes/<id>`.
- The pomodoro timer is a small state machine (`idle` → `running` ⇄ `paused` → `finished`, `src/modules/pomodoro/timer.ts`) that stores times (`startedAt`, `endsAt` or `remainingMs`) and derives the remaining time from `Date.now()`, so throttled or minimized windows stay accurate. `PomodoroProvider` owns it for the whole app, ticks every 250 ms while running and keeps it in `localStorage` (`devpath.pomodoro`), so it survives reloads and restarts; invalid stored data loads as idle. The goal and project are locked while a session exists.
- Sessions are logged from the Pomodoro page with `POST /api/sessions` (goal must exist, archived allowed; project must belong to the goal; end not in the future; 1–600 minutes and no more than the start–end span; note at most 500 characters). A finished session is saved with "Kaydet" and an optional note (`completed: true`); "Durdur" saves the focused minutes (pauses excluded, rounded down) with `completed: false`, and nothing under 1 minute. A failed save keeps the timer so the user can retry; after a save the page shows the goal's new progress.
- Session tags are normalized the same way in the API (`Tags.cs`) and the renderer (`tags.ts`): trim, drop leading `#`, `İ` → `i`, invariant lower case, drop U+0307, whitespace → `-`; 1–30 letters, digits, `-`, `_`; at most 10 per session. They are chosen before starting (editable in the save form); `GET /api/sessions/tags` (most used first) feeds the suggestions.
- Timer lengths come from `settings.json` (`{ schemaVersion, pomodoro: { focusMinutes, shortBreakMinutes, longBreakMinutes, longBreakInterval } }`, defaults 25 / 5 / 15 / 4), read with `GET /api/settings` and saved with `PUT /api/settings/pomodoro` from the Ayarlar page; a change applies to the next timer. `settings.json` is one document with a section per area, written through `JsonFileStore`.
- Daily reminders: `settings.json` → `reminders: { english: { time, enabled }, tech: { time, enabled } }` (`HH:MM`, 24-hour; defaults 09:00 / 20:00, both on; a missing or broken reminder reads as its default), in `GET /api/settings` and saved with `PUT /api/settings/reminders` (both reminders and fields required; `english` / `tech` errors) from Ayarlar → "Hatırlatmalar". Main schedules them (`electron/reminders.ts`): it reads `GET /api/settings` itself (own base URL and token) at start, after a data folder change and on `reminders.refresh()` (called after a save), checks the shape with `parseReminders`, and sets one timer per enabled reminder at `nextTrigger(time, now)` (today if still ahead, otherwise tomorrow; local wall-clock time). A fired reminder notifies (silent; "İngilizce zamanı" → `/english`, "Teknik çalışma zamanı" → `/learning` on click) and schedules the next day; a timer more than 5 minutes late (the PC slept) skips the notification. Times that passed while the app was closed are never caught up. The Ana Sayfa "Hatırlatmalar" card lists the enabled ones from the settings (defaults when they cannot be read, "Hatırlatmalar kapalı." when both are off).
- The Takvim page reads `GET /api/calendar?month=YYYY-MM&timeZone=<IANA>`: one entry per day of the month's visible grid (Monday on or before the 1st to Sunday on or after the last day, 28–42 days), each with the completed sessions (stopped-early never count) whose `startedAt` falls on that local date and their total minutes. The page sends its own time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), so grouping is right even when the API runs in UTC (Docker). The grid rule lives in `CalendarGrid.cs` and `monthGrid.ts`, with the same tests.
- Each day of the month grid links to the day page `/calendar/YYYY-MM-DD` (the month is kept in `/calendar?month=YYYY-MM`). The day page reads `GET /api/days/{date}?timeZone=<IANA>`: every session of that local day (stopped-early included, oldest first, with goal and project titles), the goals worked on (completed sessions and minutes), the day's totals and the daily log text. The log is saved with "Kaydet" through `PUT /api/days/{date}/log` (`{ text }`).
- After a saved, completed focus session the page offers a break (short, or long every `longBreakInterval`-th completed session; the count is in `localStorage` `devpath.pomodoro.cycle`, stopped sessions do not count, a long break taken or skipped resets it). Breaks are timers of kind `shortBreak`/`longBreak`: they pause, show in the sidebar, survive reloads and notify ("Mola bitti"), but are never saved.
- The end-of-session notification is scheduled in the main process (`pomodoro.scheduleEnd(endsAt, title, body)` / `cancelEnd()`, at most one pending, end time at most 24 h ahead): silent, title "Odak süresi bitti" or "Mola bitti"; clicking it focuses the window and main sends `devpath:open-page` (`onOpenPage` in the preload). The installed app uses the AppUserModelID `com.devpath.workspace` (its Start menu shortcut has it); unpackaged runs keep Electron's default id.
- Keyboard shortcuts (`src/app/shortcuts.ts`): `Ctrl+N` new page, `Ctrl+Shift+P` start/stop pomodoro, `Ctrl+K` notes search, `?` help. `AppLayout` listens on `window` in the capture phase and `preventDefault`s a match, so the editor never sees it; keys without a modifier (`?`) never fire in `input`, `textarea`, `select` or `[contenteditable]`, and auto-repeat never fires. The help is a native `<dialog>` (`ShortcutsHelp`, also opened by "Kısayollar" in the sidebar footer). The layout only navigates with `state: { shortcut }`; the page carries it out once per location with `useShortcutRequest(id, ready, run)`, which then drops the state. `Ctrl+N` creates "Adsız sayfa" inside the open `/notes/:id` item (top level elsewhere), opens it and renames it; `Ctrl+K` focuses "Notlarda ara"; `Ctrl+Shift+P` stops a running or paused timer like "Durdur", or, when idle, starts with the last started goal, project and tags (`localStorage` `devpath.pomodoro.last`) if that goal is still active, otherwise focuses the goal picker.
- Developer panel (`/dev`, `modules/devpanel/`, not in the sidebar or the help): `Ctrl+Shift+D` opens it and, on the panel, goes back (Ana Sayfa when it was the first page). It shows API health (`GET /api/health`: status, version, response time), the last errors and the data file sizes from `GET /api/dev` (`{ errors, files, totalBytes }`), with "Yenile". API errors: `ErrorBufferLoggerProvider` copies every `Error`/`Critical` log entry into `ErrorBuffer` (in memory, last 50, newest first) as `{ at, source, kind, path }` — source is the first `DevPath` type on the exception's stack (or the log category's last part), kind the exception type (or `Log`), path `METHOD route-template` of the matched endpoint. Renderer errors: `shared/errors/errorLog.ts` (in memory, last 50) records `window` `error` / `unhandledrejection` (`errorListeners.ts`, installed in `main.tsx`) and failed API requests in `createApiClient` (`HTTP <status>` except `400`, `NetworkError` when `fetch` rejects); paths drop the query and mask every segment that is not plain `a–z` as `{…}`. Neither buffer keeps a message or stack, so no note text or token reaches the panel. File sizes (`DataFileSizes`): top-level files by name, top-level folders only as file count and total size.
- İngilizce (`/english`, `modules/english/`): the topic list from `GET /api/content/vocab` (topic link, level, `#tags`, "12 kart · 5 biliyorum · 2 tekrar"); "İçerik ekle" (`aria-expanded`) shows "Promptu kopyala" and the import panel, which is always shown while there are no topics (with the empty state) and reloads the list after an import. `/english/:slug` shows the cards (term, meaning, definition, example, mark) and "Çalış": practice takes the "Tekrar et" cards, then the unmarked ones (`practiceQueue`), fixed when practice starts; each card shows the term, "Çevir" shows the back, "Biliyorum" / "Tekrar et" saves the mark and moves on (a failed save keeps the card); focus moves to the next button. With every card known, "Hepsini çalış" practises all of them.
- Content topic lists (İngilizce, Mülakat, Öğrenme) share `TopicListPage` (`modules/content/`): props `type`, `basePath`, `icon`, `title`, `description`, `counts(summary)` and `levelLabel` (`beginner` / `intermediate` / `advanced` → "Başlangıç" / "Orta" / "İleri"; CEFR levels as they are).
- Mülakat (`/interview`, `modules/interview/`): topic rows count "10 soru · 4 çalışıldı". `/interview/:slug` filters questions on the page with three `<select>`s (Zorluk; Etiket with the questions' own tags, hidden when there are none; Durum çalışıldı / çalışılmadı) through `filterQuestions` and shows "n / N soru". Each `QuestionCard` shows the question, difficulty (Kolay / Orta / Zor) and tags; "Cevabı göster" (`aria-expanded`) opens the answer (line breaks kept) and the code; "Çalıştım" (`aria-pressed`) saves or removes the `practised` mark and the topic reloads with the filters kept. `CodeSample` (`modules/content/`, shared with Öğrenme) shows the code as plain text, then as C# tokens from `highlightCSharp` (`highlight.ts`: one Shiki core highlighter, created on first use with only the precompiled C# grammar, the JavaScript raw regex engine and the `github-light` / `github-dark` themes). Tokens are React spans with `--shiki-light` / `--shiki-dark` variables, and CSS picks one with `prefers-color-scheme`; no HTML string is injected.
- Öğrenme (`/learning`, `modules/learning/`): lesson rows count "8 parça · 3 tamamlandı". `/learning/:slug` (`LessonTopicPage`) shows "3 / 8 parça" with a `<progress>` ("İlerleme") and the parts in order (title link, summary, "✓ Tamamlandı"). `/learning/:slug/:partId` (`LessonPartPage`) shows "Parça 2 / 8", title, summary, the body, "Alıştırmalar", a "Tamamlandı" toggle (`aria-pressed`, saves or removes `done`) and "← Önceki" / "Sonraki →"; a new part starts at the top. Bodies go through `parseLessonBody`: blank lines separate paragraphs (line breaks kept, `pre-wrap`), lines between ```` ``` ```` fences are a code block shown with `CodeSample` (the fence's language is ignored; an unclosed fence makes the rest code); nothing else is interpreted. Both pages load the lesson with `useLesson(slug)`.
- Mark toggles ("Çalıştım", "Tamamlandı") use `aria-disabled` while saving, not `disabled`, so keyboard focus stays on them; a second press while saving is ignored.
- Ana Sayfa (`/`, `modules/home/`) is a grid of independent cards (`repeat(auto-fill, minmax(20rem, 1fr))`, one column below 900 px); each card loads its own data, so one failing never hides another, and an error is shown inside that card (`HomeCard` with a danger border). **Bugün**: today's completed pomodoros from `GET /api/days/{today}`, the active goals with their progress text, and a goal select + "Başlat" that starts a focus timer for that goal (no project or tags, focus length from settings) without leaving the page; while a timer exists it links to Pomodoro instead. **Hatırlatmalar**: İngilizce 09:00 and Teknik 20:00 (`DEFAULT_REMINDERS` in `reminders.ts` until phase 7.2), each `geçti`, `sıradaki` or `sırada`, recomputed every minute. **Akış**: `GET /api/home/feed` (see Agent files), the items as text with "Aç" (`openExternal`) for an item's link.
- YouTube (`Modules/Home/YouTube*.cs`, `AddYouTube()`): the followed channels live in `settings.json` under `youtube.channels` (`[{ id, title }]`, at most 50), managed from Ayarlar → "YouTube kanalları" with `GET`/`POST`/`DELETE /api/youtube/channels` (`POST { input }`: a `UC…` id or a `youtube.com/channel/` URL; `@handle` URLs are refused). Adding fetches the channel's RSS once: `404` → "Kanal bulunamadı.", any other failure → "Kanal kontrol edilemedi…"; the feed title becomes the channel name and its videos go into the cache. `YouTubeFeedClient` uses the named `HttpClient` `youtube` (10 s timeout, responses up to 2 MB); `YouTubeRss` parses the Atom feed with DTDs prohibited and skips broken entries; thumbnail (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`) and link (`https://www.youtube.com/watch?v=<id>`) are built from the video id. `cache/youtube.json` holds `{ channels: [{ channelId, fetchedAt, videos }], lastRefreshAt, error }`; a refresh (one at a time) replaces each channel that answered and keeps the old videos of one that failed, with `error` "Güncellenemeyen kanallar: A, B.". `YouTubeRefresher` (a `BackgroundService`) refreshes right after start and every 6 hours. `GET /api/youtube/videos` reads only the cache (the 10 newest videos of the followed channels); `POST /api/youtube/refresh` refreshes first. The Ana Sayfa card "Yeni videolar" shows them with "Yenile", the error inside the card above the cached list, "Henüz kanal yok." with a link to Ayarlar, and opens a video with `openExternal`.
- API tests never reach the network: `ApiFactory` sets `NoNetworkHandler` as the primary handler of every named client (`ConfigureAll<HttpClientFactoryOptions>`); a test installs a `StubHttpHandler` with `ConfigureTestServices`. Service tests use `StubHttpClientFactory`.
- GitHub (`Modules/Home/GitHub*.cs`, `AddGitHub()`): the username lives in `settings.json` under `github.username` (`GET`/`PUT /api/github/settings`; 1–39 letters, digits or single hyphens; empty clears it; saving a name refreshes at once). `GitHubClient` uses the named client `github` (10 s timeout, every header value redacted in its logs) with `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: DevPath` and, when `DEVPATH_GITHUB_TOKEN` is set, `Authorization: Bearer`. It reads `users/{user}` (followers, public repos), up to 5 pages of `users/{user}/repos?type=owner` (summed stars) and `search/commits` for `author:{user} author-date:{today−30}..{tomorrow}` (closed range, so forged future-dated commits are left out) newest first: the count and the 5 latest commits (first message line, a `https://github.com/` link or null). Failures become Turkish errors (unknown user, invalid token, rate limit with the local reset time, other status, unreachable, unreadable). `cache/github.json` holds `{ username, stats, fetchedAt, lastRefreshAt, error }`; a failed refresh keeps the numbers, a cache of another username counts as empty. `GET /api/github/stats` reads only the cache; `POST /api/github/refresh` fetches. `HomeRefresher` (a `BackgroundService`) refreshes YouTube, then GitHub, right after start and every 6 hours. No log line, response or data file contains the token (tested).
- "Son ziyaretinden beri": Ana Sayfa calls `POST /api/home/visit?timeZone=` each time it opens. `visit.json` holds `{ launchId, baseline, latest }` (snapshots `{ at, stars, followers }`). When the stored `launchId` differs from `DEVPATH_LAUNCH_ID` (one random id per app launch from Electron main, the same for every API it starts), `latest` becomes `baseline`; then `latest` is set to now and the cached GitHub numbers. The answer is `{ since, newStars, newFollowers, newVideos, streakDays }`: differences from the baseline (null without numbers, may be negative), cached videos of followed channels published after `baseline.at`, and `Streak.Count` (consecutive local days with a completed session, counted back from today, or from yesterday while today has none). Ayarlar → GitHub has the username and the token field (`secrets.set`); once saved it shows only "Token kayıtlı." and "Tokeni sil". The GitHub card shows stars, followers, public repos, the 30-day commit count and the latest commits (opened with `openExternal`), with "Yenile" and errors inside the card.
- AI modes (`modules/ai/`): `settings.json` → `aiModes: { english, learning, interview }`, each `copyPaste` | `file` | `api` (keys are module names, not content types; anything missing, unknown or not available reads as `copyPaste`), in `GET /api/settings` and saved with `PUT /api/settings/ai-modes/{module}` (`{ mode }`; `400` on `module` or `mode`; `AiModes.Available` in `AiModes.cs` lists the modes that work). `AiContentPanel` (props `module`, `type`, optional `prompt` and `onImported`) is the one way a module gets AI content: it shows the module's `AiModeSelect` and runs the prompt (the type's template by default) through that mode; the answer always goes through the import validator and merge. Copy-paste is `CopyPromptButton` + `ImportPanel`. `TopicListPage` uses the panel through `AI_MODULE_OF_TYPE`. Ayarlar → "Yapay zekâ modları" (`AiModesSection`) shows the same setting per module; a change saves at once and goes back when the save fails. A new module adds its name to `AiModes.Modules`, the `AiModule` type and `AI_MODULES`.
- File import mode (`Modules/Content/Inbox*.cs`, `modules/ai/FileImportBody.tsx`, `InboxFolderField.tsx`): `settings.json` → `aiInbox: { <module>: "<absolute path>" }`, in `GET /api/settings` (`null` when none) and saved with `PUT /api/settings/ai-inbox/{module}` (`{ folder }`, must exist; null or empty clears). The folder comes from main's dialog (`settings.pickFolder(title)`, which changes nothing itself). `POST /api/inbox/{module}/scan` (`{ type }`) answers `{ folder, error, files: [{ name, errors }], otherTypeCount }`: only `*.json` directly in the folder; a file of another known `type` is only counted, so modules may share a folder; anything else is validated against the module's type (over 2 MB is an error without reading; strict UTF-8, BOM allowed). An invalid file gets `<name>.json.errors.txt` next to it; a scan removes the report of a valid file and any report whose `.json` is gone. It is a POST because of those writes. `POST /api/inbox/{module}/import` (`{ type, names }`) only takes names found in the folder listing, so nothing outside it can be reached, and runs each through `ImportService`; the file then moves to `done/` (never over an existing file: a clash gets `-yyyyMMdd-HHmmss` in local time, then `-2`, `-3`…). The merge comes first, so a failed move ("Dosya taşınamadı.") is safe to retry. Nothing watches the folder.
- Dates are shown with `Intl` in `tr-TR`; stored as ISO 8601 (UTC timestamps, `YYYY-MM-DD` local dates for days).

## Storage design

### Data folder

- Path is configurable in settings (`dataDir` in `app-config.json`). Default: `%APPDATA%\DevPath\data` for the installed app, `%APPDATA%\DevPath\dev-data` for unpackaged Electron and for the API run on its own in Development, so development never touches real data.
- The API takes the path from `DEVPATH_DATA_DIR` (absolute only); outside Development it refuses to start without it. Electron main creates the folder before starting the API (so its error window can name the folder) and the API creates it again at startup (so `dotnet run` and Docker work alone). An invalid `app-config.json` or an uncreatable folder is an error window, never a silent fallback to another folder.
- The repo also gitignores `data/` in case it is pointed there, but the default avoids the OneDrive-synced repo, where sync can lock files during writes.
- Backups live **inside** the data folder, `<dataDir>\backups\`, so each data folder has its own and development never mixes with the installed app. On the first start of each local day main copies the data folder (without `backups\` and `*.tmp` files) to `backups\YYYY-MM-DD\` through a `.partial` folder that is renamed when complete; an empty data folder is not backed up. A restore first copies the current data to `backups\YYYY-MM-DD-HHmmss\` (local time, listed as "Geri yükleme öncesi"). Retention keeps every backup of the 14 newest dates that have one and deletes older ones; only folders named `YYYY-MM-DD` or `YYYY-MM-DD-HHmmss` count, anything else in `backups\` is left alone. The API never reads or writes `backups\`.

### Layout

```
data/
├── goals.json              # goals with optional pomodoro target
├── projects.json           # projects, each linked to one goal
├── sessions.json           # completed pomodoro sessions
├── settings.json           # timer durations, reminder times, YouTube channels, AI modes, inbox folders
├── daily/
│   └── 2026-11-05.json     # free-text daily log for that day
├── notes/
│   ├── index.json          # folder/page tree (id, parentId, title, kind, order)
│   └── pages/<id>.json     # BlockNote document for one page ({ schemaVersion, blocks })
├── content/
│   ├── english/<topic-slug>.json   # { schemaVersion, type, topic, slug, level, tags, createdAt, updatedAt, items }
│   ├── learning/<topic-slug>.json
│   └── interview/<topic-slug>.json
├── cache/
│   ├── github.json         # last GitHub stats + fetchedAt
│   └── youtube.json        # last videos per channel + fetchedAt
├── visit.json              # what the previous app session last showed ("since your last visit")
├── feed.json               # written by the agent, read-only for the app
├── stats.json              # written by the agent, read-only for the app
├── posts.json              # post drafts (post-MVP)
├── style.json              # style prompt (post-MVP)
└── backups/                # written by Electron main only
    ├── 2026-11-06/         # daily copy of everything above
    └── 2026-11-06-140509/  # copy made before a restore
```

Pomodoros for a day are read from `sessions.json` by the local date of `startedAt` (in the time zone the page sends); notes for a day are read from `notes/index.json` by `createdAt`/`updatedAt` in the same time zone (pages only). The daily file only holds what is not stored elsewhere: `{ "schemaVersion": 1, "date": "YYYY-MM-DD", "text": "…" }`, plain text up to 10,000 characters, trailing whitespace trimmed, written atomically through `JsonFileStore`; a day without a file has an empty log.

### File rules

- Every file is an object with `schemaVersion` at the top level:

  ```json
  { "schemaVersion": 1, "items": [ ... ] }
  ```

- **Atomic writes:** serialize to `<file>.tmp` in the same folder, flush to disk, then `File.Move(tmp, file, overwrite: true)`. A crash leaves either the old or the new file, never a half-written one. If a write fails before the move, the `.tmp` is deleted; a stale `.tmp` from a crash is ignored and replaced by the next write.
- **One lock per file:** a `SemaphoreSlim` per full path serializes reads, writes and read-modify-write updates inside the process. Reads take it too, because on Windows an open reader makes `File.Move(..., overwrite: true)` fail. The single-instance lock means one API per data folder, so there is no cross-process lock.
- **Paths:** `JsonFileStore` takes paths relative to the data folder and rejects anything that resolves outside it (`..`, absolute paths).
- **Migrations:** each file type has a `DocumentSchema(CurrentVersion, Migrations)`; a step is a `Migration(FromVersion, Func<JsonObject, JsonObject>)` record, so it works on raw JSON and old C# types never need to be kept. A missing `schemaVersion` counts as `0`. On read, if `schemaVersion` is lower than current, the steps run in order and the file is saved back (no copy of the old file is kept). A higher version than the app knows raises `UnsupportedSchemaVersionException` and the file is left untouched, also on write (no silent data loss).
- IDs are GUIDs (`Guid.NewGuid()`, string form). Timestamps are ISO 8601 UTC.
- `IRepository<T>` exposes `GetAllAsync`, `GetAsync(id)`, `UpsertAsync`, `DeleteAsync`. The JSON implementation (`JsonRepository<T>`, one `{ schemaVersion, items }` file per repository) is the only one; the interface exists because the README names SQLite as the likely next store.

### Core entities (MVP)

| Entity | Key fields |
|---|---|
| Goal | `id`, `title`, `description?`, `targetPomodoros?`, `archived`, `createdAt` |
| Project | `id`, `goalId`, `title`, `url?`, `archived`, `createdAt` |
| Session | `id`, `goalId`, `projectId?`, `tags[]`, `startedAt`, `endedAt`, `durationMinutes`, `completed`, `note?` |
| DailyLog | `date`, `text` |
| NoteNode | `id`, `parentId?`, `kind` (`folder` \| `page`), `title`, `order`, `createdAt`, `updatedAt` |

Goal progress = completed sessions for the goal ÷ `targetPomodoros`, rounded down and capped at 100% (stopped-early sessions never count). Without a target, the UI shows the completed session count and their total time instead of a percentage. `GET /api/goals/progress` returns it for every goal in one call. A project's `goalId` is set on create and never changes; projects can only be created under an existing, active goal.

### Shared import format

All content modules use one envelope; `type` selects the schema for `items`:

```json
{
  "schemaVersion": 1,
  "type": "vocab",
  "topic": "Phrasal verbs for meetings",
  "level": "B2",
  "tags": ["english", "work"],
  "items": [
    { "term": "follow up on", "meaning": "...", "example": "..." }
  ]
}
```

| `type` | Module | Schema file | Merge key for items |
|---|---|---|---|
| `vocab` | English | `schemas/vocab.schema.json` | normalized `term` |
| `lesson` | Learning | `schemas/lesson.schema.json` | normalized part `title` |
| `interview` | Interview | `schemas/interview.schema.json` | normalized `question` |
| `link-analysis` | Post assistant (post-MVP) | `schemas/link-analysis.schema.json` | `url` |

- **Envelope:** `schemaVersion` (`1`), `type`, `topic` (1–120 characters, not only spaces), `level` (vocab `A1`–`C2`; lesson and interview `beginner` / `intermediate` / `advanced`), optional `tags` (at most 10, normalized like session tags), `items` (1–500). Items: vocab `term`, `meaning` (Turkish), `example`, `definition?` (English); lesson `title`, `summary`, `body`, `exercises?`; interview `question`, `answer`, `difficulty` (`easy` \| `medium` \| `hard`), `code?`, `tags?`. Each schema is the whole envelope with its item shape; every object has `additionalProperties: false` and every string a max length.
- **Validation** (`ImportValidator`, steps stop at the first failure): empty text; over 2 MB (UTF-8); one surrounding Markdown code fence (```` ```json ```` … ```` ``` ````) is blanked out, keeping line numbers; parse (no comments, no trailing commas, no duplicate properties; root must be an object); the type's schema; then tag validity and a non-empty topic slug. Errors are `{ path, line, message }`: `path` is the JSON pointer of the value, `line` the 1-based line where it starts (`JsonLines` maps pointers to lines with `Utf8JsonReader.TokenStartIndex`), `message` Turkish. JsonSchema.Net's messages are replaced per keyword (`Eksik alan: meaning`, `Bilinmeyen alan: q`, `En fazla 100 karakter olabilir.`, `Şunlardan biri olmalı: …`, …), with limits read from the schema rule of the value's instance path; `properties`/`items` summaries are dropped. Errors are sorted by line. Invalid content is never saved.
- **Rejecting executable content:** JSON only, max 2 MB, schemas use `additionalProperties: false`, strings have max lengths, and nothing is ever rendered as HTML.
- **Merge** (`ImportService`): the topic file is `content/<module folder>/<slug>.json` (`english`, `learning`, `interview`), shaped `{ schemaVersion, type, topic, slug, level, tags, createdAt, updatedAt, items: [{ id, addedAt, …imported fields }] }` and updated under one `JsonFileStore.UpdateAsync`. The slug (`ContentKey.Slug`): accents removed, `SearchText.Fold`, runs of anything but `a–z0–9` → `-`, at most 80 characters; a topic without letters or digits is an error. Merge keys (`ContentKey.Key`): trimmed, whitespace runs → one space, `SearchText.Fold`. New items are appended with a new `id` and `addedAt`; items whose key exists (also earlier in the same file) are skipped and reported. An existing topic keeps its name and `level` (the report says `levelKept`), tags are unioned (no cap), existing items and their progress fields are never touched, and nothing is written when nothing is new.
- **Endpoints:** `POST /api/import/validate` and `POST /api/import` take `{ type, text }` (8 MB request limit). Validate answers `{ errors }`; import answers `{ errors, report }` with `report` `{ type, topic, slug, created, added, skipped, levelKept }` only when saved. Import problems are a normal `200` answer; an unknown `type` is a `400` validation problem.
- **Renderer** (`modules/content/`): `ImportPanel` (paste box, file input for `.json` up to 2 MB, "Kontrol et" and "İçe aktar", errors as "Satır 14 · items[2].meaning: …", the saved summary) and `CopyPromptButton` (the template, bundled with Vite `?raw`, to `navigator.clipboard`). Until a module has its own page, `ContentEmptyPage` shows the empty state with both.
- **Topics and marks** (`ContentService`, `/api/content/{type}`): `GET` lists the type's topic files as `{ slug, topic, level, tags, itemCount, marks: { <mark>: count }, updatedAt }`, alphabetical (`tr-TR`); a file that cannot be read is logged and left out. `GET /{slug}` returns the stored topic without `schemaVersion`. `PUT /{slug}/items/{id}/mark` with `{ mark }` sets `mark` and `markedAt` on the item (`null` removes both) and never changes the topic's `updatedAt`. Each type lists its allowed marks (`ContentType.Marks`; vocab `known`, `repeat`; interview `practised`; lesson `done`); any other is a `400` on `mark`. Slugs outside `[a-z0-9-]{1,80}` are `404` and never reach the file system.
- **New content type:** add a schema file, a `type` value, a merge key and a prompt template in `prompts/`. No other layer changes.
- **Prompt library:** `prompts/<type>.md` holds the template with format instructions. "Copy prompt" in each module copies it to the clipboard.

### Agent files

`feed.json` (X List summaries) and `stats.json` (weekly stats) are written by Claude's morning task into the data folder. The app only reads them, validates them against `schemas/feed.schema.json` / `schemas/stats.schema.json`, and shows an error card if they are missing or invalid.

- `feed.json` is `{ "schemaVersion": 1, "generatedAt", "items": [{ "title", "summary", "url"?, "source"?, "publishedAt"? }] }` (`schemas/feed.schema.json`: no other properties, at most 200 items, title 1–200 and summary 1–2,000 characters with a non-space, `url` `https://` up to 2,000, `source` 1–100, RFC 3339 date-times with an offset, file at most 2 MB). The API reads it directly (never through `JsonFileStore`, so it is never written back) on every `GET /api/home/feed` and checks it with `FeedValidator`, the schema's rules in C# (no schema package; `FeedSchemaFileTests` keeps the required fields in step). The answer is always `200`: `{ status: "ok" | "missing" | "invalid", generatedAt, items, errors }`; `ok` gives the 10 newest items (`publishedAt` descending, undated ones after in file order, strings trimmed); `invalid` gives no items and at most 20 Turkish error lines with their JSON path (`items[2].title: Başlık gerekli.`).

## Security rules

- API on `127.0.0.1` only, per-launch token header, `Host` header check (see API rules).
- Secrets (GitHub token; AI API keys post-MVP) are encrypted with Electron `safeStorage` and stored in `userData/secrets.bin` (`{ schemaVersion: 1, secrets: { <name>: <base64 of the encrypted value> } }`, written atomically, `electron/secrets.ts`). They are never written to the repo, to JSON data files, to logs or to the renderer. The renderer can only call `secrets.set(name, value)`, `secrets.has(name)` and `secrets.clear(name)`; names are an allow list (`githubToken`), values are 1–255 characters without whitespace, and saving fails with a Turkish message without OS encryption. `set` and `clear` restart the API with the new environment (same data folder) and reload the window. Main always passes `DEVPATH_GITHUB_TOKEN` (empty without a saved token, so a variable from the shell never reaches the API) and `DEVPATH_LAUNCH_ID`.
- Electron `BrowserWindow`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- The preload bridge exposes only the functions listed in the architecture diagram, each with typed, validated arguments.
- Navigation and `window.open` are blocked. `openExternal(url)` accepts `https:` URLs only and opens them in the default browser; main re-checks the URL (`isAllowedExternalUrl`) before calling `shell.openExternal`, and the API stores only https project links.
- Single instance: `app.requestSingleInstanceLock()`; a second launch focuses the existing window and quits.
- CSP (production), built by `buildCsp(mode)` in `electron/csp.ts` and injected as a `<meta>` tag at build time:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com https://avatars.githubusercontent.com; connect-src http://127.0.0.1:*; object-src 'none'; base-uri 'none'`
  (`'unsafe-inline'` for styles is needed by BlockNote. `frame-ancestors` is left out because browsers ignore it in a `<meta>` tag, and nothing can frame the app's top-level window.) In development, `buildCsp` adds only what Vite hot reload needs: `'unsafe-inline'` in `script-src` and `ws://localhost:*` / `http://localhost:*` in `connect-src`.
- Imports are validated before saving (see Shared import format).
- `.gitignore` covers `data/`, `backups/`, `.env*`, `secrets.bin`, build output.
- The app only reads from external platforms. There is no code path that posts, likes, comments or follows.

## Testing approach

| What | How | Where |
|---|---|---|
| Services, validators, merge logic, migrations | xUnit unit tests | `apps/api/DevPath.Api.Tests/` |
| JSON store (atomic write, interrupted write, concurrent writes) | xUnit against a temp folder | same |
| API endpoints, token check | xUnit + `WebApplicationFactory` | same |
| Hooks, API client, timer math | Vitest | next to the file, `*.test.ts` |
| Critical UI flows (start pomodoro with goal, import content, open a day) | Vitest + React Testing Library | next to the component, `*.test.tsx` |
| Packaged app | manual smoke checklist in the release phase | `roadmap.md` |

- External HTTP is faked with a stub `HttpMessageHandler`; tests never hit the network.
- Each phase is done only when `npm run check` passes. It runs: `dotnet build`, `dotnet test`, `tsc --noEmit`, `eslint`, `vitest run` and `vite build`.

## Coding standards

### General

- SOLID, small single-purpose classes and components. Prefer the standard library and platform features over new dependencies; each new dependency needs a reason in the PR/commit.
- No abstraction without a second use, with `IRepository<T>` as the documented exception.
- Validate at trust boundaries (imports, agent files, external APIs, preload arguments). Trust internal code.

### C#

- `<Nullable>enable</Nullable>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, file-scoped namespaces.
- Async all the way; no `.Result` or `.Wait()`.
- Services registered in DI by interface only when there is a test seam or a second implementation; otherwise by concrete class.
- `System.Text.Json` with camelCase, shared `JsonSerializerOptions`.
- Records for DTOs and entities.

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, no `any` (ESLint `@typescript-eslint/no-explicit-any: error`).
- Function components with hooks; one component per file; named exports.
- API types live in `shared/api/types.ts` and mirror the C# DTOs.
- Prettier for formatting, ESLint for rules.

### Git

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, with the module as scope: `feat(pomodoro): add goal and tag selection`.
- Small commits, one change each. One branch per roadmap phase (`feat/2.1-pomodoro-timer`), merged into `main` when the phase's acceptance criteria are met.
- No AI attribution in commits, PRs or docs.
- Never commit `data/`, backups, `.env` files or secrets.

## Folder structure

```
devpath-workspace/
├── apps/
│   ├── desktop/
│   │   ├── electron/
│   │   │   ├── main.ts            # window, API process, reminders, notifications
│   │   │   ├── preload.ts         # contextBridge API
│   │   │   ├── apiProcess.ts      # spawn/health-check/stop the API
│   │   │   ├── backups.ts         # daily backup, retention, restore
│   │   │   └── secrets.ts         # safeStorage wrapper
│   │   ├── src/
│   │   │   ├── app/               # router, layout (sidebar + content), providers
│   │   │   ├── modules/
│   │   │   │   ├── home/
│   │   │   │   ├── goals/
│   │   │   │   ├── pomodoro/
│   │   │   │   ├── calendar/
│   │   │   │   ├── notes/
│   │   │   │   ├── content/       # shared import UI + english/, learning/, interview/
│   │   │   │   ├── settings/
│   │   │   │   └── devpanel/
│   │   │   └── shared/
│   │   │       ├── api/           # typed client + types
│   │   │       └── ui/            # tokens.css, base components
│   │   ├── electron-builder.yml
│   │   └── package.json
│   └── api/
│       ├── DevPath.Api/
│       │   ├── Program.cs
│       │   ├── Modules/
│       │   │   ├── Goals/         # GoalsController, GoalService, Goal, Project
│       │   │   ├── Pomodoro/
│       │   │   ├── Calendar/
│       │   │   ├── Notes/
│       │   │   ├── Content/       # ImportService, MergeService, per-type rules
│       │   │   ├── Home/          # GitHub, YouTube, feed, stats readers
│       │   │   └── System/        # health, dev panel, settings
│       │   └── Infrastructure/
│       │       ├── Storage/       # IRepository<T>, JsonFileStore, migrations
│       │       ├── Validation/    # schema loading and validation
│       │       └── Security/      # token + host header middleware
│       ├── DevPath.Api.Tests/
│       └── DevPath.slnx
├── schemas/                       # *.schema.json
├── prompts/                       # prompt templates per content type
├── specs/                         # mission, tech stack, roadmap, feature specs
├── package.json                   # npm workspaces, `dev` and `check` scripts
├── prompts.md
├── CLAUDE.md
└── README.md
```

One API project with a folder per module, not one project per module. Split a module into its own project only if it grows past what a folder can hold.

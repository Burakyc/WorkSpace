# Roadmap

## How to use this roadmap

- Phases are sized for **1–2 hours of work per day**: each takes 1–3 days (about 2–6 hours) and ends with something usable.
- Work on one phase at a time, in order. Do not start the next phase unprompted.
- A phase is done when every acceptance criterion is checked **and** `npm run check` passes (build, tests, type check, lint). Tick the boxes here and set the status when that happens.
- A phase that needs more detail than its entry here gets a short feature spec in `specs/features/` before coding.
- Status: `todo` · `in progress` · `done`.

## MVP

### Milestone 0 — Skeleton

#### 0.1 API skeleton — `done`
ASP.NET Core Web API on .NET 10 that answers a health check.
- [x] `apps/api/DevPath.slnx` with `DevPath.Api` and `DevPath.Api.Tests`; nullable enabled, warnings as errors.
- [x] `GET /api/health` returns `{ status: "ok", version }`.
- [x] Kestrel binds to `127.0.0.1:<DEVPATH_PORT>` only.
- [x] An xUnit test with `WebApplicationFactory` covers the health endpoint.
- [x] `.gitignore` covers `data/`, `backups/`, `.env*`, `bin/`, `obj/`, `node_modules/`, `dist/`.

#### 0.2 Desktop skeleton — `done`
Electron + Vite + React + TypeScript window with the security baseline.
- [x] `apps/desktop` with Vite React TS, `strict` and `noUncheckedIndexedAccess` on, ESLint + Prettier.
- [x] `BrowserWindow` uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; navigation and `window.open` blocked; CSP set.
- [x] Root `package.json` with npm workspaces; `npm run dev` opens the window with hot reload.
- [x] One Vitest + React Testing Library test renders the app.
- [x] `npm run check` runs `dotnet build`, `dotnet test`, `tsc --noEmit`, `eslint`, `vitest run`, `vite build`.

#### 0.3 Electron starts the API — `done`
The app is one process from the user's point of view.
- [x] Electron main picks a free port, creates a per-launch token, spawns the API and waits for `/api/health` (10 s timeout, then an error window).
- [x] API rejects requests without the `X-DevPath-Token` header (401) or with a wrong `Host` header.
- [x] Preload exposes `getApiConfig()`; the renderer's typed API client calls `/api/health` and shows "API: bağlı".
- [x] Quitting the app stops the API process (no orphan `dotnet` / `DevPath.Api` process).
- [x] Tests: token middleware (xUnit), API client adds the header (Vitest).

#### 0.4 Storage foundation — `done`
Safe JSON storage every module builds on.
- [x] `JsonFileStore` with atomic writes (temp file + replace) and one lock per file.
- [x] `IRepository<T>` with a JSON implementation; every file has `schemaVersion`.
- [x] Migration runner: older files are upgraded on read and saved; newer-than-known files raise an error.
- [x] Data folder comes from `DEVPATH_DATA_DIR`; Electron main reads it from `app-config.json` in `userData`, default `%APPDATA%\DevPath\data`, created on first run.
- [x] Tests: round trip, interrupted write leaves the old file intact, concurrent writes, migration from v0 to v1, unknown future version.

#### 0.5 App shell and design tokens — `done`
Navigable, themed, empty app in Turkish.
- [x] `tokens.css` with colors, fonts and spacing as CSS variables; light and dark follow the OS.
- [x] Sidebar + content layout with routes for Ana Sayfa, Hedefler, Pomodoro, Takvim, Notlar, İngilizce, Öğrenme, Mülakat, Ayarlar.
- [x] Below 900 px the sidebar collapses to icons and content is one column.
- [x] Each page shows an empty state that says what to do next.
- [x] Settings page shows the data folder and lets the user change it (API restarts with the new path).
- [x] Sidebar is fully keyboard navigable with visible focus.

#### 0.6 Windows installer — `done`
Prove packaging early so every later phase can ship.
- [x] `dotnet publish` produces a self-contained single-file `DevPath.Api.exe` (win-x64).
- [x] electron-builder builds an NSIS installer that bundles the API under `resources/api/`.
- [x] Installed app starts in under 3 seconds on the dev machine, starts the API and shows the shell.
- [x] `npm run package` builds the installer in one command.
- [x] Uninstall leaves the data folder in place.

#### 0.7 Docker for the API — `done`
Optional dev container for the API only. The desktop app and `npm run check` never need Docker. Builds on 0.3 (token) and 0.4 (data folder).
- [x] Multi-stage `apps/api/Dockerfile`: .NET 10 SDK stage publishes, ASP.NET runtime stage runs the API as a non-root user.
- [x] Root `docker-compose.yml` runs only the API and publishes `127.0.0.1:<port>:<port>` (same port inside and out, so the `Host` check passes).
- [x] Kestrel binds `0.0.0.0` only when `DEVPATH_IN_CONTAINER=1`; otherwise it stays on `127.0.0.1`. `tech-stack.md` notes the exception.
- [x] `DEVPATH_TOKEN` comes from a gitignored `.env`; `.env.example` is committed. Compose stops with an error when the token is missing; requests without it get 401.
- [x] Repo `data/` (gitignored) is bind-mounted as `DEVPATH_DATA_DIR`; data survives `docker compose down`.
- [x] `npm run docker:api` builds and starts the container; README documents it.
- [x] Tests: binding picks `0.0.0.0` only with `DEVPATH_IN_CONTAINER=1` (xUnit).

### Milestone 1 — Goals and projects

#### 1.1 Goals — `done`
- [x] API: create, list, update, archive goals (`goals.json`); validation (title required, max length).
- [x] UI: goals list and a create/edit form; archived goals hidden by default.
- [x] Optional `targetPomodoros` per goal.
- [x] Tests: `GoalService` (xUnit), create-goal flow (RTL).

#### 1.2 Projects and progress — `done`
- [x] API: create, list, update, archive projects linked to a goal (`projects.json`); a project's goal must exist.
- [x] UI: projects shown under their goal; add a project from the goal in at most two clicks.
- [x] Goal card shows progress: completed sessions ÷ `targetPomodoros` (capped at 100%), or session count and total time when there is no target. Shows 0 until sessions exist.
- [x] Tests: progress calculation with and without a target.

### Milestone 2 — Pomodoro

#### 2.1 Timer with a goal — `done`
- [x] Pomodoro page: choose goal (required), project (optional, filtered by goal), then start. Start is disabled without a goal.
- [x] Start, pause, resume and stop; remaining time derived from `startedAt`, so it stays accurate while minimized.
- [x] Main process shows an OS notification when the session ends.
- [x] Tests: timer math (Vitest), start disabled without a goal (RTL).

#### 2.2 Session log — `todo`
- [ ] When a focus session ends, a short optional note field appears; saving writes the session to `sessions.json`.
- [ ] API rejects sessions without an existing `goalId`.
- [ ] Stopped-early sessions are saved with their real duration and marked `completed: false`; only completed ones count toward progress.
- [ ] Goal progress from 1.2 updates after a session.
- [ ] Tests: `SessionService` validation and progress update.

#### 2.3 Tags and timer settings — `todo`
- [ ] Optional tags on a session (e.g. `#di`), with autocomplete from previously used tags.
- [ ] Settings: focus, short break and long break durations (defaults 25 / 5 / 15) and long break interval (default 4), saved in `settings.json`.
- [ ] Break timers run after a focus session; breaks are not logged as sessions.
- [ ] Tests: tag normalization (trim, lower case, leading `#`), settings validation.

### Milestone 3 — Calendar and daily log

#### 3.1 Month view — `todo`
- [ ] Month calendar with the pomodoro count per day; today highlighted; previous/next month.
- [ ] API: `GET /api/calendar?month=YYYY-MM` returns per-day counts from `sessions.json`.
- [ ] Week starts on Monday; month and day names in Turkish.
- [ ] Tests: per-day grouping across month and timezone boundaries.

#### 3.2 Day detail and daily log — `todo`
- [ ] Clicking a day opens its detail: sessions (time, goal, project, tags, note), goals worked on, notes created or edited that day.
- [ ] Free-text daily log for the day saved to `daily/YYYY-MM-DD.json`.
- [ ] The "Looking back" scenario works: click last Tuesday → see count, goals and notes.
- [ ] Tests: day detail service; open-a-day flow (RTL).

### Milestone 4 — Notes

#### 4.1 Page tree — `todo`
- [ ] Folders and pages in a tree (`notes/index.json`); create, rename, move (drag or "move to"), delete with confirmation.
- [ ] Subpages: a page can have child pages.
- [ ] Empty pages stored as `notes/pages/<id>.json`.
- [ ] Tests: tree operations (move into own child is rejected, delete removes children).

#### 4.2 BlockNote editor — `todo`
- [ ] Opening a page shows BlockNote with `/` command menu, headings, lists, toggle lists, code blocks with syntax highlight.
- [ ] Autosave with a 1-second debounce in the background; no visible typing lag on a 2,000-word page.
- [ ] Pending save is flushed when switching page or closing the app.
- [ ] Tests: debounce and flush behavior (Vitest).

#### 4.3 Notes search — `todo`
- [ ] Search box over page titles and text content; results open the page.
- [ ] API extracts plain text from BlockNote JSON for search.
- [ ] Tests: text extraction and search ranking (title matches first).

### Milestone 5 — Content modules with import

#### 5.1 Import engine and validator — `todo`
- [ ] `schemas/vocab.schema.json`, `lesson.schema.json`, `interview.schema.json` with the shared envelope (`schemaVersion`, `type`, `topic`, `level`, `tags`, `items`).
- [ ] API: `POST /api/import/validate` returns `{ path, line, message }` errors; `POST /api/import` validates, then merges by topic slug and item merge key, and reports added/skipped counts.
- [ ] Rejects non-JSON, files over 2 MB and unknown properties.
- [ ] Shared import UI: paste box or file picker, line-by-line error list, success summary.
- [ ] Prompt templates in `prompts/` and a "Promptu kopyala" button.
- [ ] Tests: validation errors with line numbers, merge never overwrites, duplicates skipped.

#### 5.2 English module — `todo`
- [ ] Empty state: "Copy the prompt to add your first content" (in Turkish) with the copy button.
- [ ] Topic list with level and tags; topic page shows vocab cards (term, meaning, example).
- [ ] Simple practice: flip card, mark "biliyorum / tekrar et" (stored per item; spaced repetition comes later).
- [ ] Importing into an existing topic merges.
- [ ] Tests: import-then-show flow (RTL).

#### 5.3 Interview module — `todo`
- [ ] Topic list and question cards (question, answer, optional code sample, difficulty).
- [ ] "Adding content" scenario works end to end: copy prompt → paste AI JSON → cards appear.
- [ ] Mark a question as practised; filter by tag and difficulty.
- [ ] Tests: interview merge key, filter logic.

#### 5.4 Learning module — `todo`
- [ ] Topic list and lesson pages split into parts (title, summary, body, optional exercises).
- [ ] Mark a part as done; topic shows parts done / total.
- [ ] Tests: lesson merge by part title, progress count.

### Milestone 6 — Home dashboard

#### 6.1 Dashboard, reminders and feed — `todo`
- [ ] Home page grid: one column under 900 px, multi-column on large screens.
- [ ] Today card: pomodoros today, active goals, quick "start pomodoro" (two clicks).
- [ ] Feed card reads `feed.json` (agent-written X summaries); validated; error card if missing or invalid.
- [ ] Reminders card lists today's English and tech reminders (times from 7.2 settings, defaults until then).
- [ ] Home renders from cached data first; nothing on it blocks on the network.

#### 6.2 YouTube RSS — `todo`
- [ ] Settings: add/remove YouTube channels (channel ID or URL).
- [ ] API fetches channel RSS in the background on start and every 6 hours; caches to `cache/youtube.json`.
- [ ] "New videos" card with thumbnail, title, date; click opens in the default browser.
- [ ] Offline or failed fetch shows the cached list plus an error card.
- [ ] Tests: RSS parsing, failure falls back to cache (stub HTTP handler).

#### 6.3 GitHub stats and "what changed" — `todo`
- [ ] Settings: GitHub username; optional token saved with `safeStorage` (only `has`/`clear` visible after saving).
- [ ] API fetches public stars, followers and recent public commits; uses the token if present; caches to `cache/github.json`.
- [ ] "What changed since your last visit" card: new stars, new followers, pomodoro streak, new videos since the last app open.
- [ ] Offline or rate-limited fetch shows cached numbers plus an error card.
- [ ] Tests: diff since last visit, token never appears in logs or responses.

### Milestone 7 — MVP polish and release

#### 7.1 Keyboard shortcuts — `todo`
- [ ] `Ctrl+N` new note, `Ctrl+Shift+P` start/stop pomodoro, `Ctrl+K` search; shown in a shortcuts help (`?`).
- [ ] Shortcuts do not fire while typing in the editor unless they use a modifier.
- [ ] Tests: shortcut handler (Vitest).

#### 7.2 Daily reminders — `todo`
- [ ] Settings: English reminder time and tech reminder time, each can be turned off.
- [ ] Main process shows one calm OS notification at each time while the app runs, including when minimized.
- [ ] Clicking the notification opens the related module.
- [ ] Tests: next-trigger calculation, including after the time has passed today.

#### 7.3 Developer panel — `todo`
- [ ] Hidden route (`Ctrl+Shift+D`) showing API health and version, last 50 errors from an in-memory log buffer, and data file sizes.
- [ ] No secrets or personal content shown.
- [ ] Tests: error buffer keeps only the last 50.

#### 7.4 MVP release — `todo`
- [ ] All four README scenarios work in the installed app except "Preparing a post" (post-MVP).
- [ ] Manual smoke checklist on a fresh install: first run creates the data folder, every module's empty state, offline start.
- [ ] Startup under 3 seconds; timer accurate after 25 minutes minimized.
- [ ] Contrast checked in light and dark themes; full keyboard navigation.
- [ ] Tag `v0.1.0`.

## Post-MVP

#### 8.1 Daily backups — `todo`
- [ ] On first start each day, copy the data folder to `backups/YYYY-MM-DD/`; keep the last 14 days.
- [ ] Settings: "Restore from backup" lists backups and restores one after confirmation (current data is backed up first).
- [ ] Tests: retention cleanup, restore.

### AI connection modes

#### 9.1 Mode setting and copy-paste mode — `todo`
- [ ] Per-module AI mode setting: copy-paste (default), file import, API.
- [ ] Copy-paste mode reuses the 5.1 flow everywhere AI content is used.

#### 9.2 File import mode — `todo`
- [ ] Choose an inbox folder; JSON files dropped there are validated and imported on demand ("İçe aktar" button lists new files).
- [ ] Imported files move to `inbox/done/`; invalid ones stay with an error report.

#### 9.3 API mode — `todo`
- [ ] AI API key stored with `safeStorage`; the API process calls the provider and feeds the output through the same validator and merge.
- [ ] A clear cost/usage note before each call; nothing is called automatically.
- [ ] Tests: provider client with stub HTTP; invalid AI output is not saved.

### AI teacher

#### 10.1 Lesson plan — `todo`
- [ ] Pick a topic; the teacher prompt splits it into pomodoro-sized parts (via any AI mode) and saves them as a Learning topic.

#### 10.2 Study with the teacher — `todo`
- [ ] Start a pomodoro from a lesson part (goal pre-selected); finishing the session can mark the part done.
- [ ] The part's content is shown next to the timer.

### Post assistant

#### 11.1 Style prompt — `todo`
- [ ] Editor for the user's style prompt (`style.json`) with an example and version history (last 10).

#### 11.2 Drafts from a project — `todo`
- [ ] Pick a project; the assistant builds a prompt from the project, its sessions and notes plus the style prompt.
- [ ] Draft fields: title, body, hashtags, source link, image suggestion; saved in `posts.json`.
- [ ] "Kopyala" copies the text. There is no post button and no LinkedIn API call.

#### 11.3 Drafts from a YouTube video or link — `todo`
- [ ] Paste a YouTube link or any URL; the app fills the link-analysis fields (`schemas/link-analysis.schema.json`) and drafts a post.
- [ ] The "Preparing a post" scenario works end to end.

### Later (order to be decided)

- **Spaced repetition** for English and Interview cards (replaces the simple "know / repeat" marks).
- **Job application tracking**: company, role, status, dates, linked notes.
- **Weekly summary report** from `sessions.json` and agent-written `stats.json`.
- **Showcase**: GitHub and LinkedIn profile cards (LinkedIn numbers entered by hand), certificate showcase, featured projects.

## Open questions

- Should a pomodoro always need a project, or is goal-only allowed? This roadmap assumes **project is optional** (README requires a goal; the scenario uses a project).
- ~~Should goal progress be pomodoro-based (assumed here) or based on finished projects?~~ Decided in phase 1.2: pomodoro-based.

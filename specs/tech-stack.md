# Tech Stack

## Overview

| Layer | Choice |
|---|---|
| Desktop shell | Electron (latest stable), Windows only |
| Frontend | React + TypeScript (`strict`), Vite, React Router |
| Note editor | BlockNote |
| Backend | ASP.NET Core Web API on **.NET 10 LTS**, controllers |
| Storage | JSON files behind `IRepository<T>` |
| Validation | JSON Schema files in `schemas/`, validated in the API with JsonSchema.Net |
| External data | GitHub REST API (public, optional token), YouTube channel RSS |
| Tests | xUnit v2 (VSTest) + `WebApplicationFactory` (backend), Vitest + React Testing Library (frontend) |
| Packaging | electron-builder (per-user NSIS wizard, unsigned) with a self-contained, single-file API executable; `node_modules` is not packaged (electron-vite bundles the renderer) |
| Package manager | npm workspaces |
| Desktop build | electron-vite (main, preload and renderer); TypeScript 6.0 (typescript-eslint does not support 7.x yet) |
| Node | 24, pinned in `.nvmrc` and `engines` |
| Docker (optional) | API-only dev container: multi-stage `apps/api/Dockerfile` (`sdk:10.0` → `aspnet:10.0`, non-root, Production) and root `docker-compose.yml` (`127.0.0.1` port, token from `.env`, repo `data/` mounted). Never needed by the desktop app or `npm run check`. |

UI text is Turkish. Code, identifiers, comments, commits and docs are English.

## Architecture

```
┌──────────────────────── Electron ────────────────────────┐
│ main process                                             │
│  - picks a free port, generates a per-launch API token   │
│  - spawns the API process, kills it on quit              │
│  - safeStorage (secrets), notifications, reminders       │
│  - reads and writes app config (data folder path)        │
│                                                          │
│ preload (contextBridge, minimal)                         │
│  - getApiConfig(), settings.*, secrets.*, notify(),      │
│    openExternal()                                        │
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
5. On quit, main stops the API process. If main dies without quitting, the API notices that `DEVPATH_PARENT_PID` exited and stops itself.

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
- Design tokens live in one file (`shared/ui/tokens.css`) as CSS variables (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, sidebar widths); light/dark switch on `prefers-color-scheme`. Accent is indigo. Fonts are the system stack (Segoe UI Variable, Cascadia Code); no bundled web fonts. Components use CSS Modules and only token values.
- Routing: `HashRouter` (the production page is a `file://` URL). One route table (`src/app/navigation.tsx`) drives the sidebar and the routes; paths are English, labels Turkish. A module replaces its empty state entry with its page.
- Layout: sidebar + content area, with a skip link and a visible `:focus-visible` ring. Below 900 px (`width < 900px`, so fractional widths on scaled displays are covered) the sidebar collapses to icons and content goes to one column. Icons are SVG (lucide-react). The API status sits in the sidebar footer.
- `app-config.json` is read and written only by Electron main, atomically, with `schemaVersion: 1`.
- Imported or user text is always rendered as text. No `dangerouslySetInnerHTML`.
- Notes use BlockNote; saves are debounced by 1 second and run in the background.
- The pomodoro timer stores `startedAt` and `durationMs` and derives the remaining time from `Date.now()`, so throttled or minimized windows stay accurate. The end-of-session notification is scheduled in the main process.
- Dates are shown with `Intl` in `tr-TR`; stored as ISO 8601 (UTC timestamps, `YYYY-MM-DD` local dates for days).

## Storage design

### Data folder

- Path is configurable in settings (`dataDir` in `app-config.json`). Default: `%APPDATA%\DevPath\data` for the installed app, `%APPDATA%\DevPath\dev-data` for unpackaged Electron and for the API run on its own in Development, so development never touches real data.
- The API takes the path from `DEVPATH_DATA_DIR` (absolute only); outside Development it refuses to start without it. Electron main creates the folder before starting the API (so its error window can name the folder) and the API creates it again at startup (so `dotnet run` and Docker work alone). An invalid `app-config.json` or an uncreatable folder is an error window, never a silent fallback to another folder.
- The repo also gitignores `data/` in case it is pointed there, but the default avoids the OneDrive-synced repo, where sync can lock files during writes.
- Post-MVP backups go to a sibling folder: `%APPDATA%\DevPath\backups\YYYY-MM-DD\`, last 14 days kept.

### Layout

```
data/
├── goals.json              # goals with optional pomodoro target
├── projects.json           # projects, each linked to one goal
├── sessions.json           # completed pomodoro sessions
├── settings.json           # timer durations, reminder times, YouTube channels
├── daily/
│   └── 2026-11-05.json     # free-text daily log for that day
├── notes/
│   ├── index.json          # folder/page tree (id, parentId, title, kind, order)
│   └── pages/<id>.json     # BlockNote document for one page
├── content/
│   ├── english/<topic-slug>.json
│   ├── learning/<topic-slug>.json
│   └── interview/<topic-slug>.json
├── cache/
│   ├── github.json         # last GitHub stats + fetchedAt
│   └── youtube.json        # last videos per channel + fetchedAt
├── feed.json               # written by the agent, read-only for the app
├── stats.json              # written by the agent, read-only for the app
├── posts.json              # post drafts (post-MVP)
└── style.json              # style prompt (post-MVP)
```

Pomodoros for a day are read from `sessions.json` by date; notes for a day are read from `notes/index.json` by `createdAt`/`updatedAt`. The daily file only holds what is not stored elsewhere.

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

- **Validation:** the API validates the envelope and the `items` schema. Errors come back as a list of `{ path, line, message }` so the import validator can show missing fields line by line. Invalid content is never saved.
- **Rejecting executable content:** JSON only, max 2 MB, schemas use `additionalProperties: false`, strings have max lengths, and nothing is ever rendered as HTML.
- **Merge:** the topic is found by slug of `topic`. New items are appended; items whose merge key already exists are skipped and reported ("12 added, 3 already existed"). User progress on existing items is never touched. New `tags` are unioned.
- **New content type:** add a schema file, a `type` value, a merge key and a prompt template in `prompts/`. No other layer changes.
- **Prompt library:** `prompts/<type>.md` holds the template with format instructions. "Copy prompt" in each module copies it to the clipboard.

### Agent files

`feed.json` (X List summaries) and `stats.json` (weekly stats) are written by Claude's morning task into the data folder. The app only reads them, validates them against `schemas/feed.schema.json` / `schemas/stats.schema.json`, and shows an error card if they are missing or invalid.

## Security rules

- API on `127.0.0.1` only, per-launch token header, `Host` header check (see API rules).
- Secrets (GitHub token; AI API keys post-MVP) are encrypted with Electron `safeStorage` and stored in `userData/secrets.bin`. They are never written to the repo, to JSON data files, to logs or to the renderer. The renderer can only call `secrets.set(name, value)`, `secrets.has(name)` and `secrets.clear(name)`.
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

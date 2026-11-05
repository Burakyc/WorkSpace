# DevPath Workspace

A personal desktop application that manages learning, English practice, interview preparation, notes and career visibility in one place. All data is stored locally as JSON; the app never posts on any platform on the user's behalf.

## Input from stakeholders

- **Engineer ([Name])** : Technology stack, system reliability, scalability, security standards and internal tools for the team/agent.

  **Technology stack**
  - Desktop shell: Electron
  - Frontend: React + TypeScript (Vite)
  - Backend: ASP.NET Core Web API (.NET, runs locally on `localhost` and starts in the background when Electron launches)
  - Data: JSON files in the `data/` folder (`goals`, `projects`, `sessions`, `daily/`, `notes/`, `content/`, `posts`, `stats`, `feed`, `style`)
  - Note editor: BlockNote or Tiptap
  - External data: GitHub REST API (stars, followers, commits), YouTube channel RSS feeds
  - Tests: xUnit (backend), Vitest + React Testing Library (frontend)

  **Reliability**
  - JSON writes are atomic (write to a temp file, then replace); an interrupted write never corrupts data.
  - Automatic daily backup (`backups/YYYY-MM-DD/`), last 14 days kept.
  - Every JSON file has a `schemaVersion` field; migrations run when the version changes.
  - If an external source (GitHub, YouTube) is unreachable, the app opens with the last cached data and shows an error card.

  **Scalability**
  - Modular structure: each module (Pomodoro, Notes, Learning, English, Interview, Posts, Sources) has its own service and folder.
  - Storage sits behind an interface (`IRepository`); moving from JSON to SQLite as data grows touches a single layer.
  - New content types are supported by adding a new `type` to the shared import format (`type`, `topic`, `level`, `tags`, `items`).

  **Security**
  - The API listens on `127.0.0.1` only and is not reachable from outside.
  - API keys and the GitHub token are stored in the operating system's secure storage (Electron `safeStorage`); they are never written to the repo or to JSON files.
  - Electron: `contextIsolation: true`, `nodeIntegration: false`, a limited bridge via `preload`, strict CSP.
  - Every imported file is validated against its schema; executable content is rejected.
  - `data/` and `.env` files are in `.gitignore`; the repo is kept private.

  **Internal tools (team/agent)**
  - Developer panel: API health, recent errors, data file sizes.
  - Import validator: shows missing fields in pasted or uploaded JSON line by line.
  - Agent interface: Claude's morning task writes X List summaries to `feed.json` and weekly stats to `stats.json`. The app only reads these files.
  - Prompt library: ready-made prompt templates with format instructions for each content type.

- **Marketing ([Name])** : UI quality, responsive design, performance expectations, featured content/showcase management and user experience standards.

  **UI quality**
  - Consistent design system: colors, fonts, spacing and components come from a single token file.
  - Light and dark theme, following the operating system theme.
  - Sidebar + content area layout; every module follows the same structure.

  **Responsive design**
  - When the window shrinks to 900 px wide, the sidebar collapses to icons and content switches to a single column.
  - On large screens, dashboards spread across a multi-column grid.
  - Sharp rendering on high-DPI screens (SVG icons).

  **Performance expectations**
  - App startup under 3 seconds; the home screen loads from cache first and external data refreshes in the background.
  - No noticeable typing lag in the note editor; saving runs in the background with a 1-second debounce.
  - The pomodoro timer stays accurate while the app is in the background or minimized.

  **Featured content / showcase**
  - Home screen: a "what changed since your last visit" card (new stars, followers, streak, new videos).
  - Profile cards: GitHub and LinkedIn links with current numbers.
  - Certificate showcase and a list of featured projects.
  - Post assistant: ready LinkedIn drafts from a project, a YouTube video or a link, written in the user's own style prompt.

  **User experience standards**
  - Every main action takes at most two clicks: start pomodoro, open note, add content, prepare post.
  - Keyboard shortcuts (new note, start/stop pomodoro, search).
  - Empty states tell the user what to do ("Copy the prompt to add your first content").
  - Notifications are calm and configurable; the user sets the time of the daily English and tech reminders.
  - Accessibility: sufficient color contrast, full keyboard navigation.

- **Product ([Name])** : Core MVP features (modules, workflows), user scenarios and business rules.

  **MVP scope**
  1. Goals and projects: create a goal, link projects to it, progress percentage.
  2. Pomodoro: start with a goal + project + tags; every session is written to the log.
  3. Calendar and daily log: click a day to see what was done, pomodoros and notes.
  4. Notes: folder and page tree, subpages, toggle lists, code blocks, `/` command, search.
  5. Content modules (Learning, English, Interview): start empty; content is added by pasting or uploading a file.
  6. Home dashboard: GitHub stats, new YouTube videos, `feed.json` summaries, today's reminders.

  **Post-MVP**
  - AI connection modes (API / copy-paste / file import) across all modules
  - AI teacher: a lesson flow that splits a topic into pomodoro-sized parts
  - Post assistant and style prompt
  - Spaced repetition algorithm, job application tracking, weekly summary report

  **User scenarios**
  - *Study session:* The user selects the "Learn ASP.NET Core" goal and the "Todo API" project and starts a pomodoro tagged `#di`. When the timer ends, they write a short note; the session is recorded in the calendar and in the goal's progress.
  - *Adding content:* In the Interview module, the user clicks "Copy prompt", pastes it into any AI, and pastes the returned JSON back into the app. The app validates the format and turns the questions into cards.
  - *Preparing a post:* The user provides a YouTube link. The app fills in the title, body, hashtags, source link and image suggestion fields. The user copies the text and posts it on LinkedIn themselves.
  - *Looking back:* The user clicks last Tuesday in the calendar and sees how many pomodoros they did, which goal they worked on and the notes they took.

  **Business rules**
  - The app never posts, likes, comments or follows on any platform; it only reads and produces drafts.
  - Every pomodoro session must be linked to a goal; tags are optional.
  - Imported content that does not match the schema is not saved, and the missing fields are shown.
  - When new content is added to an existing topic, it is merged rather than overwritten.
  - There is no fixed weekly schedule; the calendar is for recording and looking back, and reminders are daily.
  - Personal data (`data/`) is never committed to the repo.

## Project structure (proposed)

```
devpath-workspace/
├── apps/
│   ├── desktop/        # Electron + React + TypeScript
│   └── api/            # ASP.NET Core Web API
├── schemas/            # JSON import schemas (lesson, vocab, interview, link-analysis)
├── prompts/            # Prompt templates
├── data/               # Personal data (gitignored)
├── specs/              # Mission, tech stack, roadmap, feature specs
├── prompts.md          # Log of development prompts used to build the project
├── CLAUDE.md           # Guidance for AI coding assistants
└── README.md
```

## Development

Prerequisites: Node 24 (see `.nvmrc`), npm 11 and the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
npm install      # install desktop dependencies
npm run dev      # build the API, then open the desktop app with hot reload
npm run check    # build and test everything (API + desktop)
npm run package  # build the Windows installer
```

`npm run dev` builds the API first; Electron then starts `DevPath.Api.exe` on a free port with a new token for each launch and stops it when the app quits. The page shows "API: bağlı" when the connection works.

API only:

```bash
dotnet build apps/api/DevPath.slnx
dotnet test apps/api/DevPath.slnx
dotnet run --project apps/api/DevPath.Api
```

The API listens on `127.0.0.1` only and accepts only `127.0.0.1` as the `Host`. The default URL is http://127.0.0.1:5180/api/health. Set `DEVPATH_PORT` to use another port. In Development, the OpenAPI document is at http://127.0.0.1:5180/openapi/v1.json.

Every request needs the `X-DevPath-Token` header with the value of `DEVPATH_TOKEN`. When `DEVPATH_TOKEN` is not set, the API runs without the check in Development only (and logs a warning); in any other environment it refuses to start. With a token:

```powershell
$env:DEVPATH_TOKEN = 'dev-token'; dotnet run --project apps/api/DevPath.Api
curl.exe -H "X-DevPath-Token: dev-token" http://127.0.0.1:5180/api/health
```

### Data folder

All data is JSON in one folder, which the API takes from `DEVPATH_DATA_DIR` and creates on start (the log shows `Data folder: <path>`).

| Run | Default data folder |
|---|---|
| Installed app | `%APPDATA%\DevPath\data` |
| `npm run dev`, `npm run start`, `dotnet run` (Development) | `%APPDATA%\DevPath\dev-data`, so development never touches real data |
| API outside Development | none: it refuses to start without `DEVPATH_DATA_DIR` |

To use another folder, open **Ayarlar → Veri klasörü → Klasör seç…** and pick a folder. The API restarts with the new folder; existing data is not moved. If the new folder does not work, the app goes back to the old one.

The choice is saved in `app-config.json` in Electron's `userData` folder: `%APPDATA%\DevPath` for the installed app, `%APPDATA%\@devpath\desktop` while unpackaged. The file can also be edited by hand:

```json
{ "schemaVersion": 1, "dataDir": "D:\\DevPathData" }
```

If that file is not valid JSON, `dataDir` is not an absolute path, or the folder cannot be created, the app shows an error and quits.

### Windows installer

`npm run package` publishes the API as a self-contained `DevPath.Api.exe` (no .NET needed on the target machine), builds the desktop app and writes `apps/desktop/release/DevPath Setup <version>.exe`.

- The installer is a per-user wizard: no admin rights, default folder `%LOCALAPPDATA%\Programs\DevPath`, Start menu and desktop shortcuts. Keep "Sadece benim için" on its first page; "everyone" asks for admin rights.
- It is not code-signed, so Windows SmartScreen may warn on first run ("More info" → "Run anyway").
- The first start right after installing takes about 3.5 s; later starts take about 1.5–2 s.
- Uninstall (Windows Settings → Apps) removes the program and shortcuts but keeps `%APPDATA%\DevPath` with your settings and data.

## Commit conventions

Conventional Commits are used: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
Example: `feat(pomodoro): add goal and tag selection`

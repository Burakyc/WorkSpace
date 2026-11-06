# Prompt Log

Development prompts used to build DevPath Workspace, newest at the bottom.

## 2026-11-05 – Project constitution (mission, tech stack, roadmap)
**Phase:** setup
**Prompt:**
We are writing DevPath Workspace, a personal desktop application (Electron + React + TypeScript frontend, local ASP.NET Core Web API backend) that helps a junior software developer manage their learning and career growth in one place. It combines goal-based pomodoro tracking, a calendar/daily log, Notion-style notes, user-filled learning/English/interview modules (content added by pasting AI output or importing JSON files), a source feed (YouTube RSS + X summaries written by an agent), and a LinkedIn post assistant that prepares drafts but never posts. All data is stored locally as JSON. The target user is a single developer (me) preparing for ASP.NET Core + React/TypeScript roles. Look in the README.md for requirements and input from stakeholders.

Let's create a "constitution" in a `specs` directory with the following documents:
- `mission.md` (project vision, core goals, target user, non-goals such as auto-posting or multi-user support, and synthesized stakeholder requirements from Engineer, Marketing and Product)
- `tech-stack.md` (architecture of Electron + React/TypeScript + local ASP.NET Core Web API, JSON storage design and schemas, security rules such as localhost-only API and safeStorage for keys, testing approach, and coding standards including SOLID, conventional commits and folder structure)
- `roadmap.md` (high-level implementation order, broken down into very small, incremental phases of work; each phase should be completable in 1–3 days, produce something usable, and list its acceptance criteria. Start with the MVP: project skeleton, goals/projects, pomodoro with goal and tags, calendar and daily log, notes, empty content modules with import, then the home dashboard. Put AI modes, AI teacher, post assistant and style prompt after the MVP.)

Important: You *must* use your AskUserQuestion tool, grouped on these 3 core areas (mission, tech stack, roadmap), before writing to disk. Ask only about decisions that are not already answered in README.md.

Write all documents in English.
**Result:** created `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`.


## 2026-11-05 – Plan phase 0.1 API skeleton
**Phase:** 0.1 API skeleton
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-api-skeleton/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.1 API skeleton
**Phase:** 0.1 API skeleton
**Prompt:**
Implement the spec in specs 2026-11-05-api-skeleton

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** apps/api (DevPath.Api, DevPath.Api.Tests, DevPath.slnx), .gitignore, global.json, README.md, specs updated; phase 0.1 done.

## 2026-11-05 – Plan phase 0.2 desktop skeleton
**Phase:** 0.2 Desktop skeleton
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-desktop-skeleton/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.2 desktop skeleton
**Phase:** 0.2 Desktop skeleton
**Prompt:**
Implement the spec in specs/2026-11-05-desktop-skeleton/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** apps/desktop (electron-vite, React, ESLint, Prettier, Vitest), root package.json and .nvmrc, README.md, specs updated; phase 0.2 done.

## 2026-11-05 – Add phase 0.7 Docker for the API
**Phase:** 0.7 Docker for the API
**Prompt:**
Add a new phase "0.7 Docker for the API" to the end of Milestone 0 in specs/roadmap.md. Do not renumber other phases or write any code.

- Docker is for development only; the desktop app must still work without Docker.
- Containerize only apps/api with a multi-stage Dockerfile and a docker-compose.yml.
- Port published on 127.0.0.1 only, token check stays on, data in a mounted volume.
- Add short checkbox acceptance criteria like the other phases.

Ask me with AskUserQuestion if anything is unclear before writing.
**Result:** added phase 0.7 to `specs/roadmap.md`.

## 2026-11-05 – Plan phase 0.3 Electron starts the API
**Phase:** 0.3 Electron starts the API
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.3 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-electron-starts-api/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.3 Electron starts the API
**Phase:** 0.3 Electron starts the API
**Prompt:**
Implement the spec in specs 2026-11-05-electron-starts-api

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.3 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** API host check, token middleware, CORS and parent watcher; Electron starts/stops the API, preload `getApiConfig()`, typed API client and status line; README, tech-stack and specs updated; phase 0.3 done.

## 2026-11-05 – Plan phase 0.4 storage foundation
**Phase:** 0.4 Storage foundation
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.4 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-storage-foundation/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.4 storage foundation
**Phase:** 0.4 Storage foundation
**Prompt:**
Implement the spec in specs 2026-11-05-storage-foundation

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.4 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** API data folder (`DEVPATH_DATA_DIR`), `JsonFileStore` with atomic writes and per-file locks, schema migrations, `JsonRepository<T>`; Electron reads `app-config.json` and passes the data folder; README, tech-stack and specs updated; phase 0.4 done.

## 2026-11-05 – Plan phase 0.5 app shell and design tokens
**Phase:** 0.5 App shell and design tokens
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.5 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-app-shell/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.5 app shell and design tokens
**Phase:** 0.5 App shell and design tokens
**Prompt:**
Implement the spec in specs/2026-11-05-app-shell/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.5 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** design tokens, sidebar shell with hash routes and empty states, 900 px collapse, Settings page that switches the data folder and restarts the API, `app-config.json` writer; README, tech-stack and specs updated; phase 0.5 done.

## 2026-11-05 – Plan phase 0.6 Windows installer
**Phase:** 0.6 Windows installer
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.6 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-windows-installer/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.6 Windows installer
**Phase:** 0.6 Windows installer
**Prompt:**
Implement the spec in specs/2026-11-05-windows-installer/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.6 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** self-contained API publish, bundled API path, generated icon, per-user NSIS installer via `npm run package`, installed app uses `%APPDATA%\DevPath`; README, tech-stack and specs updated; phase 0.6 done.

## 2026-11-05 – Plan phase 0.7 Docker for the API
**Phase:** 0.7 Docker for the API
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 0.7 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-docker-api/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 0.7 Docker for the API
**Phase:** 0.7 Docker for the API
**Prompt:**
Implement the spec in specs/2026-11-05-docker-api/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 0.7 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `0.0.0.0` binding only with `DEVPATH_IN_CONTAINER=1`, multi-stage Dockerfile, docker-compose.yml with `.env` token and repo `data/` mount, `npm run docker:api`; README, tech-stack and specs updated; phase 0.7 done.

## 2026-11-05 – Plan phase 1.1 goals
**Phase:** 1.1 Goals
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 1.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-goals/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 1.1 goals
**Phase:** 1.1 Goals
**Prompt:**
Implement the spec in specs/2026-11-05-goals/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 1.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** validation problem filter, Goals module (model, validator, service, endpoints), API client goal requests, Hedefler page with inline create/edit, archive and restore; tech-stack and specs updated; phase 1.1 done.

## 2026-11-05 – Plan phase 1.2 projects and progress
**Phase:** 1.2 Projects and progress
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 1.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-projects-progress/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 1.2 projects and progress
**Phase:** 1.2 Projects and progress
**Prompt:**
Implement the spec in specs/2026-11-05-projects-progress/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 1.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** session model, goal progress endpoint, Projects module (model, validator, service, endpoints), `openExternal` bridge, progress and projects on goal cards; tech-stack, roadmap and specs updated; phase 1.2 done.

## 2026-11-05 – Plan phase 2.1 timer with a goal
**Phase:** 2.1 Timer with a goal
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 2.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-pomodoro-timer/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 2.1 timer with a goal
**Phase:** 2.1 Timer with a goal
**Prompt:**
Implement the spec in specs/2026-11-05-pomodoro-timer/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 2.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** timer state machine, `PomodoroProvider` with localStorage persistence, Pomodoro page with goal/project pickers and controls, sidebar timer, session-end notification in main with `onOpenPage`; tech-stack and specs updated; phase 2.1 done.

## 2026-11-05 – Plan phase 2.2 session log
**Phase:** 2.2 Session log
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 2.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-session-log/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 2.2 session log
**Phase:** 2.2 Session log
**Prompt:**
Implement the spec in specs/2026-11-05-session-log/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 2.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `SessionService` and `POST /api/sessions`, client `createSession`, finished sessions saved with a note, stopped-early sessions saved (not under 1 minute), progress feedback on the Pomodoro page; tech-stack and specs updated; phase 2.2 done.

## 2026-11-05 – Plan phase 2.3 tags and timer settings
**Phase:** 2.3 Tags and timer settings
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 2.3 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-tags-timer-settings/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 2.3 tags and timer settings
**Phase:** 2.3 Tags and timer settings
**Prompt:**
Implement the spec in specs/2026-11-05-tags-timer-settings/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 2.3 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** tag normalization and suggestions, `settings.json` with pomodoro durations and the Ayarlar form, configurable focus length, short and long breaks with their own notification; tech-stack and specs updated; phase 2.3 done.

## 2026-11-05 – Plan phase 3.1 month view
**Phase:** 3.1 Month view
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 3.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-month-view/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 3.1 month view
**Phase:** 3.1 Month view
**Prompt:**
Implement the spec in specs/2026-11-05-month-view/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 3.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `CalendarGrid` and `CalendarService` (completed sessions per local day, time zone from the page) with `GET /api/calendar`; `monthGrid.ts`, `getCalendar` and the Takvim month page with counts, shading, today and month navigation; quick-click fix; tech-stack and specs updated; phase 3.1 done.

## 2026-11-05 – Plan phase 3.2 day detail and daily log
**Phase:** 3.2 Day detail and daily log
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 3.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-day-detail/` (`requirements.md`, `plan.md`, `validation.md`); notes of the day moved to 4.1 in `roadmap.md`.

## 2026-11-05 – Implement phase 3.2 day detail and daily log
**Phase:** 3.2 Day detail and daily log
**Prompt:**
Implement the spec in specs/2026-11-05-day-detail/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 3.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `DayService` (sessions, goals worked on, daily log in `daily/YYYY-MM-DD.json`) with `GET /api/days/{date}` and `PUT /api/days/{date}/log`; day links in the month grid, month in `?month=`, the day page `/calendar/:date` with previous/next day and the "Günlük" form; link style fix; tech-stack and specs updated; phase 3.2 done.

## 2026-11-05 – Plan phase 4.1 page tree
**Phase:** 4.1 Page tree
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 4.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-05-page-tree/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-05 – Implement phase 4.1 page tree
**Phase:** 4.1 Page tree
**Prompt:**
Implement the spec in specs/2026-11-05-page-tree/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 4.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `NoteService` (tree in `notes/index.json`, empty page files, move/shift/delete rules) with the `/api/notes` endpoints and notes of the day in `DayService`; the Notlar page with the tree, rename, reorder, delete confirmation, "Taşı…" and drag and drop; "Notlar" on the day page; tech-stack and specs updated; phase 4.1 done.

## 2026-11-06 – Plan phase 4.2 BlockNote editor
**Phase:** 4.2 BlockNote editor
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 4.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-blocknote-editor/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 4.2 BlockNote editor
**Phase:** 4.2 BlockNote editor
**Prompt:**
Implement the spec in specs/2026-11-06-blocknote-editor/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 4.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** page content endpoints (`GET`/`PUT /api/notes/{id}/content`, sets `updatedAt`); BlockNote 0.56.0 with the Mantine UI, loaded lazily, with a Turkish slash menu, C#-first highlighted code blocks and token colours; editable page title; 1-second autosave with flush on page switch and before the window closes (main ↔ preload handshake); tech-stack and specs updated; phase 4.2 done.

## 2026-11-06 – Plan phase 4.3 notes search
**Phase:** 4.3 Notes search
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 4.3 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-notes-search/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 4.3 notes search
**Phase:** 4.3 Notes search
**Prompt:**
Implement the spec in specs/2026-11-06-notes-search/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 4.3 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `NoteText` (plain text from BlockNote blocks), `SearchText` (Turkish-insensitive folding) and `NoteSearchService` with `GET /api/notes/search` (every word, title matches first, snippet and highlights); the search box above the tree with results, marks and clear; tech-stack and specs updated; phase 4.3 done.

## 2026-11-06 – Plan phase 6.1 dashboard, reminders and feed
**Phase:** 6.1 Dashboard, reminders and feed
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 6.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-home-dashboard/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 6.1 dashboard, reminders and feed
**Phase:** 6.1 Dashboard, reminders and feed
**Prompt:**
Implement the spec in specs/2026-11-06-home-dashboard/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 6.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `FeedValidator` (rules of the new `schemas/feed.schema.json`, no package) and `FeedService` with `GET /api/home/feed` (`ok` / `missing` / `invalid`, 10 newest items, never writes the file); Ana Sayfa as a card grid with Bugün (today's pomodoros, active goals, goal select + "Başlat"), Hatırlatmalar (09:00 / 20:00 defaults) and Akış (summaries with "Aç", error cards); tech-stack and specs updated; phase 6.1 done.

## 2026-11-06 – Plan phase 6.2 YouTube RSS
**Phase:** 6.2 YouTube RSS
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 6.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-youtube-rss/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 6.2 YouTube RSS
**Phase:** 6.2 YouTube RSS
**Prompt:**
Implement the spec in specs/2026-11-06-youtube-rss/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 6.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `YouTubeChannelId`, `YouTubeRss`, `YouTubeFeedClient` and `YouTubeService` (channels in `settings.json`, checked against their RSS; videos in `cache/youtube.json`; failed channels keep their cached videos) with `/api/youtube/channels`, `/videos` and `/refresh`, plus `YouTubeRefresher` (on start and every 6 hours); a network guard in `ApiFactory` and stub handlers; "YouTube kanalları" in Ayarlar and the "Yeni videolar" card with "Yenile" and the error inside the card; tech-stack and specs updated; phase 6.2 done.

## 2026-11-06 – Plan phase 6.3 GitHub stats and what changed
**Phase:** 6.3 GitHub stats and "what changed"
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 6.3 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-github-stats/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 6.3 GitHub stats and what changed
**Phase:** 6.3 GitHub stats and "what changed"
**Prompt:**
Implement the spec in specs/2026-11-06-github-stats/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 6.3 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `GitHubClient` (followers, repos, summed stars, 30-day commit count and the 5 latest commits; token only in the Authorization header, redacted in logs) and `GitHubService` (username in `settings.json`, `cache/github.json`, failed refresh keeps the numbers) with `/api/github/settings`, `/stats` and `/refresh`; `HomeRefresher` for YouTube and GitHub; `VisitService` + `Streak` with `POST /api/home/visit` (`visit.json`, per-launch baseline); Electron `secrets.ts` (safeStorage, `has`/`set`/`clear` bridge, API restart, token and launch id in the API environment); GitHub in Ayarlar and the GitHub and "Son ziyaretinden beri" cards; fix for forged future-dated commits; tech-stack and specs updated; phase 6.3 done.

## 2026-11-06 – Plan phase 5.1 import engine and validator
**Phase:** 5.1 Import engine and validator
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 5.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-import-engine/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 5.1 import engine and validator
**Phase:** 5.1 Import engine and validator
**Prompt:**
Implement the spec in specs/2026-11-06-import-engine/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 5.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** JSON Schemas for vocab, lesson and interview (JsonSchema.Net 9.6.0, embedded), `ImportValidator` with Turkish messages and line numbers, `ImportService` merging into `content/<module>/<slug>.json` with `POST /api/import/validate` and `POST /api/import`, prompt templates in `prompts/`, the import panel and "Promptu kopyala" on the İngilizce, Öğrenme and Mülakat pages; Docker builds from the repo root; tech-stack and specs updated; phase 5.1 done.

## 2026-11-06 – Plan phase 5.2 English module
**Phase:** 5.2 English module
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 5.2 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-english-module/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 5.2 English module
**Phase:** 5.2 English module
**Prompt:**
Implement the spec in specs/2026-11-06-english-module/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 5.2 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `ContentService` with `GET /api/content/{type}`, `GET /api/content/{type}/{slug}` and `PUT …/items/{id}/mark` (vocab marks `known` / `repeat`); the İngilizce topic list with "İçerik ekle", the topic page with cards and the practice mode ("Tekrar et" first, flip, mark); tech-stack and specs updated; phase 5.2 done.

## 2026-11-06 – Plan phase 5.3 interview module
**Phase:** 5.3 Interview module
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 5.3 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-interview-module/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 5.3 interview module
**Phase:** 5.3 Interview module
**Prompt:**
Implement the spec in specs/2026-11-06-interview-module/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 5.3 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** interview mark `practised`; the shared `TopicListPage` (İngilizce and Mülakat) with Turkish level names; the Mülakat topic page with question cards, "Cevabı göster", "Çalıştım" and difficulty / tag / state filters; C# code samples highlighted with Shiki 4.6.0 (no HTML injection); tech-stack and specs updated; phase 5.3 done.

## 2026-11-06 – Plan phase 5.4 learning module
**Phase:** 5.4 Learning module
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 5.4 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-learning-module/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 5.4 learning module
**Phase:** 5.4 Learning module
**Prompt:**
Implement the spec in specs/2026-11-06-learning-module/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 5.4 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** lesson mark `done`; the shared `CodeSample`; the Öğrenme lesson list, the lesson page with parts and progress, and the part page with paragraphs, C# code blocks, exercises, "Tamamlandı" and previous/next; focus fix for the mark buttons; `ContentEmptyPage` removed; tech-stack and specs updated; phase 5.4 done.

## 2026-11-06 – Plan phase 7.1 keyboard shortcuts
**Phase:** 7.1 Keyboard shortcuts
**Prompt:**
Read README.md, CLAUDE.md, specs/mission.md, specs/tech-stack.md and specs/roadmap.md.
Plan Phase 7.1 in roadmap.md. Only plan; do not write any code yet.

Create specs/YYYY-MM-DD-<feature-name>/ with:
- requirements.md (scope, user stories, business rules, out of scope)
- plan.md (small, numbered tasks in order, one Conventional Commit per task)
- validation.md (acceptance criteria, automated tests and manual test steps)

Important: You *must* use AskUserQuestion before writing to disk.
**Result:** created `specs/2026-11-06-keyboard-shortcuts/` (`requirements.md`, `plan.md`, `validation.md`).

## 2026-11-06 – Implement phase 7.1 keyboard shortcuts
**Phase:** 7.1 Keyboard shortcuts
**Prompt:**
Implement the spec in specs/2026-11-06-keyboard-shortcuts/.

- Follow plan.md task by task, in order.
- After each task: run the build and tests, then make a Conventional Commit with the message from plan.md.
- If a task turns out bigger or different than planned, stop and ask before changing the plan.
- When every item in validation.md passes, mark Phase 7.1 as done in roadmap.md, show me the manual test steps, and stop. Do not start the next phase.
**Result:** `matchShortcut` (`Ctrl+N`, `Ctrl+Shift+P`, `Ctrl+K`, `?`, never `?` in text fields) with a capture-phase handler in `AppLayout`; the "Klavye kısayolları" dialog and the "Kısayollar" sidebar button; `useShortcutRequest` so Notlar creates a page inside the open item, the search box takes focus and Pomodoro stops or starts with the last selection; tech-stack and specs updated; phase 7.1 done.

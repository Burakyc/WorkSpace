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

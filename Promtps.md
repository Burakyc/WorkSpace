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

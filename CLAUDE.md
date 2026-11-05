# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Project

DevPath Workspace is a personal desktop app for a single developer. It combines goal-based pomodoro tracking, a calendar and daily log, Notion-style notes, user-filled learning / English / interview modules, a source feed (YouTube RSS + agent-written X summaries) and a LinkedIn post assistant. All data is stored locally as JSON.

Requirements live in `README.md`. The project constitution lives in `specs/` (`mission.md`, `tech-stack.md`, `roadmap.md`). Read them before starting any task, and follow the current phase in `roadmap.md`.

## Tech stack

- Desktop shell: Electron
- Frontend: React + TypeScript (Vite)
- Backend: ASP.NET Core Web API, runs locally on `127.0.0.1`, started by Electron
- Storage: JSON files in `data/` behind an `IRepository` abstraction
- Tests: xUnit (backend), Vitest + React Testing Library (frontend)

## Repository layout

```
apps/desktop/   Electron + React + TypeScript
apps/api/       ASP.NET Core Web API
schemas/        JSON import schemas (lesson, vocab, interview, link-analysis)
prompts/        Prompt templates for content generation
data/           Personal data (gitignored, never commit)
specs/          Mission, tech stack, roadmap, feature specs
```

## Workflow (spec-driven development)

1. Before writing code, check that the task has a spec in `specs/`. If it doesn't, write a short spec first and ask for approval.
2. Work in small steps that match one roadmap phase. Do not start the next phase unprompted.
3. After each step, run the tests and the build. Do not report a step as done if either fails.
4. Update `roadmap.md` when a phase's acceptance criteria are met.
5. When a requirement is unclear, ask instead of guessing.

## Prompt log

- Keep a log of the development prompts used to build this project in `prompts.md` at the repo root.
- When the user gives a new task prompt (spec, feature, refactor, fix), append it to `prompts.md` before starting work, using this format:

  ```
  ## YYYY-MM-DD – Short title
  **Phase:** roadmap phase or "setup"
  **Prompt:**
  <the prompt exactly as given>
  **Result:** files created or changed, one line
  ```

- Fill in **Result** when the task is done. Never edit or delete earlier entries.
- Do not log short follow-up messages (yes/no answers, small corrections).
- `prompts.md` is for development prompts only. The app's content prompt templates live in `prompts/`.

## Coding standards

- Follow SOLID and keep classes and components small and single-purpose.
- C#: nullable reference types enabled, async all the way, dependency injection for services, no business logic in controllers.
- TypeScript: `strict` mode, no `any`, typed API clients, function components with hooks.
- Validate every imported JSON file against its schema in `schemas/` before saving.
- JSON writes must be atomic (write to a temp file, then replace).
- Every data file carries a `schemaVersion` field; changes to a schema need a migration.
- Write tests for services, validators and repositories. UI tests for critical flows.

## Security rules

- The API listens on `127.0.0.1` only.
- API keys and tokens are stored with Electron `safeStorage`, never in code, JSON data or the repo.
- Electron: `contextIsolation: true`, `nodeIntegration: false`, minimal `preload` bridge, strict CSP.
- Never commit anything under `data/`, `.env` files or backups.

## Product rules

- The app never posts, likes, comments or follows on any platform. It only reads and prepares drafts.
- Every pomodoro session must be linked to a goal. Tags are optional.
- Learning, English and interview modules start empty. Content is added only by the user (paste or file import).
- Importing content for an existing topic merges, it never overwrites.

## Git and commits

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Example: `feat(pomodoro): add goal and tag selection`.
- Keep commits small and focused on one change.
- Never add `Co-Authored-By` trailers, "Generated with" lines or any AI attribution to commit messages, PR descriptions, the README or other docs. Do not list any AI tool as a contributor or author.
- Do not push, force-push or rewrite history unless explicitly asked.

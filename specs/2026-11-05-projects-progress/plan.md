# Plan — Phase 1.2 Projects and progress

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/1.2-projects-progress
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Session model for reading

**Commit:** `feat(pomodoro): add the session model`

- `Modules/Pomodoro/Session.cs`, `PomodoroModule.cs` (`AddPomodoro()`: `IRepository<Session>` on `sessions.json`).
- `Program.cs`: `AddPomodoro()`.
- Check: `npm run check`.

### 2. Goal progress

**Commit:** `feat(goals): calculate goal progress from sessions`

- `Modules/Goals/GoalProgress.cs` (record + static `Calculate(goal, sessions)`), `GoalService.ListProgressAsync`, `GET /api/goals/progress`.
- `GoalProgressTests.cs` (T1–T6), endpoint test T7.
- Check: `npm run check`.

### 3. Project model and service

**Commit:** `feat(projects): add project model and service`

- `Modules/Projects/Project.cs`, `ProjectInputs.cs` (`ProjectCreateInput`, `ProjectUpdateInput`), `ProjectValidator.cs`, `ProjectService.cs`, `ProjectsModule.cs` (`AddProjects()`).
- `ProjectValidatorTests.cs` (T8–T10), `ProjectServiceTests.cs` (T11–T16).
- Check: `npm run check`.

### 4. Projects endpoints

**Commit:** `feat(projects): add projects endpoints`

- `Modules/Projects/ProjectsController.cs`.
- `ProjectsEndpointTests.cs` (T17–T20).
- Check: `npm run check`.

### 5. `openExternal` bridge

**Commit:** `feat(desktop): open https links in the default browser`

- `electron/navigation.ts`: `isAllowedExternalUrl`; `electron/main.ts`: IPC handler with `shell.openExternal`; preload and `DevPathBridge`: `openExternal`.
- `electron/navigation.test.ts`: T21.
- Check: `npm run check`.

### 6. API client for projects and progress

**Commit:** `feat(desktop): add project and progress requests to the api client`

- Types `Project`, `ProjectCreateInput`, `ProjectUpdateInput`, `GoalProgress`; client methods.
- `client.test.ts`: T22–T23.
- Check: `npm run check`.

### 7. Progress on goal cards

**Commit:** `feat(goals): show progress on goal cards`

- `src/shared/format/formatDuration.ts` (+ test T24), `src/modules/goals/GoalProgressView.tsx`; `GoalsPage` loads progress with the goals; the fake API serves progress.
- `GoalsPage.test.tsx`: T25–T26.
- Check: `npm run check`.

### 8. Projects under their goal

**Commit:** `feat(projects): show and add projects under their goal`

- `src/modules/projects/ProjectList.tsx`, `ProjectItem.tsx`, `ProjectForm.tsx` + CSS; `GoalsPage` loads projects; the fake API serves projects.
- Tests: T27–T29.
- Check: `npm run check`.

### 9. Edit, archive and restore projects

**Commit:** `feat(projects): edit, archive and restore projects`

- Edit form reuse, archive/restore buttons, the page toggle shows archived projects.
- Tests: T30–T32.
- Check: `npm run check`; manual M1–M8.

### 10. Docs

**Commit:** `docs: document projects, progress and openExternal`

- `specs/tech-stack.md`: progress rule (rounding down, completed sessions only), `GET /api/goals/progress`, preload `openExternal` (https only, re-checked in main), `Project.goalId` fixed.
- `specs/roadmap.md` "Open questions": mark the progress question as decided (pomodoro-based).

### 11. Close the phase

**Commit:** `docs(roadmap): mark phase 1.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 1.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/1.2-projects-progress` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(pomodoro): add the session model` |
| 2 | `feat(goals): calculate goal progress from sessions` |
| 3 | `feat(projects): add project model and service` |
| 4 | `feat(projects): add projects endpoints` |
| 5 | `feat(desktop): open https links in the default browser` |
| 6 | `feat(desktop): add project and progress requests to the api client` |
| 7 | `feat(goals): show progress on goal cards` |
| 8 | `feat(projects): show and add projects under their goal` |
| 9 | `feat(projects): edit, archive and restore projects` |
| 10 | `docs: document projects, progress and openExternal` |
| 11 | `docs(roadmap): mark phase 1.2 done` |

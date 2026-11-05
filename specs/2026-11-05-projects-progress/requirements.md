# Requirements — Phase 1.2 Projects and progress

**Roadmap phase:** 1.2 Projects and progress (Milestone 1 — Goals and projects)
**Branch:** `feat/1.2-projects-progress`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

Goals get projects and visible progress. Projects (e.g. "Todo API" under "Learn ASP.NET Core") are created from their goal card in two clicks, edited, archived and restored, and can hold a link that opens in the browser. Each goal card shows its progress from pomodoro sessions: a percentage of the target, or the session count and total time without a target. Sessions only arrive in phase 2.2, so every goal shows 0 for now, but the calculation is in place and tested.

## Scope

- **API**
  - `Modules/Projects/`: `Project`, validation, `ProjectService`, `ProjectsController` (list, create, update, archive, restore).
  - `Modules/Pomodoro/Session.cs` and the `sessions.json` repository (read-only in this phase), so progress has a real source.
  - `Modules/Goals/GoalProgress.cs` and `GET /api/goals/progress`.
- **Electron**: `openExternal(url)` in the preload bridge (https only), as planned in `tech-stack.md`.
- **Renderer**: API client methods for projects and progress; goal cards show progress and their projects with an inline project form.
- `tech-stack.md` updated (open question about progress closed).

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Progress basis | **Pomodoros**: completed sessions ÷ `targetPomodoros`, capped at 100%; without a target, the completed session count and their total time. Closes the open question in `roadmap.md`. |
| Project URL | **Stored and opened**: optional `https` URL (at most 2048 characters); the project shows a link button that opens it in the default browser through a new `openExternal(url)` bridge function. Main re-checks the URL (https only) before calling `shell.openExternal`. |
| Moving projects | **Not possible**: `goalId` is set on create and never changes. A wrong project is archived and created again. |
| Project order | Creation order (oldest first) under each goal: a goal's projects read like a list that grows. |
| Archive | Same as goals: archive and restore, no delete. The page's "Arşivlenenleri göster" toggle also shows archived projects. Archived goals show their projects but no "Proje ekle". |
| Progress endpoint | `GET /api/goals/progress` returns progress for every goal in one call; goal and project data stay plain entities. The page loads goals, projects and progress together. |
| Rounding | The percentage is rounded **down** (19 of 20 is 95%, never 100% before the target is reached). |
| Session model now | `Session` is defined now with the fields from `tech-stack.md` and read through `IRepository<Session>`; phase 2.2 adds writing. A missing `sessions.json` means no sessions. |

## User stories

1. **As the user**, I add a project to a goal from its card in two clicks (button, then "Kaydet" after typing).
2. **As the user**, I see a goal's projects right under it, open a project's link in my browser, and fix a project's title or link.
3. **As the user**, I archive projects I am done with and can show and restore them.
4. **As the user**, each goal card tells me how far I am: "7 / 20 pomodoro · %35" with a bar, or "7 pomodoro · 2 sa 55 dk" without a target, and 0 until I have sessions.
5. **As the user**, a project can never end up under a goal that does not exist or is archived.

## Business and technical rules

### Project

| Field | Type | Rule |
|---|---|---|
| `id` | string (GUID) | Set by the API |
| `goalId` | string | Required on create; the goal must exist and not be archived; never changes |
| `title` | string | Required after trimming; at most 120 characters |
| `url` | string? | Trimmed; empty → `null`; at most 2048 characters; an absolute `https://` URL |
| `archived` | bool | `false` on create |
| `createdAt` | ISO 8601 UTC | Set on create; never changes |

- Stored in `projects.json` (`DocumentSchema(1, [])`).
- Messages: `goalId`: "Hedef gerekli." / "Hedef bulunamadı." / "Arşivlenmiş bir hedefe proje eklenemez."; `title`: same as goals; `url`: "Bağlantı https:// ile başlayan geçerli bir adres olmalı." / "Bağlantı en fazla 2048 karakter olabilir."
- Updating or restoring a project under an archived goal is allowed (it is the goal that is archived, not the project).

| Method and path | Body | Result |
|---|---|---|
| `GET /api/projects?includeArchived=false` | — | `200` all projects, creation order; archived only with `includeArchived=true` |
| `POST /api/projects` | `{ goalId, title, url? }` | `201` + `Location`; `400` |
| `PUT /api/projects/{id}` | `{ title, url? }` | `200`; `400`; `404` |
| `POST /api/projects/{id}/archive` / `restore` | — | `200`; `404`; idempotent |

### Session (read-only in this phase)

`Session(id, goalId, projectId?, tags[], startedAt, endedAt, durationMinutes, completed, note?)`, stored in `sessions.json` (`DocumentSchema(1, [])`), registered by `AddPomodoro()`.

### Progress

- `GoalProgress(goalId, completedSessions, totalMinutes, percent?)`:
  - `completedSessions` = sessions of the goal with `completed: true`.
  - `totalMinutes` = sum of their `durationMinutes`.
  - `percent` = `null` without a target; otherwise `min(100, floor(completedSessions × 100 ÷ targetPomodoros))`.
- `GET /api/goals/progress` → one entry per goal (archived included), in the order of `GET /api/goals?includeArchived=true`.

### Electron `openExternal`

- Preload: `openExternal(url: string): Promise<void>` → IPC `devpath:open-external` with the usual sender check.
- Main: `isAllowedExternalUrl(url)` (in `electron/navigation.ts`) accepts only parseable `https:` URLs; anything else is rejected without opening. Then `shell.openExternal(url)`.

### Renderer

- Client: `listProjects(includeArchived)`, `createProject`, `updateProject`, `archiveProject`, `restoreProject`, `getGoalProgress()`.
- `GoalsPage` loads goals, projects (with archived) and progress together and passes each goal its projects and progress.
- Goal card, under the meta line:
  - Progress: with a target "N / T pomodoro · %P" plus a native `<progress>` (label "İlerleme"); without a target "N pomodoro · D" where D is "0 dk", "45 dk", "2 sa", "2 sa 5 dk".
  - "Projeler" list: each project shows its title, a "Bağlantıyı aç" button when it has a URL (calls `openExternal`), "Düzenle" and "Arşivle" (or "Arşivlendi" + "Geri al").
  - "Proje ekle" (active goals only) opens an inline form with "Proje adı" and "Bağlantı (isteğe bağlı)", "Kaydet" / "Vazgeç"; field errors from the API as for goals.
- Components: `src/modules/projects/ProjectList.tsx`, `ProjectItem.tsx`, `ProjectForm.tsx`; `src/modules/goals/GoalProgressView.tsx`; `src/shared/format/formatDuration.ts`.

## Out of scope

| Item | Where it goes |
|---|---|
| Creating sessions, the timer | Phases 2.1–2.2 |
| Project progress or project-level targets | Not planned |
| Moving projects between goals | Not planned (decided) |
| Deleting projects | Not planned |
| Reordering projects by hand | Not planned |

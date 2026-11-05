# Validation — Phase 1.2 Projects and progress

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 1.2, plus the decisions in [requirements.md](requirements.md):

- [x] API: create, list, update, archive and restore projects linked to a goal (`projects.json`); the goal must exist and not be archived; `goalId` never changes.
- [x] Optional https project URL, opened in the default browser through `openExternal` (https only, checked in main).
- [x] UI: projects shown under their goal; adding a project from the goal takes two clicks plus typing.
- [x] Goal card shows progress: completed sessions ÷ `targetPomodoros` (capped at 100%, rounded down), or session count and total time without a target; 0 until sessions exist.
- [x] Tests: progress calculation with and without a target, plus the tests below.
- [x] `tech-stack.md` updated and the roadmap's progress question closed.

## Automated tests

Run with:

```bash
npm run check
```

### API (xUnit)

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | No sessions, target | `Modules/Goals/GoalProgressTests.cs` | `0`, `0`, `percent: 0` |
| T2 | No sessions, no target | same | `0`, `0`, `percent: null` |
| T3 | With target | same | 7 completed of target 20 → `percent: 35` |
| T4 | Rounding down and cap | same | 19 of 20 → 95; 25 of 20 → 100 |
| T5 | Without target | same | 3 completed sessions of 25 + 25 + 10 min → `3`, `60`, `null` |
| T6 | Only this goal's completed sessions | same | Stopped-early sessions and other goals' sessions are ignored |
| T7 | `GET /api/goals/progress` | `Modules/Goals/GoalsEndpointTests.cs` | One entry per goal, zeros with no `sessions.json` |
| T8 | Title | `Modules/Projects/ProjectValidatorTests.cs` | Required, at most 120 |
| T9 | URL | same | `null`/empty ok; `https://github.com/x` ok; `http://…`, `javascript:…`, `github.com/x`, 2049 characters → error |
| T10 | Goal id on create | same | Missing → "Hedef gerekli." |
| T11 | Create | `Modules/Projects/ProjectServiceTests.cs` | Owned fields set, trimmed, saved with `schemaVersion: 1` |
| T12 | Unknown goal | same | `ValidationException` with `goalId: "Hedef bulunamadı."`; nothing saved |
| T13 | Archived goal | same | `goalId: "Arşivlenmiş bir hedefe proje eklenemez."` |
| T14 | Update | same | Changes title and url; keeps `goalId`, `archived`, `createdAt`; unknown id → `null` |
| T15 | Archive and restore | same | Flip `archived`; idempotent; unknown id → `null` |
| T16 | List | same | Creation order; archived only with `includeArchived` |
| T17 | `POST /api/projects` | `Modules/Projects/ProjectsEndpointTests.cs` | `201`, `Location`, camelCase body |
| T18 | Invalid | same | `400` with `errors.goalId` for an unknown goal |
| T19 | `PUT`, archive, restore | same | `200`; unknown id `404` |
| T20 | `goalId` in update body is ignored | same | Project keeps its goal |

### Electron and renderer (Vitest)

| ID | Test | File | Expected |
|---|---|---|---|
| T21 | External URLs | `electron/navigation.test.ts` | `https://github.com/x` allowed; `http:`, `file:`, `javascript:`, `mailto:`, `""`, `not a url` refused |
| T22 | Project requests | `src/shared/api/client.test.ts` | Methods, paths (id encoded) and JSON bodies of the five project calls |
| T23 | Progress request | same | `GET /api/goals/progress` returns the typed list |
| T24 | Duration text | `src/shared/format/formatDuration.test.ts` | 0 → "0 dk", 45 → "45 dk", 120 → "2 sa", 125 → "2 sa 5 dk" |
| T25 | Progress with target | `src/modules/goals/GoalsPage.test.tsx` | "7 / 20 pomodoro · %35" and a progress bar with value 35 |
| T26 | Progress without target | same | "3 pomodoro · 1 sa" and no progress bar |
| T27 | Add a project | same | Card → "Proje ekle" → type name and https URL → "Kaydet" → project listed under that goal only |
| T28 | Project link | same | "Bağlantıyı aç" calls `window.devpath.openExternal` with the URL |
| T29 | Archived goal | same | No "Proje ekle" on an archived goal |
| T30 | Edit a project | same | "Düzenle" → change title → "Kaydet" → new title shown |
| T31 | Archive and restore a project | same | Hidden after "Arşivle"; shown with "Arşivlendi" when the toggle is on; "Geri al" brings it back |
| T32 | Project validation | same | Invalid URL → message under "Bağlantı (isteğe bağlı)", form stays open |

## Manual test steps

Run `npm run dev` from the repo root.

| ID | Step | Expected |
|---|---|---|
| M1 | Create goal "Learn ASP.NET Core" with target 20 | Card shows "0 / 20 pomodoro · %0" with an empty bar |
| M2 | Create goal "English every day" without a target | Card shows "0 pomodoro · 0 dk" |
| M3 | On "Learn ASP.NET Core": "Proje ekle" → "Todo API", `https://github.com/` → "Kaydet" | Project listed under that goal; `projects.json` has it with the goal's id |
| M4 | "Bağlantıyı aç" | The default browser opens github.com; the app does not navigate |
| M5 | Edit the project title; archive it; show archived; restore | Each step reflected; archived project shows "Arşivlendi" |
| M6 | Add a sample `sessions.json` (two completed 25-min sessions and one stopped-early session for the first goal), then reload | First goal: "2 / 20 pomodoro · %10"; the other goal unchanged. Delete the sample afterwards |
| M7 | `curl.exe` `POST /api/projects` with an unknown `goalId` | `400` with "Hedef bulunamadı." |
| M8 | In DevTools: `window.devpath.openExternal('file:///C:/Windows')` | Rejected; nothing opens |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M8 done with the expected results
- [x] `roadmap.md` phase 1.2 ticked and set to `done`

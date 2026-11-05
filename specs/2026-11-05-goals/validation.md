# Validation — Phase 1.1 Goals

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 1.1, plus the decisions in [requirements.md](requirements.md):

- [x] API: list, create, update, archive and restore goals in `goals.json`; title required and at most 120 characters; description at most 1000; `targetPomodoros` optional, 1–10000.
- [x] Invalid input returns `400` `ValidationProblemDetails` with Turkish messages per field; nothing is saved.
- [x] UI: goals list (newest first) with an inline create/edit form; archived goals hidden by default, shown with the toggle, restorable.
- [x] Creating a goal takes two clicks plus typing.
- [x] Empty state with a "Yeni hedef" button when there are no goals.
- [x] Tests: `GoalService` (xUnit) and the create-goal flow (RTL), plus the tests below.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

### API (xUnit)

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Filter | `Infrastructure/Validation/ValidationExceptionFilterTests.cs` | A `ValidationException` becomes `400` `application/problem+json` with the `errors` dictionary |
| T2 | Title required | `Modules/Goals/GoalValidatorTests.cs` | `""` and `"   "` → `title: "Başlık gerekli."` |
| T3 | Title length | same | 120 characters ok; 121 → error |
| T4 | Description length | same | 1000 ok; 1001 → error; `null` ok |
| T5 | Target range | same | `null`, 1, 10000 ok; 0, -1, 10001 → error |
| T6 | Several errors | same | Empty title and target 0 → two keys |
| T7 | Create | `Modules/Goals/GoalServiceTests.cs` | New GUID id, trimmed title, empty description → `null`, `archived: false`, `createdAt` from the fake clock; saved in `goals.json` with `schemaVersion: 1` |
| T8 | Create invalid | same | Throws `ValidationException`; `goals.json` not created |
| T9 | Update | same | Changes title, description and target; keeps `id`, `archived`, `createdAt`; unknown id → `null` |
| T10 | Archive and restore | same | `SetArchivedAsync(id, true/false)` flips `archived`; twice is a no-op; unknown id → `null` |
| T11 | List order | same | Active newest first; archived hidden by default |
| T12 | List with archived | same | Active newest first, then archived newest first |
| T13 | Update invalid | same | Throws `ValidationException`; file unchanged |
| T14 | `GET /api/goals` | `Modules/Goals/GoalsEndpointTests.cs` | `200` `[]` on a new data folder |
| T15 | `POST /api/goals` | same | `201`, `Location: /api/goals/{id}`, camelCase body |
| T16 | `POST` invalid | same | `400` problem with `errors.title` |
| T17 | `PUT` | same | `200` updated; unknown id `404` |
| T18 | Archive and restore | same | `200`; list hides it, `includeArchived=true` shows it; restore brings it back; unknown id `404` |
| T19 | Token | same | Without `X-DevPath-Token` → `401` |

### Renderer (Vitest + RTL)

| ID | Test | File | Expected |
|---|---|---|---|
| T20 | JSON body | `src/shared/api/client.test.ts` | `createGoal` sends `POST` with `Content-Type: application/json`, the token and the JSON body |
| T21 | Paths | same | `listGoals(true)` → `GET /api/goals?includeArchived=true`; archive/restore → `POST /api/goals/{id}/archive|restore` (id URL-encoded) |
| T22 | Validation errors | same | `400` problem → `ApiError` with `status: 400` and `errors.title` |
| T23 | Health still works | same | Existing health tests pass |
| T24 | Cached client | `src/shared/api/getApiClient.test.ts` | Two calls → one `getApiConfig()` call |
| T25 | Empty state | `src/modules/goals/GoalsPage.test.tsx` | No goals → empty state text and a "Yeni hedef" button |
| T26 | List | same | Two goals shown newest first with "Hedef: 20 pomodoro" / "Hedef yok" |
| T27 | Archive | same | "Arşivle" removes the card; toggle on → card with "Arşivlendi" and "Geri al" |
| T28 | Restore | same | "Geri al" → the goal is active again |
| T29 | Create-goal flow | same | "Yeni hedef" → type title, description, target → "Kaydet" → form closes, new card at the top |
| T30 | Edit | same | "Düzenle" → form filled with the goal → change title → "Kaydet" → card shows the new title |
| T31 | Validation error | same | API `400` with `errors.title` → message under "Başlık", field `aria-invalid`, form stays open |
| T32 | Cancel | same | "Vazgeç" closes the form; nothing is sent |

## Manual test steps

Run `npm run dev` from the repo root.

| ID | Step | Expected |
|---|---|---|
| M1 | With the API from `npm run dev` running, `curl.exe` `POST /api/goals` with an empty title and the token from `window.devpath.getApiConfig()` | `400` with `"title": ["Başlık gerekli."]` |
| M2 | Open Hedefler with no goals | Empty state text and "Yeni hedef" button |
| M3 | "Yeni hedef" → title "Learn ASP.NET Core", target 20 → "Kaydet" | Card appears at the top with "Hedef: 20 pomodoro"; `goals.json` in the data folder has the goal with `schemaVersion: 1` |
| M4 | Add a second goal without a target | It shows above the first with "Hedef yok" |
| M5 | "Düzenle" on the first goal, change the title, "Kaydet" | The card shows the new title; `createdAt` in `goals.json` unchanged |
| M6 | "Arşivle" one goal; turn on "Arşivlenenleri göster"; "Geri al" | Hidden, then shown with "Arşivlendi", then active again |
| M7 | Use only the keyboard to create a goal (Tab to "Yeni hedef", Enter, type, Tab to "Kaydet", Enter) | Works with visible focus; focus moves to the title field when the form opens |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M7 done with the expected results
- [x] `roadmap.md` phase 1.1 ticked and set to `done`

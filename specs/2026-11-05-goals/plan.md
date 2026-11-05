# Plan — Phase 1.1 Goals

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/1.1-goals
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Validation problem responses

**Commit:** `feat(api): return validation problems for invalid input`

- `Infrastructure/Validation/ValidationException.cs` (holds `IReadOnlyDictionary<string, string[]>`) and `ValidationExceptionFilter.cs` (`IExceptionFilter` → `ValidationProblemDetails`, `400`); registered globally in `AddControllers`.
- `Infrastructure/Validation/ValidationExceptionFilterTests.cs`: T1.
- Check: `npm run check`.

### 2. Goal model and service

**Commit:** `feat(goals): add goal model and service`

- `Modules/Goals/Goal.cs` (record, `IEntity`), `GoalInput.cs`, `GoalValidator.cs` (static, returns the error dictionary), `GoalService.cs` (`ListAsync`, `CreateAsync`, `UpdateAsync`, `SetArchivedAsync`), `GoalsStorage.cs` (path `goals.json`, `DocumentSchema(1, [])`, DI extension `AddGoals()`).
- `Program.cs`: `TimeProvider.System`, `builder.Services.AddGoals()`.
- `Modules/Goals/GoalValidatorTests.cs` (T2–T6) and `GoalServiceTests.cs` (T7–T13) on a temp folder with a fake `TimeProvider`.
- Check: `npm run check`.

### 3. Goals endpoints

**Commit:** `feat(goals): add goals endpoints`

- `Modules/Goals/GoalsController.cs` with the five routes from requirements.md.
- `Modules/Goals/GoalsEndpointTests.cs` (T14–T19) with `ApiFactory`.
- Check: `npm run check`; manual M1.

### 4. API client for goals

**Commit:** `feat(desktop): add goal requests to the api client`

- `src/shared/api/types.ts`: `Goal`, `GoalInput`.
- `src/shared/api/client.ts`: `request<T>`, `ApiError.errors`, the five goal methods.
- `src/shared/api/getApiClient.ts` (cached); `ApiStatus` uses it.
- `client.test.ts`: T20–T23; `getApiClient.test.ts`: T24.
- Check: `npm run check`.

### 5. Goals list with archive and restore

**Commit:** `feat(goals): show goals with archive and restore`

- `src/modules/goals/GoalsPage.tsx`, `GoalCard.tsx` + CSS modules; wire into the route table.
- `src/modules/goals/testing/fakeGoalsApi.ts`: an in-memory fake `fetch` for the goal endpoints, used by the page tests.
- `GoalsPage.test.tsx`: T25–T28.
- Check: `npm run check`.

### 6. Inline create and edit form

**Commit:** `feat(goals): create and edit goals inline`

- `src/modules/goals/GoalForm.tsx` + CSS module; "Yeni hedef" and "Düzenle" open it.
- `GoalsPage.test.tsx`: T29–T32 (create-goal flow, edit, validation error, cancel).
- Check: `npm run check`; manual M2–M7.

### 7. Docs

**Commit:** `docs: document the goals api and validation errors`

- `specs/tech-stack.md` "API rules": validation errors as `ValidationProblemDetails` with Turkish messages via `ValidationException`; registration rule for repositories (`IRepository<T>` → `JsonRepository<T>` per module).
- `specs/tech-stack.md` "Frontend rules": `getApiClient()` and reloading lists after a change.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 1.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 1.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/1.1-goals` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(api): return validation problems for invalid input` |
| 2 | `feat(goals): add goal model and service` |
| 3 | `feat(goals): add goals endpoints` |
| 4 | `feat(desktop): add goal requests to the api client` |
| 5 | `feat(goals): show goals with archive and restore` |
| 6 | `feat(goals): create and edit goals inline` |
| 7 | `docs: document the goals api and validation errors` |
| 8 | `docs(roadmap): mark phase 1.1 done` |

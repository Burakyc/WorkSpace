# Plan — Phase 2.2 Session log

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/2.2-session-log
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Session validation and service

**Commit:** `feat(pomodoro): validate and save sessions`

- `Modules/Pomodoro/SessionInput.cs`, `SessionService.cs` (checks from requirements.md, `CreateAsync`); registered in `AddPomodoro()`.
- `Modules/Pomodoro/SessionServiceTests.cs`: T1–T9 (including the progress update through `GoalService`).
- Check: `npm run check`.

### 2. Sessions endpoint

**Commit:** `feat(pomodoro): add the sessions endpoint`

- `Modules/Pomodoro/SessionsController.cs` with `POST /api/sessions`.
- `SessionsEndpointTests.cs`: T10–T12.
- Check: `npm run check`.

### 3. API client

**Commit:** `feat(desktop): add the session request to the api client`

- Types `SessionInput`, `Session`; `createSession`; the fake API stores sessions and computes progress from them.
- `client.test.ts`: T13.
- Check: `npm run check`.

### 4. Save finished sessions

**Commit:** `feat(pomodoro): save finished sessions with a note`

- `src/modules/goals/progressText.ts` (shared; `GoalProgressView` uses it) + test T14.
- `PomodoroPage`: save form, error, feedback line.
- `PomodoroPage.test.tsx`: T15–T17.
- Check: `npm run check`.

### 5. Save sessions stopped early

**Commit:** `feat(pomodoro): save sessions stopped early`

- `PomodoroPage` "Durdur" flow from requirements.md.
- `PomodoroPage.test.tsx`: T18–T20.
- Check: `npm run check`; manual M1–M6.

### 6. Docs

**Commit:** `docs: document the session log`

- `specs/tech-stack.md`: `POST /api/sessions` rules, stopped-early rule (under 1 minute not saved), save flow.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 2.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 2.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/2.2-session-log` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(pomodoro): validate and save sessions` |
| 2 | `feat(pomodoro): add the sessions endpoint` |
| 3 | `feat(desktop): add the session request to the api client` |
| 4 | `feat(pomodoro): save finished sessions with a note` |
| 5 | `feat(pomodoro): save sessions stopped early` |
| 6 | `docs: document the session log` |
| 7 | `docs(roadmap): mark phase 2.2 done` |

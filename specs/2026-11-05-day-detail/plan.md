# Plan — Phase 3.2 Day detail and daily log

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/3.2-day-detail
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Day detail service

**Commit:** `feat(calendar): build the day detail from sessions`

- `Modules/Calendar/DayService.cs` (`GetAsync(date, timeZone)`, records `DayDetail`, `DaySession`, `DayGoal`); registered in `Program.cs` like `CalendarService`.
- `CalendarGrid.TryParseDate` for `YYYY-MM-DD`.
- `DayServiceTests.cs` (T1–T5), `CalendarGridTests.cs` (T6).
- Check: `npm run check`.

### 2. Daily log

**Commit:** `feat(calendar): save the daily log`

- `DayService.SaveLogAsync(date, text)` writing `daily/YYYY-MM-DD.json`; `GetAsync` reads it.
- `DayServiceTests.cs` (T7–T9).
- Check: `npm run check`.

### 3. Day endpoints

**Commit:** `feat(calendar): add the day endpoints`

- `Modules/Calendar/DaysController.cs`: `GET /api/days/{date}`, `PUT /api/days/{date}/log`.
- `DayEndpointTests.cs` (T10–T11).
- Check: `npm run check`.

### 4. Renderer client

**Commit:** `feat(calendar): add the day requests`

- Types `DayDetail`, `DaySession`, `DayGoal`; `getDay(date, timeZone)`, `saveDayLog(date, text)`; `shiftDay` and `isValidDate` in `monthGrid.ts`; fake API routes.
- `client.test.ts` (T12), `monthGrid.test.ts` (T13).
- Check: `npm run check`.

### 5. Open a day from the month

**Commit:** `feat(calendar): open a day from the month view`

- Day links in `CalendarPage`, month in `?month=`; `DayPage.tsx` (read-only parts) + CSS; route `/calendar/:date` in `AppRoutes.tsx`.
- `CalendarPage.test.tsx` updated (router), `DayPage.test.tsx` (T14–T17).
- Check: `npm run check`; manual M1–M3.

### 6. Daily log on the day page

**Commit:** `feat(calendar): write the daily log on the day page`

- `DailyLog.tsx` in the day page.
- `DayPage.test.tsx` (T18–T19).
- Check: `npm run check`; manual M4–M5.

### 7. Docs

**Commit:** `docs: document the day detail and daily log`

- `specs/tech-stack.md`: the two endpoints, the `daily/` file shape, the `/calendar/:date` route.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 3.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 3.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/3.2-day-detail` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(calendar): build the day detail from sessions` |
| 2 | `feat(calendar): save the daily log` |
| 3 | `feat(calendar): add the day endpoints` |
| 4 | `feat(calendar): add the day requests` |
| 5 | `feat(calendar): open a day from the month view` |
| 6 | `feat(calendar): write the daily log on the day page` |
| 7 | `docs: document the day detail and daily log` |
| 8 | `docs(roadmap): mark phase 3.2 done` |

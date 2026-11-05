# Plan — Phase 3.1 Month view

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/3.1-month-view
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Calendar grid and per-day counts in the API

**Commit:** `feat(calendar): count completed sessions per local day`

- `Modules/Calendar/CalendarGrid.cs` (visible range of a month), `CalendarService.cs` (`GetMonthAsync(month, timeZone)`), `CalendarModule.cs`.
- `CalendarGridTests.cs` (T1–T2), `CalendarServiceTests.cs` (T3–T7).
- Check: `npm run check`.

### 2. Calendar endpoint

**Commit:** `feat(calendar): add the calendar endpoint`

- `Modules/Calendar/CalendarController.cs`.
- `CalendarEndpointTests.cs` (T8–T9).
- Check: `npm run check`.

### 3. Renderer grid math and client

**Commit:** `feat(calendar): add month grid math and the calendar request`

- `src/modules/calendar/monthGrid.ts` (+ test T10–T12), types and `getCalendar`, fake API route.
- `client.test.ts`: T13.
- Check: `npm run check`.

### 4. Takvim page

**Commit:** `feat(calendar): show the month with pomodoro counts`

- `CalendarPage.tsx` + CSS; route table entry.
- `CalendarPage.test.tsx`: T14–T18.
- Check: `npm run check`; manual M1–M5.

### 5. Docs

**Commit:** `docs: document the calendar endpoint`

- `specs/tech-stack.md`: `GET /api/calendar` (time zone from the page, visible grid range, completed only).

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 3.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 3.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/3.1-month-view` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(calendar): count completed sessions per local day` |
| 2 | `feat(calendar): add the calendar endpoint` |
| 3 | `feat(calendar): add month grid math and the calendar request` |
| 4 | `feat(calendar): show the month with pomodoro counts` |
| 5 | `docs: document the calendar endpoint` |
| 6 | `docs(roadmap): mark phase 3.1 done` |

# Requirements — Phase 3.1 Month view

**Roadmap phase:** 3.1 Month view (Milestone 3 — Calendar and daily log)
**Branch:** `feat/3.1-month-view`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

The Takvim page shows a month as a Monday-first grid with the number of completed pomodoros on each day, today highlighted, and previous/next month navigation. The API groups sessions into the user's local days, using the time zone the page sends. Clicking a day comes in phase 3.2.

## Scope

- **API** (`Modules/Calendar/`): `CalendarService` and `GET /api/calendar?month=YYYY-MM&timeZone=<IANA>`.
- **Renderer**: grid math (`monthGrid.ts`), the API client method, and the Takvim page.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Time zone | **Sent by the page**: `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g. `Europe/Istanbul`). Works when the API runs in the Docker container (UTC). |
| What a day counts | **Completed pomodoros** only (like goal progress). Stopped-early sessions show in the day detail (3.2). |
| Day cell | **Number + shading**: the count, with an accent background in four steps (1, 2–3, 4–5, 6+). Days without pomodoros show only the day number. |
| Days of other months | **Muted, with their counts**. The API therefore returns every day of the visible grid (Monday before the 1st to the Sunday after the last day), not only the month. |
| Day of a session | The local date of its `startedAt` in the given time zone. |

## User stories

1. **As the user**, I open Takvim and see this month with the number of pomodoros I finished on each day.
2. **As the user**, today stands out, and busy days are easy to spot.
3. **As the user**, I move to the previous or next month and back to today.
4. **As the user**, a session I finished late in the evening counts for that evening, not for the next day in UTC.

## Business and technical rules

### `GET /api/calendar?month=YYYY-MM&timeZone=<IANA>`

- `month`: `YYYY-MM`, year 2000–2100 ("Ay YYYY-AA biçiminde olmalı."). `timeZone`: an IANA id known to .NET ("Saat dilimi tanınmadı."). Errors are `400` validation problems (keys `month`, `timeZone`).
- Response: `{ month, timeZone, days: [{ date: "YYYY-MM-DD", completedSessions, totalMinutes }] }` with one entry per day of the visible grid, in order: from the Monday on or before the 1st to the Sunday on or after the last day (28–42 days).
- `completedSessions` / `totalMinutes`: completed sessions whose `startedAt`, converted to the time zone, falls on that date, and the sum of their minutes.
- The grid rule lives in one place per side (`CalendarGrid` in C#, `monthGrid.ts` in TypeScript), with the same tests.

### Renderer

- `src/modules/calendar/monthGrid.ts`: `buildMonthGrid(month: 'YYYY-MM'): { date, inMonth }[][]` (weeks of 7, Monday first), `shiftMonth(month, ±1)`, `monthOf(date)`, `todayLocal()` (local `YYYY-MM-DD`).
- `ApiClient.getCalendar(month, timeZone): Promise<CalendarMonth>`.
- Takvim page (`src/modules/calendar/CalendarPage.tsx`):
  - Heading "Takvim"; a toolbar with "Önceki ay" (icon button), the month title in Turkish ("Kasım 2026", `Intl` `tr-TR`), "Sonraki ay", and "Bugün" (back to the current month; disabled when already there).
  - Weekday headers from `Intl` `tr-TR` short names, Monday first ("Pzt" … "Paz").
  - A `role="grid"`-free plain table: `<table>` with `<th scope="col">` weekday headers and one cell per day showing the day number and, if any, the count. Each day cell has an accessible label like "5 Kasım 2026, 3 pomodoro" (or "…, pomodoro yok").
  - Today: `aria-current="date"` and an outline in the accent color.
  - Shading classes for 1, 2–3, 4–5, 6+.
  - Loading and error states ("Takvim yüklenemedi."); the grid layout is drawn from `buildMonthGrid` even before counts arrive.
- The route table entry for Takvim gets `element: <CalendarPage />`.

## Out of scope

| Item | Where it goes |
|---|---|
| Clicking a day, day detail, daily log | Phase 3.2 |
| Week or year views | Not planned |
| Filtering by goal or tag | Not planned for the MVP |
| Streaks | Phase 6.3 ("what changed") |

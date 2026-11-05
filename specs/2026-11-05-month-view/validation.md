# Validation — Phase 3.1 Month view

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 3.1, plus the decisions in [requirements.md](requirements.md):

- [x] Month calendar with the completed pomodoro count per day (number + shading); today highlighted; previous/next month and "Bugün".
- [x] API: `GET /api/calendar?month=YYYY-MM&timeZone=…` returns per-day counts from `sessions.json` for the visible grid, grouped by local day.
- [x] Week starts on Monday; month and day names in Turkish; days of other months muted with their counts.
- [x] Tests: per-day grouping across month and time-zone boundaries, plus the tests below.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Grid range | `Modules/Calendar/CalendarGridTests.cs` | 2026-11 → 2026-10-26 … 2026-12-06 (42 days); 2027-02 (starts Monday, 28 days) → 2027-02-01 … 2027-02-28 |
| T2 | Month format | same | `2026-13`, `26-11`, `2026-1`, `abcd-ef`, 1999-12 → invalid |
| T3 | Counts per day | `Modules/Calendar/CalendarServiceTests.cs` | Two completed sessions on one day and one on another → counts 2 and 1, minutes summed; other days 0 |
| T4 | Only completed | same | A stopped-early session is not counted |
| T5 | Time-zone boundary | same | `2026-11-05T21:30Z` in `Europe/Istanbul` (UTC+3) counts on 2026-11-06; in `UTC` on 2026-11-05 |
| T6 | Month boundary | same | `2026-11-30T22:30Z` in Istanbul counts on 2026-12-01, which is in November's grid (muted day) and in December's |
| T7 | Unknown zone | same | `Mars/Base` → `ValidationException` with `timeZone` |
| T8 | Endpoint | `Modules/Calendar/CalendarEndpointTests.cs` | `200` with 42 days for 2026-11; zeros on a new data folder |
| T9 | Bad input | same | Bad `month` or missing `timeZone` → `400` problem |
| T10 | Grid | `src/modules/calendar/monthGrid.test.ts` | Same ranges as T1; 6 or 4–5 weeks of 7; `inMonth` flags |
| T11 | Shift | same | `shiftMonth('2026-12', 1)` → `2027-01`; `shiftMonth('2026-01', -1)` → `2025-12` |
| T12 | Today | same | `todayLocal()` uses local, not UTC, date |
| T13 | Client | `src/shared/api/client.test.ts` | `getCalendar('2026-11', 'Europe/Istanbul')` → `GET /api/calendar?month=2026-11&timeZone=Europe%2FIstanbul` |
| T14 | Turkish layout | `src/modules/calendar/CalendarPage.test.tsx` | Title "Kasım 2026"; headers "Pzt" … "Paz" |
| T15 | Counts | same | A day with 3 pomodoros shows "3" and the label "… 3 pomodoro"; shading class for 2–3 |
| T16 | Today | same | Today's cell has `aria-current="date"` |
| T17 | Navigation | same | "Önceki ay" → "Ekim 2026" and a new request; "Bugün" → back; "Bugün" disabled on the current month |
| T18 | Error | same | API failure → "Takvim yüklenemedi." |

## Manual test steps

Run `npm run dev` with a goal. To get sessions on other days, add them to `sessions.json` by hand (see M2).

| ID | Step | Expected |
|---|---|---|
| M1 | Open Takvim | This month in Turkish, Monday first; today outlined; leading/trailing days muted |
| M2 | Close the app; put three completed sessions in `sessions.json`: two on the 3rd (`startedAt` 09:00Z, 10:00Z) and one on the 4th at 21:30Z (00:30 on the 5th in Istanbul); plus one stopped-early session on the 3rd; start again | The 3rd shows 2, the 5th shows 1, the 4th shows nothing |
| M3 | Complete one real session today (DevTools shortcut from phase 2.2) and open Takvim | Today's count goes up by one |
| M4 | "Önceki ay", "Sonraki ay", "Bugün" | The months change; "Bugün" returns and is disabled on the current month |
| M5 | Tab through the toolbar | Every button reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M5 done with the expected results
- [x] `roadmap.md` phase 3.1 ticked and set to `done`

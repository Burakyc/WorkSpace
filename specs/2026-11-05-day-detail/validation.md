# Validation — Phase 3.2 Day detail and daily log

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 3.2, plus the decisions in [requirements.md](requirements.md):

- [ ] Clicking a day opens its page: sessions (time, goal, project, tags, note) and the goals worked on. (Notes of the day: phase 4.1.)
- [ ] Free-text daily log for the day saved to `daily/YYYY-MM-DD.json` with "Kaydet".
- [ ] The "Looking back" scenario works: click last Tuesday → see the count and the goals.
- [ ] Previous/next day and "Takvime dön" (same month) work.
- [ ] Tests: day detail service; open-a-day flow (RTL).
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Sessions of the day | `Modules/Calendar/DayServiceTests.cs` | Only sessions whose local start date is the day, oldest first, stopped-early included with `completed: false` |
| T2 | Titles | same | Goal and project titles joined (archived included); a missing goal gives `goalTitle: null` |
| T3 | Goals worked on | same | Two goals → ordered by completed count; counts and minutes from completed sessions only; a goal with only a stopped session shows 0 |
| T4 | Time-zone boundary | same | `2026-11-05T21:30Z` is on 2026-11-06 in `Europe/Istanbul` and on 2026-11-05 in `UTC` |
| T5 | Bad input | same | `2026-02-30`, `2026-11-5`, `1999-12-31` → `date` error; `Mars/Base` → `timeZone` error |
| T6 | Date parsing | `CalendarGridTests.cs` | `TryParseDate` accepts `2026-11-05`, rejects the T5 dates |
| T7 | Log round trip | `DayServiceTests.cs` | `SaveLogAsync` then `GetAsync` returns the text; file `daily/2026-11-05.json` has `schemaVersion: 1`, `date`, `text` |
| T8 | Log rules | same | Trailing whitespace trimmed, leading kept; `null` → `""`; 10,001 characters → `text` error; a new save replaces the old text |
| T9 | No log | same | A day without a file → `log: ""` |
| T10 | Endpoint | `Modules/Calendar/DayEndpointTests.cs` | `GET /api/days/2026-11-05?timeZone=UTC` → `200` empty day; `PUT …/log` then `GET` → the text |
| T11 | Endpoint errors | same | Bad date or missing time zone → `400` problem; too long text → `400` with `text` |
| T12 | Client | `src/shared/api/client.test.ts` | `getDay('2026-11-05', 'Europe/Istanbul')` → `GET /api/days/2026-11-05?timeZone=Europe%2FIstanbul`; `saveDayLog` → `PUT /api/days/2026-11-05/log` with `{ text }` |
| T13 | Day math | `src/modules/calendar/monthGrid.test.ts` | `shiftDay('2026-12-31', 1)` → `2027-01-01`, `shiftDay('2026-03-01', -1)` → `2026-02-28`; `isValidDate` rejects `2026-02-30` |
| T14 | Open a day | `src/modules/calendar/DayPage.test.tsx` | Calendar → click the link "3 Kasım 2026, 2 pomodoro" → heading "3 Kasım 2026 Salı", summary "2 pomodoro · 50 dk" |
| T15 | Day content | same | Sessions with time range, goal, project, `#tag`, note, "Erken durduruldu"; goal list with counts |
| T16 | Navigation | same | "Sonraki gün" → 4 Kasım; "Takvime dön" → month "Kasım 2026"; an invalid date URL → calendar |
| T17 | Empty and error | same | Empty day → "Bu gün oturum yok."; API failure → "Gün yüklenemedi." |
| T18 | Save the log | same | Type → "Kaydedilmemiş değişiklik var."; "Kaydet" → request with the text, "Kaydedildi.", button disabled |
| T19 | Log error | same | `400` with `text` → the message under the field; text kept |

## Manual test steps

Run `npm run dev` with a goal and a project. Put sessions in `sessions.json` by hand as in 3.1 (two completed on last Tuesday with a project, a tag and a note, one stopped-early).

| ID | Step | Expected |
|---|---|---|
| M1 | Takvim → click last Tuesday | The day page shows "2 pomodoro · 50 dk", the goal, both completed sessions and the stopped one with times in local time |
| M2 | "Önceki gün" / "Sonraki gün", then the browser back (Alt+←) | The day changes; back returns to the previous day |
| M3 | "Takvime dön" from a day in last month | The calendar opens on that month; Takvim stays active in the sidebar on the day page |
| M4 | Write two lines in "Günlük", "Kaydet"; leave and come back; restart the app | The text is there; `daily/YYYY-MM-DD.json` holds it with `schemaVersion: 1` |
| M5 | Tab through the day page | Every link, button and the textarea reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M5 done with the expected results
- [ ] `roadmap.md` phase 3.2 ticked and set to `done`

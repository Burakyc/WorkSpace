# Requirements — Phase 3.2 Day detail and daily log

**Roadmap phase:** 3.2 Day detail and daily log (Milestone 3 — Calendar and daily log)
**Branch:** `feat/3.2-day-detail`
**Estimate:** 2 days at 1–2 hours/day

## Goal

Clicking a day in the month view opens that day's page: the sessions of the day (time, goal, project, tags, note), the goals worked on, and a free-text daily log saved to `daily/YYYY-MM-DD.json`. This makes the "Looking back" scenario work: click last Tuesday → see the pomodoro count and the goals. Notes of the day arrive with the Notes module (phase 4.1).

## Scope

- **API** (`Modules/Calendar/`): `DayService` (day detail + daily log) and `GET /api/days/{date}`, `PUT /api/days/{date}/log`.
- **Renderer**: the day page at `/calendar/YYYY-MM-DD`, links from the month grid, the month kept in the URL (`/calendar?month=YYYY-MM`).
- `tech-stack.md` and `roadmap.md` updated (notes of the day move to 4.1).

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Notes of the day | **Added in phase 4.1**, when notes exist. 3.2 shows no notes section and no placeholder; the roadmap item moves to 4.1. |
| Where the day opens | **Its own page** `/calendar/YYYY-MM-DD` with "Takvime dön" (back to that day's month) and previous/next day buttons. The browser back button and the URL work. |
| Saving the daily log | **"Kaydet" button**. While the text differs from the saved one, "Kaydedilmemiş değişiklik var." shows; after a save, "Kaydedildi.". |
| Day of a session | Same as 3.1: the local date of `startedAt` in the time zone the page sends. |
| Sessions listed | **All** sessions of the day, oldest first, stopped-early ones marked "Erken durduruldu". The day summary and the goal list count **completed** sessions and their minutes, like the calendar and goal progress. |
| Empty log | Saving an empty (or whitespace-only) text stores `""`; the file is kept. Reading a day without a file gives `""`. |

## User stories

1. **As the user**, I click a day in the calendar and see what I did: each session with its time, goal, project, tags and note.
2. **As the user**, I see which goals I worked on that day and how many pomodoros each got.
3. **As the user**, I write a few lines about the day and save them; they are there when I come back.
4. **As the user**, I step to the previous or next day, and go back to the calendar on the same month.

## Business and technical rules

### `GET /api/days/{date}?timeZone=<IANA>`

- `date`: `YYYY-MM-DD`, a real date, year 2000–2100 ("Tarih YYYY-AA-GG biçiminde olmalı."). `timeZone`: as in 3.1 ("Saat dilimi tanınmadı."). Errors are `400` validation problems (keys `date`, `timeZone`).
- Response:
  ```json
  {
    "date": "2026-11-03",
    "timeZone": "Europe/Istanbul",
    "completedSessions": 2,
    "totalMinutes": 50,
    "sessions": [
      { "id": "…", "startedAt": "…", "endedAt": "…", "durationMinutes": 25, "completed": true,
        "goalId": "g1", "goalTitle": "Learn ASP.NET Core", "projectId": null, "projectTitle": null,
        "tags": ["di"], "note": null }
    ],
    "goals": [ { "goalId": "g1", "title": "Learn ASP.NET Core", "completedSessions": 2, "totalMinutes": 50 } ],
    "log": ""
  }
  ```
- `sessions`: every session whose local start date is `date`, ordered by `startedAt`. Titles come from `goals.json` / `projects.json` (archived ones included); a missing goal or project gives `null`.
- `goals`: every goal with at least one session that day, ordered by completed sessions (most first), then title. Counts and minutes are completed sessions only (a goal with only stopped-early sessions shows 0).
- `log`: the text of `daily/YYYY-MM-DD.json`, or `""`.

### `PUT /api/days/{date}/log`

- Body `{ "text": "…" }`. At most 10,000 characters ("Günlük en fazla 10.000 karakter olabilir."); `null` counts as `""`. The text is trimmed at the end only (leading indentation kept).
- Saves `daily/YYYY-MM-DD.json` as `{ "schemaVersion": 1, "date": "YYYY-MM-DD", "text": "…" }` atomically through `JsonFileStore`; returns `{ "text": "…" }`.
- Any valid date can be written, including future days.

### Renderer

- Month grid (3.1): each day number becomes a link to `/calendar/YYYY-MM-DD` carrying the accessible label from 3.1 ("5 Kasım 2026, 3 pomodoro"). The month lives in `?month=YYYY-MM` (missing or invalid → this month), so "Takvime dön" and the back button return to the same month.
- Day page (`src/modules/calendar/DayPage.tsx`), route `/calendar/:date` (an invalid date redirects to `/calendar`):
  - Heading with the long Turkish date and weekday ("3 Kasım 2026 Salı"); toolbar: "Takvime dön" (link), "Önceki gün", "Sonraki gün" (icon buttons).
  - Summary: "2 pomodoro · 50 dk" (`formatDuration`), or "Bu gün tamamlanan pomodoro yok.".
  - "Hedefler" list: title (or "Silinmiş hedef") with "2 pomodoro · 50 dk".
  - "Oturumlar" list: local time range "09:00–09:25", goal, project if any, `#tags`, note; "Erken durduruldu" on stopped-early sessions. Empty: "Bu gün oturum yok.".
  - "Günlük" section: a labelled textarea ("Bu gün hakkında notların"), "Kaydet" (disabled while saving or when nothing changed), status line, field error from the API, "Günlük kaydedilemedi." on other failures.
  - Loading and error states ("Gün yüklenemedi.").
- The sidebar keeps Takvim active on day pages.

## Out of scope

| Item | Where it goes |
|---|---|
| Notes created or edited that day | Phase 4.1 (with the page tree) |
| Editing or deleting sessions from the day page | Not planned for the MVP |
| Autosave of the daily log | Not planned (explicit "Kaydet" chosen) |
| Markdown or rich text in the daily log | Not planned; plain text |
| Backups of `daily/` | Post-MVP daily backups |

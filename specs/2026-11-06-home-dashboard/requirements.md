# Requirements — Phase 6.1 Dashboard, reminders and feed

**Roadmap phase:** 6.1 Dashboard, reminders and feed (Milestone 6 — Home dashboard)
**Branch:** `feat/6.1-home-dashboard`
**Estimate:** 2 days at 1–2 hours/day

## Goal

Ana Sayfa stops being an empty state and becomes a dashboard of cards: **Bugün** (today's pomodoros, active goals and a quick start), **Hatırlatmalar** (today's English and tech reminders) and **Akış** (the X List summaries Claude's morning task writes to `feed.json`). The grid is one column under 900 px and several columns on wide windows. Every card loads on its own; nothing on the page waits for the network.

## Scope

- **Schema**: `schemas/feed.schema.json`, the contract for the agent that writes `feed.json`.
- **API** (`Modules/Home/`): `FeedValidator` (the schema's rules in C#), `FeedService` (reads `feed.json`, read only) and `GET /api/home/feed`.
- **Renderer** (`modules/home/`): `HomePage` with the card grid, `TodayCard`, `RemindersCard`, `FeedCard`, the shared `HomeCard` frame, and the default reminder times in `reminders.ts`.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Quick start | **Goal select + "Başlat" on the card.** The Bugün card has a goal select (active goals) and a "Başlat" button: two clicks. It starts a focus timer with that goal (no project, no tags, focus length from settings) and stays on Ana Sayfa; the sidebar shows the running timer. |
| `feed.json` format | **Simple list.** `{ "schemaVersion": 1, "generatedAt", "items": [{ "title", "summary", "url"?, "source"?, "publishedAt"? }] }`. The card shows the 10 newest items. |
| Validation | **No new package.** `FeedValidator` applies the rules of `schemas/feed.schema.json` by hand; the schema file stays the contract for the agent. A test checks that the schema file and the validator name the same required fields. Milestone 5 adds JsonSchema.Net for imports in parallel; nothing here depends on it. |
| Default reminder times | **İngilizce 09:00, Teknik 20:00.** Constants in the renderer until phase 7.2 moves them to `settings.json`. |

## User stories

1. **As the user**, I open the app and see how many pomodoros I did today and my active goals, and I start a pomodoro for a goal in two clicks without leaving the page.
2. **As the user**, I see today's English and tech reminder times and which one is still ahead.
3. **As the user**, I read the X summaries my morning agent wrote and open a summary's link in the browser.
4. **As the user**, when `feed.json` is missing or broken, I see a clear error card that says what is wrong, and the other cards still work.

## Business and technical rules

### `feed.json` (`schemas/feed.schema.json`)

- Lives at the root of the data folder. Written only by the agent; the app **never writes** it (the service reads the file directly, not through `JsonFileStore`, which could save a migrated file back).
- Root object, `additionalProperties: false`:
  - `schemaVersion`: the number `1`.
  - `generatedAt`: string, ISO 8601 date-time with offset (e.g. `2026-11-06T07:00:00Z`).
  - `items`: array of at most 200 items.
- Item object, `additionalProperties: false`:
  - `title`: string, 1–200 characters (after trimming), required.
  - `summary`: string, 1–2,000 characters (after trimming), required.
  - `url`: string, absolute `https://` URL, at most 2,000 characters, optional.
  - `source`: string, 1–100 characters, optional (e.g. the X List or author).
  - `publishedAt`: string, ISO 8601 date-time with offset, optional.
- The file is at most 2 MB.

### `GET /api/home/feed`

Always `200`:

```json
{ "status": "ok", "generatedAt": "2026-11-06T07:00:00+00:00", "items": [ … ], "errors": [] }
```

- `status: "missing"` when there is no `feed.json`; `items` empty, `errors` empty.
- `status: "invalid"` when the file is too big, is not JSON, or breaks a rule. `items` empty; `errors` lists every problem as a Turkish line with its JSON path, e.g. `items[2].title: Başlık gerekli.`, at most 20 lines. Nothing from an invalid file is shown.
- `status: "ok"`: `items` are the 10 newest, `publishedAt` descending; items without `publishedAt` come after the dated ones in file order. Strings are returned trimmed.
- The file is read on every request (it is small and local); there is no cache.

### Cards

- **Grid**: CSS grid, `repeat(auto-fill, minmax(20rem, 1fr))` on wide windows, one column below 900 px. Cards are `<section>`s with a heading.
- **Bugün**: "Bugün N pomodoro · X sa Y dk" from `GET /api/days/{today}` (completed sessions only); the active goals (not archived) with their progress text (the same text as the Hedefler page); a goal select and "Başlat". Without goals: "Önce bir hedef ekle." with a link to Hedefler. While a timer exists (running, paused, finished or a break), the select is replaced with "Pomodoro sürüyor." and a link to Pomodoro. A failed load shows "Bugünün özeti yüklenemedi." inside the card.
- **Hatırlatmalar**: İngilizce 09:00 and Teknik 20:00, each "geçti" when the time has passed today, otherwise "sırada"; the next one is marked. Recomputed every minute.
- **Akış**: the items as a list (title, source and date in muted text, summary as plain text). An item with `url` has "Aç" that calls `openExternal(url)`. The card shows the generation time ("Güncellendi: 6 Kasım 07:00"). `missing` → error card "Akış dosyası bulunamadı." with a hint that the morning task writes `feed.json` into the data folder. `invalid` → error card "Akış dosyası geçersiz." with the error lines. A failed request → "Akış yüklenemedi.". `ok` with no items → "Akışta özet yok.".
- Error cards use the danger colour on the border and `role="alert"` is **not** used (they are not urgent); the heading says what is wrong.
- Every card fetches on its own with the promise chain + `active` flag pattern; one card's failure never hides another. Text from `feed.json` is always rendered as text.

## Out of scope

| Item | Where it goes |
|---|---|
| Reminder time settings and OS notifications | Phase 7.2 |
| YouTube "new videos" card | Phase 6.2 |
| GitHub stats and "what changed" card | Phase 6.3 |
| `stats.json` (weekly stats) | Post-MVP weekly summary report |
| Choosing a project or tags in the quick start | Not planned (use the Pomodoro page) |

# Validation — Phase 6.1 Dashboard, reminders and feed

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 6.1, plus the decisions in [requirements.md](requirements.md):

- [x] Home page grid: one column under 900 px, multi-column on large screens.
- [x] Today card: pomodoros today, active goals, quick "start pomodoro" (two clicks).
- [x] Feed card reads `feed.json` (agent-written X summaries); validated against the rules of `schemas/feed.schema.json`; error card if missing or invalid.
- [x] Reminders card lists today's English (09:00) and tech (20:00) reminders.
- [x] Home renders from cached data first; nothing on it blocks on the network; one card's failure never hides another.
- [x] The app never writes `feed.json`.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Valid feed | `Modules/Home/FeedValidatorTests.cs` | A file with every field and one with only the required fields → no errors, items trimmed |
| T2 | Broken rules | same | Wrong `schemaVersion`, missing `generatedAt`, bad date, `items` not an array, missing/empty/too long `title`, `http://` url, unknown property → one line each with its path (`items[1].url: …`) |
| T3 | Limits | same | 201 items → error; more than 20 problems → 20 lines |
| T4 | Schema file | `Modules/Home/FeedSchemaFileTests.cs` | `schemas/feed.schema.json` parses; `schemaVersion` const 1; required fields are the validator's |
| T5 | Read | `Modules/Home/FeedServiceTests.cs` | No file → `missing`; valid file → `ok` with the 10 newest by `publishedAt`, undated last; the file is unchanged afterwards |
| T6 | Bad file | same | Not JSON, a JSON array, over 2 MB → `invalid` with a Turkish line |
| T7 | Endpoint | `Modules/Home/HomeEndpointTests.cs` | `GET /api/home/feed` → `200` with camelCase `status`, `items`, `errors` |
| T8 | Client | `src/shared/api/client.test.ts` | `getFeed()` → `GET /api/home/feed` |
| T9 | Today | `src/modules/home/HomePage.test.tsx` | "Bugün 2 pomodoro · 50 dk", active goals with progress, archived goal not shown |
| T10 | Quick start | same | Pick a goal, "Başlat" → timer running for that goal with the focus length from settings; the card shows "Pomodoro sürüyor." |
| T11 | No goals / failure | same | No goals → link to Hedefler; days request fails → "Bugünün özeti yüklenemedi." while the other cards still render |
| T12 | Reminder status | `src/modules/home/reminders.test.ts` | 08:59 → both "sırada", İngilizce next; 09:00 → İngilizce "geçti", Teknik next; 21:00 → both "geçti", none next |
| T13 | Feed | `src/modules/home/HomePage.test.tsx` | Items with title, source, summary; "Aç" calls `openExternal(url)`; item without url has no "Aç" |
| T14 | Feed errors | same | `missing` → "Akış dosyası bulunamadı."; `invalid` → "Akış dosyası geçersiz." with the lines; request fails → "Akış yüklenemedi."; no items → "Akışta özet yok." |
| T15 | Reminders card | same | İngilizce 09:00 and Teknik 20:00 with their status at a fixed time |

## Manual test steps

Run `npm run dev`. Have one active goal ("Learn ASP.NET Core") and one archived goal.

| ID | Step | Expected |
|---|---|---|
| M1 | Open Ana Sayfa with no `feed.json` in the data folder | Bugün, Hatırlatmalar and Akış cards; Akış shows "Akış dosyası bulunamadı."; the other cards work |
| M2 | Put a valid `feed.json` (3 items, one without url) in the data folder, reload | Akış lists them newest first with source and date; "Aç" opens the link in the default browser |
| M3 | Break the file (remove a `title`), reload | "Akış dosyası geçersiz." with `items[0].title: …` |
| M4 | In Bugün, pick the goal and click "Başlat" | Timer starts (sidebar shows it), the card shows "Pomodoro sürüyor."; Pomodoro page shows the same goal. Stop it there. |
| M5 | Make the window narrower than 900 px, then wide | One column, then several columns |
| M6 | Tab through the page | Select, "Başlat", links and "Aç" reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M6 done with the expected results
- [x] `roadmap.md` phase 6.1 ticked and set to `done`

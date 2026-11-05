# Requirements — Phase 2.3 Tags and timer settings

**Roadmap phase:** 2.3 Tags and timer settings (Milestone 2 — Pomodoro)
**Branch:** `feat/2.3-tags-timer-settings`
**Estimate:** 3 days at 1–2 hours/day

## Goal

Sessions get optional tags (e.g. `#di`) with suggestions from earlier sessions. The focus, short-break and long-break lengths and the long-break interval become settings in `settings.json`, edited on the Ayarlar page. After a focus session, the user can take a short or long break; breaks count down like focus time, notify when they end, and are never logged.

## Scope

- **API**: tag normalization and validation on sessions; `GET /api/sessions/tags`; a Settings module with `settings.json`, `GET /api/settings` and `PUT /api/settings/pomodoro`.
- **Electron**: the notification title becomes a parameter ("Odak süresi bitti" / "Mola bitti").
- **Renderer**: tag input with suggestions on the Pomodoro page (at start, editable in the save form); durations from settings; breaks with a cycle counter; a "Pomodoro süreleri" section on the Ayarlar page.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| When tags are chosen | **At start, editable at save**: a tag field next to goal and project before "Başlat" (locked while the session runs); the save form shows the tags again so they can be fixed before "Kaydet". A stopped-early session is saved with the start tags. |
| Lower-casing | **Invariant**: `#DI` → `di`, `#API` → `api`. Turkish capitals become plain letters (`#İngilizce` → `ingilizce`): after lower-casing, a combining dot above (U+0307) is removed, so the C# API and the TypeScript client give the same result. Stored without `#`, shown with `#`. |
| Starting a break | **Two buttons after saving**: "Molaya başla (5 dk)" (or "Uzun molaya başla (15 dk)" when it is the long one) and "Molayı atla". |
| Break end | **Silent "Mola bitti" notification**; clicking it opens the Pomodoro page, like focus. |
| Long break | Every `longBreakInterval`-th completed focus session (default 4) offers the long break. The count of completed focus sessions in the current cycle is kept in `localStorage` (`devpath.pomodoro.cycle`); stopped-early sessions do not count; taking or skipping a long break resets it to 0. |
| Settings file | `settings.json` is one document, `{ "schemaVersion": 1, "pomodoro": { … } }`, read and written through `JsonFileStore` (not a repository: it is not a list). Missing file or section → defaults. Later settings (reminders, channels) get their own sections. |
| Changing durations | Takes effect for the next timer; a running timer keeps its length. |

## User stories

1. **As the user**, I tag a session (`#di`, `#efcore`) before starting; earlier tags are suggested as I type.
2. **As the user**, I can still fix the tags when I save the session.
3. **As the user**, I set my focus, short-break and long-break lengths and how often the long break comes, on the Ayarlar page.
4. **As the user**, after saving a focus session I start a break (or skip it); every fourth one is a long break.
5. **As the user**, a break counts down like a focus session (pause, sidebar, survives reload), tells me when it is over, and never shows up in my log or progress.

## Business and technical rules

### Tags

- Normalization (C# `Tags.Normalize`, TypeScript `normalizeTag`): trim; remove leading `#` characters; lower-case (invariant); remove U+0307; replace runs of whitespace with `-`.
- Valid tag: 1–30 characters, only letters, digits, `-` and `_`. At most 10 tags per session; duplicates (after normalization) are dropped, order kept.
- `SessionInput.tags` (optional, default empty). Errors under `tags`: "Etiketler en fazla 30 karakter olabilir ve yalnızca harf, rakam, - ve _ içerebilir." / "En fazla 10 etiket eklenebilir."
- `GET /api/sessions/tags` → all tags used in sessions, most used first, ties alphabetically.

### Settings

- `PomodoroSettings(focusMinutes = 25, shortBreakMinutes = 5, longBreakMinutes = 15, longBreakInterval = 4)`.
- Rules (messages under the field name): focus 1–120 ("Odak süresi 1 ile 120 dakika arasında olmalı."), short break 1–60, long break 1–60, interval 2–10 ("Uzun mola aralığı 2 ile 10 arasında olmalı.").
- `GET /api/settings` → `{ pomodoro: {…} }` (defaults when missing). `PUT /api/settings/pomodoro` with the four values → `200` with the saved values, or `400`.
- `Modules/Settings/` with `SettingsService` and `SettingsController`.

### Electron

- `pomodoro.scheduleEnd(endsAt, title, body)`; main checks `title` (string, at most 100 characters) as well. The notifier passes both to `notify(title, body)`.

### Renderer

- Timer state gains `kind: 'focus' | 'shortBreak' | 'longBreak'` and `tags: string[]`; stored timers from earlier phases without them load as focus with no tags.
- `PomodoroProvider.start(goal, projectId, tags, durationMs)` and `startBreak(kind, durationMs)` (a break keeps the last focus session's goal for display); `cycle`, `recordCompletedFocus()` and `resetCycle()` (stored).
- Notification: focus → title "Odak süresi bitti", body = goal title; break → title "Mola bitti", body "Yeni odak oturumuna hazırsın."
- Pomodoro page:
  - Loads settings with goals and projects (defaults if settings fail); the idle clock shows the focus length.
  - `TagInput` ("Etiketler (isteğe bağlı)"): Enter, comma or space adds the typed tag; chips show `#tag` with a remove button ("#tag etiketini kaldır"); Backspace in an empty field removes the last one; invalid input shows the rule; suggestions with `<datalist>` from `GET /api/sessions/tags` (minus chosen ones). Disabled while a session exists.
  - The save form shows a `TagInput` with the session's tags.
  - After saving a completed focus session: `recordCompletedFocus()`, then "Molaya başla (N dk)" / "Uzun molaya başla (N dk)" and "Molayı atla". Skipping a long break resets the cycle.
  - During a break: heading text "Mola" (or "Uzun mola"), the clock, "Duraklat"/"Devam et", "Molayı bitir" (back to idle, nothing saved). Break finished: "Mola bitti." and "Tamam" (back to idle). Pickers stay as they were.
- Sidebar: during a break the label says "Mola kalan süre MM:SS".
- Ayarlar page: section "Pomodoro süreleri" with four number fields ("Odak (dk)", "Kısa mola (dk)", "Uzun mola (dk)", "Uzun mola her … oturumda"), "Kaydet", field errors, and "Kaydedildi." on success.

## Out of scope

| Item | Where it goes |
|---|---|
| Automatically starting the next focus session after a break | Not planned |
| Editing tags of saved sessions, tag management page | Not planned for the MVP |
| Tag colors | Not planned |
| Sound settings | Not planned (silent notifications) |
| Reminder times in settings | Phase 7.2 |

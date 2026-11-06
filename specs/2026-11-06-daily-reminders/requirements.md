# Requirements — Phase 7.2 Daily reminders

**Roadmap phase:** 7.2 Daily reminders (Milestone 7 — MVP polish and release)
**Branch:** `claude/milestone-7-3aa8fa` (Milestone 7 worktree, with `main` merged in: Milestones 5 and 6 are on it)
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

The user sets a daily English reminder time and a daily tech reminder time in Ayarlar, and can turn each off. While the app runs (also minimized), the main process shows one quiet OS notification at each time; clicking it opens İngilizce or Öğrenme. The Ana Sayfa "Hatırlatmalar" card shows the saved times instead of the fixed defaults.

## Scope

- **API** (`Modules/Settings/`): a `reminders` section in `settings.json`, returned by `GET /api/settings` and saved with `PUT /api/settings/reminders`.
- **Main process**: `electron/reminders.ts` (next-trigger calculation and a scheduler) wired in `main.ts`; main reads the reminders from the API itself.
- **Preload**: `reminders.refresh()` (additive).
- **Renderer**: `ReminderSettingsForm` in Ayarlar; `RemindersCard` reads the settings.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Branch | **`main` merged into the Milestone 7 branch** before this phase (commit `chore: merge main into milestone 7`), so the real İngilizce / Öğrenme modules and the home card are here. |
| Tech module | The tech reminder opens **Öğrenme** (`/learning`); the English one opens **İngilizce** (`/english`). |
| Defaults | **English 09:00, tech 20:00, both on** (the same times the home card shows today). |
| Missed times | **No catch-up.** A time that passed while the app was closed is not notified; the next one is tomorrow. The home card already shows it as "geçti". |

## User stories

1. **As the user**, I set "İngilizce 08:30" and "Teknik 21:00" in Ayarlar and get a quiet notification at each time.
2. **As the user**, I turn the tech reminder off on busy weeks.
3. **As the user**, I click the English notification and land in İngilizce, even when the window was minimized.
4. **As the user**, I see my reminder times on Ana Sayfa.

## Business and technical rules

### Storage and API

- `settings.json` gets a `reminders` section: `{ "english": { "time": "09:00", "enabled": true }, "tech": { "time": "20:00", "enabled": true } }`. No `schemaVersion` change: a missing or unreadable section (or a reminder in it) gives the defaults, as the pomodoro section does.
- `GET /api/settings` → `{ pomodoro, reminders }`.
- `PUT /api/settings/reminders` with `{ english: { time, enabled }, tech: { time, enabled } }`. Both reminders and both fields are required. `time` is `HH:MM`, 24-hour, `00:00`–`23:59`. Errors: `english` / `tech` → "Saat SS:DD biçiminde olmalı (00:00–23:59)." Other sections of the file are kept.

### Scheduling (`electron/reminders.ts`)

- `nextTrigger(time, now)`: the next local date-time at `time` strictly after `now` — today if it is still ahead, otherwise tomorrow. Built with local `Date` fields, so daylight saving changes keep the wall-clock time.
- `createReminderScheduler(deps)`: `update(reminders)` cancels every timer and sets one per enabled reminder at its `nextTrigger`. When a timer fires it notifies, then schedules the same reminder for the next day. A timer that fires more than 5 minutes late (the PC was asleep) does not notify (no catch-up), it only schedules the next one.
- Main loads the reminders with `GET /api/settings` (its own base URL and token) after the API starts, after the data folder changes, and when the renderer calls `reminders.refresh()` (after a save in Ayarlar). A failed or malformed answer keeps the reminders that were scheduled before (none at start). Main checks the answer's shape (two reminders, `HH:MM`, boolean).
- The notification is silent. English: title "İngilizce zamanı", body "Bugünkü İngilizce çalışmana başla." Tech: "Teknik çalışma zamanı", "Öğrenme'de bugünkü konuna geç." Clicking restores and focuses the window and sends `devpath:open-page` with `/english` or `/learning` (the pomodoro notification's click code is shared).

### Renderer

- Ayarlar → "Hatırlatmalar" section (after the pomodoro section): per reminder a checkbox ("İngilizce hatırlatma", "Teknik hatırlatma") and an `<input type="time">` ("İngilizce saati", "Teknik saati"); the time stays editable when off. "Kaydet" saves, shows "Kaydedildi." and calls `window.devpath.reminders.refresh()` (a failed refresh is ignored); field errors show under the field.
- Ana Sayfa "Hatırlatmalar": the enabled reminders from `GET /api/settings`, sorted by time with the same status words; nothing while loading; the defaults when loading fails; "Hatırlatmalar kapalı." when both are off. The footer line links to Ayarlar ("Saatleri Ayarlar'dan değiştir.").

## Out of scope

| Item | Where it goes |
|---|---|
| Reminders when the app is not running (Windows scheduled toasts, start with Windows, tray) | Not planned for the MVP |
| Snooze, per-weekday times, more reminder kinds | Not planned |
| A sound | Not planned (calm by default) |

# Plan — Phase 7.2 Daily reminders

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Work on the Milestone 7 branch `claude/milestone-7-3aa8fa`, which already has `main` merged in.

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Reminder settings in the API

**Commit:** `feat(settings): store reminder times`

- `Modules/Settings/ReminderSettings.cs` (records, defaults, input); `SettingsService` reads and saves the section; `AppSettings` gets `Reminders`; `PUT /api/settings/reminders`.
- `SettingsServiceTests.cs` (T1–T3), `SettingsEndpointTests.cs` (T4).
- Check: `npm run check`.

### 2. Next trigger and scheduler

**Commit:** `feat(reminders): compute the next reminder time`

- `electron/reminders.ts`: `nextTrigger`, `parseReminders`, `createReminderScheduler`.
- `electron/reminders.test.ts` (T5–T8).
- Check: `npm run check`.

### 3. Notifications from main

**Commit:** `feat(reminders): notify at reminder times`

- `main.ts`: load the reminders from the API at start, after a data folder change and on `devpath:reminders-refresh`; one notification helper for pomodoro and reminders. Preload `reminders.refresh()`; `DevPathBridge` type.
- Check: `npm run check`.

### 4. Settings form

**Commit:** `feat(settings): edit reminder times`

- Types `ReminderSettings`, `saveReminderSettings`; fake API route; `ReminderSettingsForm.tsx` in `SettingsPage`.
- `client.test.ts` (T9), `ReminderSettingsForm.test.tsx` (T10–T11).
- Check: `npm run check`.

### 5. Home card

**Commit:** `feat(home): show the reminder times from settings`

- `RemindersCard` reads `getSettings()`; `reminders.ts` maps the settings to the list.
- `HomePage.test.tsx` (T12–T13).
- Check: `npm run check`; manual M1–M5.

### 6. Docs

**Commit:** `docs: document daily reminders`

- `specs/tech-stack.md`: the `reminders` section, endpoint, scheduler and preload function.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 7.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 7.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Do not merge into `main` and do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(settings): store reminder times` |
| 2 | `feat(reminders): compute the next reminder time` |
| 3 | `feat(reminders): notify at reminder times` |
| 4 | `feat(settings): edit reminder times` |
| 5 | `feat(home): show the reminder times from settings` |
| 6 | `docs: document daily reminders` |
| 7 | `docs(roadmap): mark phase 7.2 done` |

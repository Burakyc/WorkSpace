# Plan — Phase 2.3 Tags and timer settings

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/2.3-tags-timer-settings
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Tag normalization on sessions

**Commit:** `feat(pomodoro): normalize and validate session tags`

- `Modules/Pomodoro/Tags.cs` (`Normalize`, `NormalizeAll` with errors); `SessionInput.Tags`; `SessionService` stores normalized tags.
- `TagsTests.cs` (T1–T4), `SessionServiceTests.cs` (T5).
- Check: `npm run check`.

### 2. Previously used tags

**Commit:** `feat(pomodoro): list previously used tags`

- `SessionService.ListTagsAsync`, `GET /api/sessions/tags`.
- Tests T6–T7.
- Check: `npm run check`.

### 3. Pomodoro settings in `settings.json`

**Commit:** `feat(settings): store pomodoro durations in settings.json`

- `Modules/Settings/PomodoroSettings.cs`, `SettingsService.cs`, `SettingsController.cs`, `SettingsModule.cs`.
- `SettingsServiceTests.cs` (T8–T10), `SettingsEndpointTests.cs` (T11).
- Check: `npm run check`.

### 4. API client

**Commit:** `feat(desktop): add tag and settings requests to the api client`

- Types (`PomodoroSettings`, `SessionInput.tags`), `listTags`, `getSettings`, `savePomodoroSettings`; the fake API serves them.
- `client.test.ts`: T12.
- Check: `npm run check`.

### 5. Notification title

**Commit:** `feat(desktop): pass the notification title from the renderer`

- `scheduleEnd(endsAt, title, body)` in preload, types, main and the notifier.
- `sessionNotifier.test.ts`: T13.
- Check: `npm run check`.

### 6. Durations on the Ayarlar page

**Commit:** `feat(settings): edit pomodoro durations`

- `src/modules/settings/PomodoroSettingsForm.tsx` in the Settings page.
- Tests T14–T15.
- Check: `npm run check`.

### 7. Tags on the Pomodoro page

**Commit:** `feat(pomodoro): choose tags with suggestions`

- `src/modules/pomodoro/tags.ts` (+ test T16), `TagInput.tsx` (+ test T17), timer `tags` (parse with default), start with tags, save form with tags.
- `PomodoroPage.test.tsx`: T18–T19.
- Check: `npm run check`.

### 8. Configured focus length

**Commit:** `feat(pomodoro): use the configured focus length`

- Page loads settings; idle clock and start use `focusMinutes`.
- Test T20.
- Check: `npm run check`.

### 9. Breaks

**Commit:** `feat(pomodoro): offer short and long breaks`

- Timer `kind`, `startBreak`, cycle in the provider; break UI; notification titles; sidebar label.
- Tests T21–T26.
- Check: `npm run check`; manual M1–M8.

### 10. Docs

**Commit:** `docs: document tags, timer settings and breaks`

- `specs/tech-stack.md`: tag rules, `GET /api/sessions/tags`, `settings.json` shape and endpoints, break cycle, notification title.

### 11. Close the phase

**Commit:** `docs(roadmap): mark phase 2.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 2.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/2.3-tags-timer-settings` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(pomodoro): normalize and validate session tags` |
| 2 | `feat(pomodoro): list previously used tags` |
| 3 | `feat(settings): store pomodoro durations in settings.json` |
| 4 | `feat(desktop): add tag and settings requests to the api client` |
| 5 | `feat(desktop): pass the notification title from the renderer` |
| 6 | `feat(settings): edit pomodoro durations` |
| 7 | `feat(pomodoro): choose tags with suggestions` |
| 8 | `feat(pomodoro): use the configured focus length` |
| 9 | `feat(pomodoro): offer short and long breaks` |
| 10 | `docs: document tags, timer settings and breaks` |
| 11 | `docs(roadmap): mark phase 2.3 done` |

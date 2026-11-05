# Plan — Phase 2.1 Timer with a goal

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/2.1-pomodoro-timer
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Timer math

**Commit:** `feat(pomodoro): add timer math`

- `src/modules/pomodoro/timer.ts` with the types and functions from requirements.md, and `FOCUS_MINUTES = 25`.
- `timer.test.ts`: T1–T8.
- Check: `npm run check`.

### 2. Session-end notification in main

**Commit:** `feat(desktop): notify when a focus session ends`

- `electron/sessionNotifier.ts` (+ `sessionNotifier.test.ts`, T9–T11 with fake timers).
- `electron/main.ts`: `setAppUserModelId`, IPC handlers with argument checks, `Notification` with click → focus + `devpath:open-page`.
- `electron/preload.ts` and `DevPathBridge`: `pomodoro.scheduleEnd`, `pomodoro.cancelEnd`, `onOpenPage`.
- Check: `npm run check`; manual M7.

### 3. Pomodoro context

**Commit:** `feat(pomodoro): keep the active timer in a context`

- `src/modules/pomodoro/PomodoroContext.tsx` (`PomodoroProvider`, `usePomodoro`); wrapped around the layout in `AppRoutes`.
- `PomodoroContext.test.tsx`: T12–T15 (fake timers, `localStorage`, bridge stub).
- Check: `npm run check`.

### 4. Start a session with a goal

**Commit:** `feat(pomodoro): start a session with a goal and project`

- `src/modules/pomodoro/PomodoroPage.tsx` + CSS: pickers, clock, "Başlat"; empty state; route table entry.
- `PomodoroPage.test.tsx`: T16–T19.
- Check: `npm run check`.

### 5. Pause, resume, stop and finish

**Commit:** `feat(pomodoro): pause, resume, stop and finish a session`

- Buttons and states from requirements.md.
- `PomodoroPage.test.tsx`: T20–T23.
- Check: `npm run check`.

### 6. Sidebar timer and opening the page from the notification

**Commit:** `feat(pomodoro): show the running timer in the sidebar`

- `AppLayout`: remaining time next to "Pomodoro"; `onOpenPage` → navigate.
- `AppLayout.test.tsx`: T24–T25.
- Check: `npm run check`; manual M1–M8.

### 7. Docs

**Commit:** `docs: document the pomodoro timer`

- `specs/tech-stack.md`: timer state machine and persistence key, notification bridge (`pomodoro.*`, `onOpenPage`), AUMID, silent notification.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 2.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 2.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/2.1-pomodoro-timer` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(pomodoro): add timer math` |
| 2 | `feat(desktop): notify when a focus session ends` |
| 3 | `feat(pomodoro): keep the active timer in a context` |
| 4 | `feat(pomodoro): start a session with a goal and project` |
| 5 | `feat(pomodoro): pause, resume, stop and finish a session` |
| 6 | `feat(pomodoro): show the running timer in the sidebar` |
| 7 | `docs: document the pomodoro timer` |
| 8 | `docs(roadmap): mark phase 2.1 done` |

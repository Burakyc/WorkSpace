# Requirements — Phase 2.1 Timer with a goal

**Roadmap phase:** 2.1 Timer with a goal (Milestone 2 — Pomodoro)
**Branch:** `feat/2.1-pomodoro-timer`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The Pomodoro page runs a 25-minute focus timer that always belongs to a goal (and optionally one of its projects). The timer can be paused, resumed and stopped, stays accurate while the window is hidden or minimized, survives a reload or restart, and is visible from every page. When it ends, Electron main shows a calm OS notification. Saving sessions comes in phase 2.2; durations become settings in phase 2.3.

## Scope

- Pure timer math in the renderer (`src/modules/pomodoro/timer.ts`).
- A `PomodoroProvider` context that owns the active timer, ticks it, persists it and schedules the notification.
- The Pomodoro page: goal and project pickers, the clock, Start / Pause / Resume / Stop, the finished state.
- The remaining time next to "Pomodoro" in the sidebar.
- Electron main: a session-end notifier (schedule, cancel, click → open the Pomodoro page) behind the preload bridge.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Persistence | **Kept across reload and restart**: the active timer is stored in `localStorage` (`devpath.pomodoro`). On load a running timer continues; if its end time has passed, it is shown as finished. Invalid stored data is ignored. |
| Visibility | **Page and sidebar**: the Pomodoro page shows the big clock; the sidebar shows the remaining time next to "Pomodoro" on every page (hidden with the labels below 900 px). |
| Notification | **Silent**; title "Odak süresi bitti", body = the goal title; clicking it restores and focuses the window and opens the Pomodoro page. |
| Lock | **Goal and project are locked** while a session runs or is paused; they can be changed only when idle. |
| Duration | 25 minutes, one constant (`FOCUS_MINUTES`) until phase 2.3 makes it a setting. |
| Stop | Stopping returns to idle and cancels the notification. Saving a stopped-early session comes in phase 2.2. |
| Finished | When the time is up, the page shows "Süre doldu." and "Yeni oturum" (back to idle with the same goal and project). Phase 2.2 adds the note field and saving here. |
| Notification id | `app.setAppUserModelId('com.devpath.workspace')` only when packaged (the installer's Start menu shortcut carries that id); unpackaged runs keep Electron's default id, which Windows already knows. Changed during M7: the plan set the custom id in development too; Windows' notification history showed toasts under both ids, but only the default id is backed by a registered app in development (commit `fix(desktop): keep electron's default notification id in development`). |

## User stories

1. **As the user**, I pick a goal (and optionally a project of that goal) and start a 25-minute focus session; without a goal, Start is disabled.
2. **As the user**, I pause and resume, or stop, the session.
3. **As the user**, the remaining time is right even after the window was minimized, hidden or reloaded, and even after restarting the app.
4. **As the user**, I see the remaining time in the sidebar while I use other pages.
5. **As the user**, I get one quiet Windows notification when the time is up, and clicking it brings me to the Pomodoro page.

## Business and technical rules

### Timer math (`timer.ts`, pure, times in epoch ms)

```ts
type TimerState =
  | { status: 'idle' }
  | { status: 'running'; goalId; projectId: string | null; startedAt; durationMs; endsAt }
  | { status: 'paused';  goalId; projectId; startedAt; durationMs; remainingMs }
  | { status: 'finished'; goalId; projectId; startedAt; durationMs; endedAt };
```

- `startTimer(goalId, projectId, durationMs, now)` → running with `startedAt = now`, `endsAt = now + durationMs`.
- `remainingMs(state, now)`: running → `max(0, endsAt − now)`; paused → `remainingMs`; finished → 0; idle → 0.
- `pauseTimer(running, now)` → paused with the remaining time; `resumeTimer(paused, now)` → running with `endsAt = now + remainingMs`.
- `advance(state, now)`: a running timer whose `endsAt ≤ now` becomes finished with `endedAt = endsAt`; anything else is returned unchanged.
- `focusedMs(state, now)` = `durationMs − remainingMs(state, now)` (time actually focused, pauses excluded; used by phase 2.2).
- `formatClock(ms)` → `MM:SS`, seconds rounded **up** (shows 25:00 at the start and 00:01 in the last second).
- `parseStoredTimer(value: unknown): TimerState` validates stored data field by field; anything invalid → idle.

### `PomodoroProvider` (`src/modules/pomodoro/PomodoroContext.tsx`)

- Wraps the app inside the router. Exposes `{ state, now, start(goal, projectId), pause(), resume(), stop(), reset() }`.
- Loads the stored timer once (then `advance(…, Date.now())`); saves every change to `localStorage` (errors ignored).
- While running: a 250 ms interval updates `now` and applies `advance`; the interval stops when not running. Hidden windows are throttled, but every tick recomputes from `Date.now()`, so the time stays right.
- Notification: start, resume and load-while-running call `window.devpath.pomodoro.scheduleEnd(endsAt, goalTitle)`; pause, stop and reset call `cancelEnd()`. Main replaces any earlier schedule, so calling it again is safe. Bridge errors are ignored (the timer itself never depends on main).

### Pomodoro page

- Loads active goals and projects. No active goal → empty state "Pomodoro başlatmak için önce bir hedef oluştur." with a link "Hedeflere git".
- Pickers: "Hedef" `<select>` (placeholder "Hedef seç", required) and "Proje (isteğe bağlı)" `<select>` ("Proje yok" + the selected goal's active projects). Changing the goal clears the project. Both disabled unless idle; while a session exists they show its goal and project.
- Clock: `<p role="timer" aria-label="Kalan süre">MM:SS</p>`, large monospace; idle shows `25:00`.
- Buttons: idle → "Başlat" (disabled without a goal); running → "Duraklat", "Durdur"; paused → "Devam et", "Durdur" and the text "Duraklatıldı"; finished → "Süre doldu." and "Yeni oturum".
- If the session's goal is no longer active (archived elsewhere), the session still runs and shows the goal title it started with (stored in the timer state as `goalTitle`).

### Sidebar

- While running or paused, the "Pomodoro" link shows the remaining time (`<span>` with `aria-label="Kalan süre MM:SS"`); paused adds "(duraklatıldı)" to the label. Nothing when idle or finished.

### Electron main

- `electron/sessionNotifier.ts`: `createSessionNotifier({ setTimer, clearTimer, now, notify })` with `schedule(endsAt, body)` and `cancel()`. A new schedule replaces the old one; an `endsAt` in the past notifies at once.
- IPC `devpath:pomodoro-schedule-end(endsAt, body)`: `endsAt` must be a finite number at most 24 h ahead, `body` a string of at most 200 characters; otherwise rejected. `devpath:pomodoro-cancel-end()`.
- `notify(body)` shows `new Notification({ title: 'Odak süresi bitti', body, silent: true })`; on click: restore and focus the main window and send `devpath:open-page` with `/pomodoro`.
- Preload adds `pomodoro.scheduleEnd`, `pomodoro.cancelEnd` and `onOpenPage(callback)` (returns an unsubscribe function); `AppLayout` navigates when it fires.

## Out of scope

| Item | Where it goes |
|---|---|
| Saving sessions, the note field, stopped-early sessions | Phase 2.2 |
| Tags, timer settings, breaks | Phase 2.3 |
| Global shortcut to start/stop | Phase 7.1 |
| Window title or taskbar progress | Not planned |
| Sound | Not planned (decided: silent) |

# Validation — Phase 2.1 Timer with a goal

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 2.1, plus the decisions in [requirements.md](requirements.md):

- [x] Pomodoro page: choose a goal (required) and a project (optional, filtered by the goal), then start; Start is disabled without a goal.
- [x] Start, pause, resume and stop; the remaining time is derived from the stored times, so it stays accurate while minimized or hidden.
- [x] The timer survives a reload and an app restart; a timer that ended meanwhile shows as finished.
- [x] Goal and project are locked while a session runs or is paused.
- [x] The sidebar shows the remaining time on every page.
- [x] Main shows one silent OS notification when the session ends; clicking it opens the Pomodoro page.
- [x] Tests: timer math (Vitest) and Start disabled without a goal (RTL), plus the tests below.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Start | `src/modules/pomodoro/timer.test.ts` | Running, `endsAt = now + duration`, remaining = duration |
| T2 | Remaining while running | same | Decreases with `now`; never below 0 |
| T3 | Pause and resume | same | Paused keeps the remainder however long it waits; resume sets a new `endsAt` |
| T4 | Advance | same | Running past `endsAt` → finished with `endedAt = endsAt`; other states unchanged |
| T5 | Focused time | same | Pauses do not count: 10 min run + pause + 5 min run → 15 min |
| T6 | Clock text | same | 25 min → "25:00"; 1 ms → "00:01"; 0 → "00:00"; 61 s → "01:01" |
| T7 | Stored data | same | Valid running/paused/finished objects parse; missing fields, wrong types, unknown status, `null`, strings → idle |
| T8 | Round trip | same | `parseStoredTimer(JSON.parse(JSON.stringify(state)))` equals `state` |
| T9 | Schedule | `electron/sessionNotifier.test.ts` | Notifies once at `endsAt` with the body |
| T10 | Replace and cancel | same | A new schedule replaces the old (one notification); cancel → none |
| T11 | Past end | same | `endsAt` in the past notifies at once |
| T12 | Start schedules | `src/modules/pomodoro/PomodoroContext.test.tsx` | `start` → `scheduleEnd(endsAt, goal title)` and stored in `localStorage` |
| T13 | Pause/stop cancel | same | `pause` and `stop` call `cancelEnd`; resume schedules again |
| T14 | Finishes on time | same | With fake timers, after 25 min the state is finished |
| T15 | Restore | same | A stored running timer continues; a stored one past its end loads as finished; garbage loads as idle |
| T16 | Start disabled without a goal | `src/modules/pomodoro/PomodoroPage.test.tsx` | "Başlat" disabled until a goal is chosen |
| T17 | Projects filtered | same | The project list shows only the chosen goal's active projects; changing the goal clears the project |
| T18 | Start | same | After "Başlat": clock counts down from 25:00, pickers disabled, "Duraklat" and "Durdur" shown |
| T19 | No goals | same | Empty state with "Hedeflere git" link |
| T20 | Pause and resume | same | "Duraklat" → "Duraklatıldı", clock frozen; "Devam et" → counts again |
| T21 | Stop | same | "Durdur" → idle, clock 25:00, pickers enabled with the same goal |
| T22 | Finish | same | After 25 min: "Süre doldu." and "Yeni oturum"; "Yeni oturum" → idle |
| T23 | Locked session goal | same | A restored running session shows its goal even if it is no longer active |
| T24 | Sidebar time | `src/app/AppLayout.test.tsx` | Running → "Kalan süre MM:SS" next to Pomodoro; idle → nothing |
| T25 | Open page | same | `onOpenPage('/pomodoro')` callback navigates to the Pomodoro page |

## Manual test steps

Run `npm run dev` from the repo root with at least one goal that has a project.

| ID | Step | Expected |
|---|---|---|
| M1 | Open Pomodoro without choosing a goal | "Başlat" disabled |
| M2 | Choose the goal, then its project; choose another goal | Project list follows the goal; changing goal clears the project |
| M3 | "Başlat" | Clock counts down from 25:00; pickers disabled; sidebar shows the time |
| M4 | Go to another page and back | The sidebar keeps counting; the page shows the right time |
| M5 | Minimize the window for 2 minutes, restore | The clock is about 2 minutes lower (not paused by throttling) |
| M6 | Pause for 30 s, resume; reload the window (Ctrl+R); close and restart the app | Remaining time unchanged across pause; running continues after reload and restart |
| M7 | In DevTools: `await window.devpath.pomodoro.scheduleEnd(Date.now() + 5000, 'Test')`; minimize; wait; click the notification | One silent "Odak süresi bitti" notification with "Test" (checked in the Windows notification history); clicking it restores the window on the Pomodoro page (the click itself is covered by T25 and checked by hand) |
| M8 | "Durdur" | Back to idle; no notification arrives later |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M8 done with the expected results
- [x] `roadmap.md` phase 2.1 ticked and set to `done`

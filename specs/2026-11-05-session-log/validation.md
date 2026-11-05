# Validation — Phase 2.2 Session log

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 2.2, plus the decisions in [requirements.md](requirements.md):

- [x] When a focus session ends, an optional note field appears; "Kaydet" writes the session to `sessions.json`.
- [x] The API rejects sessions without an existing `goalId` (and projects of another goal, bad times, bad durations, long notes).
- [x] Stopped-early sessions are saved with their real focused minutes and `completed: false`; under 1 minute nothing is saved; only completed sessions count toward progress.
- [x] Goal progress from 1.2 updates after a session, and the Pomodoro page shows it.
- [x] A failed save keeps the timer and shows an error.
- [x] Tests: `SessionService` validation and progress update, plus the tests below.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Save | `Modules/Pomodoro/SessionServiceTests.cs` | GUID id, UTC times, trimmed note, `tags: []`; in `sessions.json` |
| T2 | Goal required and existing | same | Missing → "Hedef gerekli."; unknown → "Hedef bulunamadı."; nothing saved |
| T3 | Archived goal | same | Allowed |
| T4 | Project | same | Unknown → "Proje bulunamadı."; another goal's → "Proje bu hedefe ait değil." |
| T5 | Times | same | Missing, end before start, end more than 1 min ahead → error |
| T6 | Duration | same | 0, 601, more than the start–end span → error; 25 for a 25-min span → ok |
| T7 | Note | same | Empty → `null`; 500 ok; 501 → error |
| T8 | Completed required | same | Missing → error |
| T9 | Progress update | same | After one completed and one stopped session, `GoalService.ListProgressAsync` → 1 completed session, its minutes only |
| T10 | `POST /api/sessions` | `Modules/Pomodoro/SessionsEndpointTests.cs` | `201`, `Location`, camelCase body with `tags: []` |
| T11 | Invalid | same | Unknown goal → `400` with `errors.goalId` |
| T12 | Progress endpoint | same | After a completed session, `/api/goals/progress` shows it |
| T13 | Client | `src/shared/api/client.test.ts` | `createSession` → `POST /api/sessions` with the JSON body |
| T14 | Progress text | `src/modules/goals/progressText.test.ts` | "7 / 20 pomodoro · %35"; "3 pomodoro · 1 sa"; zeros |
| T15 | Save finished | `src/modules/pomodoro/PomodoroPage.test.tsx` | After 25 min: note + "Kaydet" → body has `completed: true`, 25 min, the note; back to idle; "Kaydedildi · Learn ASP.NET Core: 1 / 20 pomodoro · %5" |
| T16 | Save without note | same | Empty note → `note: null` |
| T17 | Failed save | same | API error → stays finished, alert "Oturum kaydedilemedi. Tekrar dene."; "Kaydet" again works |
| T18 | Stop after 10 min | same | `completed: false`, 10 min, `endedAt` = now; idle; feedback shows the unchanged count |
| T19 | Stop under 1 min | same | No request; idle |
| T20 | Stop fails | same | Timer keeps running; alert shown |

## Manual test steps

Run `npm run dev` with at least one goal (target 20) and a project. To save time, M1 uses a shorter session through DevTools.

| ID | Step | Expected |
|---|---|---|
| M1 | Start a session; in DevTools move the stored timer so it ends 3 s from now and reload: `const t = JSON.parse(localStorage.getItem('devpath.pomodoro')); t.startedAt = Date.now() + 3000 - t.durationMs; t.endsAt = Date.now() + 3000; localStorage.setItem('devpath.pomodoro', JSON.stringify(t)); location.reload()` (both times move, so the 25-minute span stays valid for the API) | After ~3 s: "Süre doldu.", the note field and "Kaydet" |
| M2 | Type a note, "Kaydet" | Back to idle; "Kaydedildi · <goal>: 1 / 20 pomodoro · %5"; `sessions.json` has the session with the note and `completed: true` |
| M3 | Open Hedefler | The goal card shows "1 / 20 pomodoro · %5" |
| M4 | Start, wait just over 1 minute, "Durdur" | Saved with `completed: false` and 1 minute; the goal's progress unchanged |
| M5 | Start, "Durdur" within a few seconds | Nothing added to `sessions.json` |
| M6 | `curl.exe` `POST /api/sessions` with an unknown `goalId` | `400` with "Hedef bulunamadı." |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M6 done with the expected results
- [x] `roadmap.md` phase 2.2 ticked and set to `done`

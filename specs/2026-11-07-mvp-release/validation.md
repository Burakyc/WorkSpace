# Validation — Phase 7.4 MVP release

The release is done when every acceptance criterion is checked, `npm run check` passes and every smoke step gives the expected result on the installed app.

## Acceptance criteria

From `roadmap.md` phase 7.4:

- [x] All four README scenarios work in the installed app except "Preparing a post" (post-MVP).
- [x] Manual smoke checklist on a fresh install: first run creates the data folder, every module's empty state, offline start.
- [x] Startup under 3 seconds; timer accurate after 25 minutes minimized.
- [x] Contrast checked in light and dark themes; full keyboard navigation.
- [x] Tag `v0.1.0` (after the user's yes).

## Automated tests

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Version | `Modules/System/HealthEndpointTests.cs` | `/api/health` → `0.1.0` |
| T2 | Contrast | `src/shared/ui/tokens.test.ts` | Every pair in requirements.md meets its ratio in light and dark |

## Smoke checklist (installed app)

| ID | Step | Expected |
|---|---|---|
| S1 | Install `DevPath Setup 0.1.0.exe` silently, start DevPath from the Start menu shortcut | Window opens; `%APPDATA%\DevPath\data` is created; "API: bağlı" |
| S2 | Open every module | Ana Sayfa cards and each empty state (Hedefler, Pomodoro, Takvim, Notlar, İngilizce, Öğrenme, Mülakat) say what to do next; Ayarlar shows every section |
| S3 | Startup time, three starts | Each under 3 s to "API: bağlı" |
| S4 | *Study session*: goal "Learn ASP.NET Core", project "Todo API", tag `#di`, pomodoro, note at the end | Session in the calendar and in the goal's progress |
| S5 | *Adding content*: Mülakat → "Promptu kopyala", paste a valid interview JSON | Validated; question cards appear |
| S6 | *Looking back*: a session and a note on last Tuesday, open that day in Takvim | Count, goal and notes shown |
| S7 | Timer: 25-minute focus session, window minimized | Finishes on time (±2 s); "Odak süresi bitti" notification |
| S8 | Offline start (`HTTPS_PROXY=http://127.0.0.1:9`) with a YouTube channel and a GitHub user set | App starts; Ana Sayfa shows error cards, nothing blocks |
| S9 | Keyboard: Tab from the start through the sidebar and into a page; `?`, Escape; `Ctrl+Shift+D` | Focus ring visible on every stop; dialogs close; panel opens |
| S10 | Light and dark (OS theme emulated) | Screens readable; T2 passes |
| S11 | Reminder and backup | A reminder set 2 minutes ahead notifies; a daily backup folder exists |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] S1–S11 done with the expected results; test data removed
- [x] `roadmap.md` phase 7.4 ticked and set to `done`

# Requirements — Phase 2.2 Session log

**Roadmap phase:** 2.2 Session log (Milestone 2 — Pomodoro)
**Branch:** `feat/2.2-session-log`
**Estimate:** 2 days at 1–2 hours/day

## Goal

Focus sessions are written to `sessions.json`. A finished session is saved with an optional note; a session stopped early is saved with its real focused minutes and `completed: false`. The API rejects sessions without an existing goal. After saving, the Pomodoro page shows the goal's updated progress, and the progress from phase 1.2 (completed sessions only) moves.

## Scope

- **API** (`Modules/Pomodoro/`): `SessionInput`, `SessionValidator` checks, `SessionService.CreateAsync`, `POST /api/sessions`.
- **Renderer**: `createSession` in the API client; the Pomodoro page saves finished and stopped sessions and shows the progress line.
- A shared progress text helper used by the goal cards and the Pomodoro page.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Saving a finished session | **Note field + "Kaydet"**: the finished state shows "Not (isteğe bağlı)" and "Kaydet" (one click; the note may be empty). The finished timer is already persisted (phase 2.1), so a session is never lost if the app closes before saving. |
| Stopped early | **Saved at once** with the focused minutes (pauses excluded, rounded down) and `completed: false`. Under 1 focused minute the session is not saved (accidental starts). |
| Feedback | After saving, the page shows "Kaydedildi · <goal>: 3 / 20 pomodoro · %15" (or "· 3 pomodoro · 1 sa" without a target) until the next session starts. |
| Failed save | The timer stays as it was (finished, or still running/paused for "Durdur") and the page shows "Oturum kaydedilemedi. Tekrar dene." in `role="alert"`, so the user can retry; field errors (note) show under the field. |
| Archived goal | A session may be saved for a goal that was archived while it ran (the goal still exists). |
| Tags | Always `[]` in this phase; phase 2.3 adds them. |
| Session ids | Set by the API (GUID), like goals and projects. |

## User stories

1. **As the user**, when the time is up I write a short note (or not) and save the session in one click.
2. **As the user**, when I stop early, the minutes I actually focused are still recorded, but they do not count toward the goal's progress.
3. **As the user**, an accidental start that I stop within a minute leaves no trace.
4. **As the user**, right after saving I see how far the goal is now.
5. **As the user**, a session can never be saved for a goal that does not exist, or with a project of another goal.

## Business and technical rules

### `POST /api/sessions`

Body: `{ goalId, projectId?, startedAt, endedAt, durationMinutes, completed, note? }` (times ISO 8601). Result: `201` with the session and `Location: /api/sessions/{id}`; `400` validation problem.

| Field | Rule (message) |
|---|---|
| `goalId` | Required ("Hedef gerekli."); the goal must exist, archived allowed ("Hedef bulunamadı.") |
| `projectId` | Optional; must exist ("Proje bulunamadı.") and belong to the goal ("Proje bu hedefe ait değil.") |
| `startedAt`, `endedAt` | Required; `endedAt ≥ startedAt`; `endedAt` at most 1 minute in the future ("Başlangıç ve bitiş zamanı geçersiz.") |
| `durationMinutes` | 1 to 600 and at most the minutes between start and end, rounded up ("Süre geçersiz.") |
| `completed` | Required boolean ("Tamamlandı bilgisi gerekli.") |
| `note` | Trimmed; empty → `null`; at most 500 characters ("Not en fazla 500 karakter olabilir.") |

- Stored with `tags: []`, in `sessions.json` (phase 1.2 schema). `GET /api/goals/progress` counts it at once when `completed` is true.
- Times are stored as given, converted to UTC.

### Renderer

- `ApiClient.createSession(input: SessionInput): Promise<Session>`; types `SessionInput`, `Session`.
- Finished state: a form "Oturumu kaydet" with a textarea "Not (isteğe bağlı)" (`maxLength` 500) and "Kaydet". Body: `startedAt`, `endedAt` (ISO), `durationMinutes = round(durationMs / 60 000)`, `completed: true`. On success: `reset()` and show the feedback line.
- "Durdur": focused time ≥ 60 000 ms → save first with `endedAt = now`, `durationMinutes = floor(focused / 60 000)`, `completed: false`; on success `stop()` and show the feedback line; on failure keep the timer and show the error. Under 60 000 ms → `stop()` without saving.
- Feedback: after a save, `getGoalProgress()` for the session's goal; the text comes from the shared helper `progressText(progress, targetPomodoros)` (target from the active goal list; if the goal is not active, the count form). Cleared when a new session starts.

## Out of scope

| Item | Where it goes |
|---|---|
| Tags | Phase 2.3 |
| Listing, editing or deleting sessions | Phase 3.2 (day detail) |
| Saving breaks | Not planned (phase 2.3: breaks are not logged) |
| Undo of a save | Not planned |

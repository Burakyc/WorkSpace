# Requirements — Phase 10.2 Study with the teacher

**Roadmap phase:** 10.2 Study with the teacher (Post-MVP — AI teacher)
**Branch:** `feat/10.2-study-with-teacher`
**Estimate:** 2 days at 1–2 hours/day

## Goal

A lesson part has "Bu parçayı çalış". It starts a focus timer with the goal already selected and the lesson's tags, and opens Pomodoro, where the part's content sits next to the timer. When the time is up, the save form has the part's name as the note and a ticked "Bu parçayı tamamlandı işaretle" box. After saving, "Sonraki parça: …" starts the next unfinished part.

## Scope

- **Renderer**:
  - `modules/pomodoro/timer.ts`: timers carry an optional `lessonPart`; `PomodoroContext.start` passes it.
  - `modules/learning/StudyPartForm.tsx`: the goal choice and the start button on the part page.
  - `modules/learning/PartContent.tsx`: body and exercises, shared by the part page and the timer.
  - `modules/learning/StudyPartPanel.tsx`: the part next to the timer.
  - `modules/pomodoro/PomodoroPage.tsx`: the layout, the save form, marking, the next part.
- **API**: no change. Sessions and marks use the existing endpoints.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Goal of a lesson | **Remembered per lesson on this machine.** The part page has a goal select. The chosen goal is kept in `localStorage` (`devpath.learning.goal.<slug>`) and preselected on the lesson's other parts. With no remembered active goal and exactly one active goal, that goal is preselected. A new machine or a cleared storage only means choosing again. No API or file format change. |
| Where the content shows | **On the Pomodoro page.** Two columns with the timer beside the part; one column below 900 px. The part travels with the timer state, so it survives reloads and restarts. |
| Marking | **A ticked box in the save form.** Only a completed session offers it; a session stopped early never marks the part. |
| Next part | "Sonraki parça: <title>", next to the break buttons. It starts the next part after this one that is not done, with the same goal, project and tags. |
| Note | Prefilled with "<lesson> — <part>", editable. |
| Tags | The session starts with the lesson's tags (at most 10). |
| Addition: unreadable lesson | `StudyPartPanel` shows "Parça yüklenemedi." when the lesson read fails, apart from "Parça bulunamadı." for a gone lesson or part. |
| Deviation: test fake | `learning/testing/studyApi.ts` puts the two existing fakes behind one `fetch`, instead of adding goals and settings to `fakeContentApi`. Less change in a shared file. |

## User stories

1. **As the user**, I open a part, press "Bu parçayı çalış", and the timer runs with my goal and the part's content next to it.
2. **As the user**, I read and do the exercises beside the timer; a restart keeps both.
3. **As the user**, when the time is up I save the session with the note and tags already filled, and the part is marked done.
4. **As the user**, I press "Sonraki parça" or take a break first, and the next part is still offered after the break.
5. **As the user**, if I stop early, the part stays unfinished and my real minutes are saved as before.
6. **As the user**, the calendar shows which part I worked on through the session's note.

## Business and technical rules

### Timer

- `LessonPartRef`: `{ slug, partId, topic, title }`. `SessionInfo.lessonPart: LessonPartRef | null`. `startTimer` takes it as the last optional argument. Breaks always have `null`.
- `parseStoredTimer`: a missing `lessonPart` (timers stored earlier) is `null`; a broken one (non-object or a field that is not a string) is `null` and the timer is kept, since a session is worth more than its link.
- Pomodoro rules do not change: a session needs a goal, and the goal stays locked while it runs.

### Part page (`StudyPartForm`, props `lesson`, `part`)

- A goal `<select>` labelled "Hedef" with the active goals, and the button "Bu parçayı çalış", off without a goal. Preselection: the remembered goal if still active, otherwise the only active goal, otherwise none.
- Pressing it remembers the goal, starts a focus timer (`focusMinutes` from the settings, 25 when they fail) with the lesson's first 10 tags and no project, and opens `/pomodoro`.
- With a timer already existing (any status): only "Çalışan bir oturum var." and the link "Pomodoro'ya git".
- No active goals: "Çalışmak için önce bir hedef oluştur." and a link to `/goals`. Goals fail to load: "Hedefler yüklenemedi.". Neither affects reading the part.

### Timer page (`/pomodoro`)

- With a `lessonPart`, the timer panel and `StudyPartPanel` sit in two columns (timer sticky at the top, content scrolling); below 900 px, one column with the timer first.
- `StudyPartPanel` loads the lesson with `useLesson` and shows a link "← <lesson>", the part title (`h2`), summary, body and exercises. Gone lesson or part: "Parça bulunamadı." and the timer keeps working.
- Without a `lessonPart`, the page looks as before.

### Saving

- The note starts as "<lesson> — <part>" and can be edited or emptied.
- The box "Bu parçayı tamamlandı işaretle" appears only for a finished focus session with a `lessonPart`; it is ticked each time.
- The session is saved first. A session that does not save marks nothing and keeps the timer. After it saves, the page loads the lesson and, when the box is ticked and the part is not done yet, sets `done`.
- A failed mark or lesson read loses nothing: "Oturum kaydedildi ama parça işaretlenemedi." when the box was ticked. The timer is already reset.
- The next part is the first item after the current one without `done`. No next part, a read failure or a part that no longer exists: no button.
- The button stays while the timer is idle, through a break, until another session starts. Like the break offer, it lives in page state and goes away when the user leaves the page.

## Out of scope

| Item | Where it goes |
|---|---|
| Storing the session's part in `sessions.json` or showing it on the calendar other than through the note | Not planned; needs a session schema change |
| Goal link stored in the lesson file | Not chosen; localStorage is enough for one machine |
| Starting from the lesson list or by shortcut | Not planned |
| Marking on stopped sessions | Not planned; "Tamamlandı" on the part page is always there |

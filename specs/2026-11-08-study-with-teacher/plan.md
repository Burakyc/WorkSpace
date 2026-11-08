# Plan — Phase 10.2 Study with the teacher

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/10.2-study-with-teacher
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Part on the timer

**Commit:** `feat(pomodoro): keep the lesson part with the timer`

- `timer.ts`: `LessonPartRef`, `lessonPart`, `startTimer` argument, `parseStoredTimer`. `PomodoroContext.start`: optional `lessonPart`.
- `timer.test.ts` (T1), `PomodoroContext.test.tsx` (T2).
- Check: `npm run check`.

### 2. Start from a part

**Commit:** `feat(learning): start a pomodoro from a lesson part`

- `StudyPartForm.tsx`, shown on `LessonPartPage`; `learning/testing/studyApi.ts` for the tests.
- `StudyPartForm.test.tsx` (T3–T5), `LessonPartPage.test.tsx` updated.
- Check: `npm run check`.

### 3. Part next to the timer

**Commit:** `feat(pomodoro): show the lesson part next to the timer`

- `PartContent.tsx` (extracted from `LessonPartPage`), `StudyPartPanel.tsx`, the two columns on `PomodoroPage`.
- `StudyPartPanel.test.tsx` (T6), `PomodoroPage.test.tsx` (T7).
- Check: `npm run check`.

### 4. Finish the part

**Commit:** `feat(pomodoro): mark the part done when the session is saved`

- `PomodoroPage`: note prefill, the box, marking after the save, "Sonraki parça".
- `PomodoroPage.test.tsx` (T8–T11).
- Check: `npm run check`; manual M1–M8.

### 5. Docs

**Commit:** `docs: document studying a lesson part`

- `specs/tech-stack.md`: the timer's `lessonPart`, the part page, the Pomodoro page, the note in the save form.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 10.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 10.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/10.2-study-with-teacher`. Do not push or merge into `main`.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(pomodoro): keep the lesson part with the timer` |
| 2 | `feat(learning): start a pomodoro from a lesson part` |
| 3 | `feat(pomodoro): show the lesson part next to the timer` |
| 4 | `feat(pomodoro): mark the part done when the session is saved` |
| 5 | `docs: document studying a lesson part` |
| 6 | `docs(roadmap): mark phase 10.2 done` |

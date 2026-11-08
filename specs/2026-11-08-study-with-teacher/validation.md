# Validation — Phase 10.2 Study with the teacher

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 10.2, plus the decisions in [requirements.md](requirements.md):

- [ ] Start a pomodoro from a lesson part (goal pre-selected); finishing the session can mark the part done.
- [ ] The part's content is shown next to the timer.
- [ ] The goal is remembered per lesson; every session still has a goal.
- [ ] A stopped-early session never marks the part.
- [ ] The note is prefilled, the tags come from the lesson, and "Sonraki parça" starts the next unfinished part.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Stored part | `src/modules/pomodoro/timer.test.ts` | `startTimer` keeps the part; breaks have none; `parseStoredTimer` round-trips it; missing or broken → `null`, timer kept |
| T2 | Context | `src/modules/pomodoro/PomodoroContext.test.tsx` | `start` with a part stores it |
| T3 | Preselection | `src/modules/learning/StudyPartForm.test.tsx` | Remembered goal first; else the only goal; with several and none remembered, the button is off; an archived remembered goal is ignored |
| T4 | Start | same | Starts with the goal, focus length, first 10 tags and the part; remembers the goal; opens `/pomodoro`; 25 minutes when the settings fail |
| T5 | Other states | same | An existing timer → the text and link, no button; no goals → link to `/goals`; goal failure → "Hedefler yüklenemedi." |
| T6 | Panel | `src/modules/learning/StudyPartPanel.test.tsx` | Title, summary, body, exercises, back link; unknown part or lesson → "Parça bulunamadı." |
| T7 | Layout | `src/modules/pomodoro/PomodoroPage.test.tsx` | A part timer shows the panel; a plain timer does not |
| T8 | Save and mark | same | The note starts with the part's name; box ticked → the session is sent first, then `{ mark: "done" }`; box off → no mark; already done → no mark |
| T9 | Failures | same | Session save fails → no mark, timer kept; mark fails → "Oturum kaydedildi ama parça işaretlenemedi.", timer reset |
| T10 | Stopped early | same | "Durdur" saves `completed: false`, no mark, no next part |
| T11 | Next part | same | Skips done parts, starts with the same goal and tags and the new part; stays after a break; none at the end |

## Manual test steps

Run the dev app with a goal and a lesson of 3 parts, focus length 1 minute (Ayarlar), and set it back afterwards.

| ID | Step | Expected |
|---|---|---|
| M1 | Open part 1 with 2 goals | "Hedef" and "Bu parçayı çalış" (off); choose a goal |
| M2 | "Bu parçayı çalış" | Pomodoro opens, timer running, goal locked, the lesson's tags, the part's content beside the timer with coloured code |
| M3 | Reload the window (`Ctrl+R`) | Timer and part still there |
| M4 | Narrow the window below 900 px | One column, timer first |
| M5 | Wait for the end | Save form: note "<lesson> — <part>", box ticked; "Kaydet" |
| M6 | Lesson page | Part 1 "✓ Tamamlandı"; calendar day shows the session with the note |
| M7 | Back on Pomodoro after saving: "Molaya başla", finish the break, "Sonraki parça: …" | The offer survives the break; part 2 runs with the same goal |
| M8 | Stop part 2 early (after 1 minute of a longer timer) | Saved as stopped; part 2 not done; open part 2 again: goal preselected; keyboard reaches the select, the button and the box with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M8 done with the expected results
- [ ] `roadmap.md` phase 10.2 ticked and set to `done`

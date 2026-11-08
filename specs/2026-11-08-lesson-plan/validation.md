# Validation — Phase 10.1 Lesson plan

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 10.1, plus the decisions in [requirements.md](requirements.md):

- [ ] Pick a topic; the teacher prompt splits it into pomodoro-sized parts and the answer is saved as a Learning topic (copy-paste mode; the other modes come with 9.x).
- [ ] The prompt uses the focus length from the settings, the chosen language, the part count and the background.
- [ ] Choosing an existing lesson lists its parts in the prompt; the import merges and never overwrites.
- [ ] Invalid AI output is not saved.
- [ ] Nothing calls an AI provider.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Prompt | `src/modules/learning/lessonPlanPrompt.test.ts` | Topic, level, language, part count and focus minutes are filled in; no `{{` is left; no part count → "your choice"; background and existing parts appear only when given; `$&` and `{{level}}` in the topic stay literal |
| T2 | Template example | `Modules/Content/PromptTemplateTests.cs` | The JSON example in `prompts/lesson-plan.md` passes the lesson schema |
| T3 | Copy button | `src/modules/content/CopyPromptButton.test.tsx` | `getText` is copied; a rejected `getText` → "Kopyalanamadı."; `label` and `disabled` apply; without them it copies the type's template as before |
| T4 | Panel copy | `src/modules/learning/LessonPlanPanel.test.tsx` | Off without a topic; copies the form's answers and `focusMinutes` from the settings; 25 when the settings fail |
| T5 | Part count, language | same | 0 and 51 show "1 ile 50 arasında olmalı." and turn copying off; the language choice is remembered across mounts |
| T6 | Existing lesson | same | A matching topic disables the level at the lesson's level, shows the note and copies its part titles |
| T7 | List page | `src/modules/learning/LearningPage.test.tsx` | "Ders planı" in the empty state and in the list; opening it replaces the import panel; an import from it shows the lesson in the list and the summary stays |

## Manual test steps

Run the dev app with no lessons.

| ID | Step | Expected |
|---|---|---|
| M1 | Öğrenme | The empty state has "Promptu kopyala" and "Ders planı" |
| M2 | "Ders planı" | The form and "İçe aktar" open; "Plan promptunu kopyala" is off |
| M3 | Topic "Dependency injection", İleri, 3 parts, Türkçe, a background line, then copy | "Kopyalandı."; the clipboard holds all of them and the focus minutes from Ayarlar |
| M4 | Paste an answer missing `summary` into "İçe aktar" and import | "Satır n · …" errors, nothing saved |
| M5 | Fix it and import | "3 öğe eklendi, 0 öğe zaten vardı."; the lesson is listed with "3 parça"; its parts open |
| M6 | "Ders planı" again, choose the lesson from the topic suggestions, copy, import one old and one new part | Level is disabled at İleri, the note shows, the prompt lists the 3 titles; "1 öğe eklendi, 1 öğe zaten vardı."; marks stay |
| M7 | Keyboard only: open the panel, fill the form, copy | All reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 10.1 ticked and set to `done`

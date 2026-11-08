# Plan — Phase 10.1 Lesson plan

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/10.1-lesson-plan
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Prompt

**Commit:** `feat(learning): add the lesson plan prompt`

- `prompts/lesson-plan.md`; `lessonPlan` export in `modules/content/prompts.ts`; `modules/learning/lessonPlanPrompt.ts`.
- `lessonPlanPrompt.test.ts` (T1), `PromptTemplateTests.cs` (T2).
- Check: `npm run check`.

### 2. Plan panel

**Commit:** `feat(learning): add the lesson plan panel`

- `CopyPromptButton`: optional `getText`, `label`, `disabled`. `TopicListPage`: optional `extra`. `LessonPlanPanel.tsx`; `LearningPage` passes it.
- `CopyPromptButton.test.tsx` (T3), `LessonPlanPanel.test.tsx` (T4–T6), `LearningPage.test.tsx` (T7).
- Check: `npm run check`; manual M1–M7.

### 3. Docs

**Commit:** `docs: document the lesson plan`

- `specs/tech-stack.md`: the Öğrenme line, `extra` on `TopicListPage`, the prompt library.

### 4. Close the phase

**Commit:** `docs(roadmap): mark phase 10.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 10.1 box in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/10.1-lesson-plan`. Do not push or merge into `main`.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(learning): add the lesson plan prompt` |
| 2 | `feat(learning): add the lesson plan panel` |
| 3 | `docs: document the lesson plan` |
| 4 | `docs(roadmap): mark phase 10.1 done` |

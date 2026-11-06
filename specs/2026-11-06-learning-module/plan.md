# Plan — Phase 5.4 Learning module

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/5.4-learning-module
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Done mark

**Commit:** `feat(content): mark lesson parts as done`

- `ContentType.Marks` for lesson: `done`.
- `ImportServiceTests.cs` (T1), `ContentServiceTests.cs` (T2).
- Check: `npm run check`.

### 2. Shared code sample

**Commit:** `refactor(content): share the code sample`

- Move `CodeSample.tsx`, `highlight.ts` and their tests from `modules/interview/` to `modules/content/` (with the `.code` styles); `QuestionCard` imports them from there.
- The moved tests pass unchanged.
- Check: `npm run check`.

### 3. Lesson list

**Commit:** `feat(learning): list lessons`

- Type `LessonItem`; `modules/learning/LearningPage.tsx`, `lessonCounts.ts`; `/learning` uses it in `navigation.tsx`; delete `ContentEmptyPage` and its test.
- `LearningPage.test.tsx` (T3).
- Check: `npm run check`.

### 4. Lesson and part pages

**Commit:** `feat(learning): read lesson parts and mark them done`

- `lessonBody.ts`, `LessonBody.tsx`, `LessonTopicPage.tsx`, `LessonPartPage.tsx`, `Learning.module.css`; routes `/learning/:slug` and `/learning/:slug/:partId` in `AppRoutes.tsx`.
- `lessonBody.test.ts` (T4), `LessonTopicPage.test.tsx` (T5), `LessonPartPage.test.tsx` (T6–T7).
- Check: `npm run check`; manual M1–M6.

### 5. Docs

**Commit:** `docs: document the learning module`

- `specs/tech-stack.md`: the Öğrenme pages, the body format, the shared code sample.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 5.4 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 5.4 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/5.4-learning-module`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(content): mark lesson parts as done` |
| 2 | `refactor(content): share the code sample` |
| 3 | `feat(learning): list lessons` |
| 4 | `feat(learning): read lesson parts and mark them done` |
| 5 | `docs: document the learning module` |
| 6 | `docs(roadmap): mark phase 5.4 done` |

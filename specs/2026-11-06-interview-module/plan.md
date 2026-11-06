# Plan — Phase 5.3 Interview module

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/5.3-interview-module
```

Every task ends with `npm run check`. A task is committed only when it passes. New packages: `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs-precompiled`, `@shikijs/themes` 4.6.0 (confirmed during planning; already installed through BlockNote).

## Tasks

### 1. Practised mark

**Commit:** `feat(content): mark interview questions as practised`

- `ContentType.Marks` for interview: `practised`.
- `ContentServiceTests.cs` (T1), `ImportServiceTests.cs` (T2).
- Check: `npm run check`.

### 2. Shared topic list

**Commit:** `refactor(content): share the topic list page`

- `modules/content/TopicListPage.tsx` from `EnglishPage` (props `type`, `basePath`, `icon`, `title`, `description`, `counts`, `levelLabel`); `EnglishPage` renders it; `content/levelLabel.ts`.
- `levelLabel.test.ts` (T3); the 5.2 `EnglishPage.test.tsx` passes unchanged.
- Check: `npm run check`.

### 3. Interview topic list

**Commit:** `feat(interview): list interview topics`

- Types `InterviewItem`, `Difficulty`; `modules/interview/InterviewPage.tsx`, `interviewCounts.ts`; `/interview` uses it in `navigation.tsx`.
- `InterviewPage.test.tsx` (T4).
- Check: `npm run check`.

### 4. C# code samples

**Commit:** `feat(interview): highlight C# code samples`

- `package.json`: the four `@shikijs/*` 4.6.0 packages; `modules/interview/highlight.ts`, `CodeSample.tsx` (+ CSS).
- `highlight.test.ts` (T5), `CodeSample.test.tsx` (T6).
- Check: `npm run check`.

### 5. Questions, filters and practice

**Commit:** `feat(interview): filter and practise questions`

- `filterQuestions.ts`, `QuestionCard.tsx`, `InterviewTopicPage.tsx`; route `/interview/:slug` in `AppRoutes.tsx`.
- `filterQuestions.test.ts` (T7), `InterviewTopicPage.test.tsx` (T8–T10).
- Check: `npm run check`; manual M1–M6.

### 6. Docs

**Commit:** `docs: document the interview module`

- `specs/tech-stack.md`: the Shiki packages, the shared topic list, the Mülakat pages.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 5.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 5.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/5.3-interview-module`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(content): mark interview questions as practised` |
| 2 | `refactor(content): share the topic list page` |
| 3 | `feat(interview): list interview topics` |
| 4 | `feat(interview): highlight C# code samples` |
| 5 | `feat(interview): filter and practise questions` |
| 6 | `docs: document the interview module` |
| 7 | `docs(roadmap): mark phase 5.3 done` |

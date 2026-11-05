# Plan — Phase 5.2 English module

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/5.2-english-module
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Topic service

**Commit:** `feat(content): list topics and mark items`

- `ContentType.Marks` (vocab: `known`, `repeat`; others none yet); `Modules/Content/ContentService.cs` (records `TopicSummary`), registered in `AddContent()`.
- `ContentServiceTests.cs` (T1–T4).
- Check: `npm run check`.

### 2. Topic endpoints

**Commit:** `feat(content): add the topic endpoints`

- `Modules/Content/ContentController.cs` (`GET /api/content/{type}`, `GET /api/content/{type}/{slug}`, `PUT …/items/{id}/mark`), `MarkInput`.
- `ContentEndpointTests.cs` (T5).
- Check: `npm run check`.

### 3. Renderer client

**Commit:** `feat(english): add the topic requests`

- Types `TopicSummary`, `ContentTopic<T>`, `VocabItem`, `VocabMark`; `listTopics`, `getTopic`, `markItem`; the content fake learns topics (list, get, mark, import adds a topic).
- `client.test.ts` (T6).
- Check: `npm run check`.

### 4. Topic list

**Commit:** `feat(english): list vocabulary topics`

- `modules/english/EnglishPage.tsx` (+ CSS), `/english` uses it in `navigation.tsx`.
- `EnglishPage.test.tsx` (T7–T8).
- Check: `npm run check`.

### 5. Topic page and practice

**Commit:** `feat(english): practise vocabulary cards`

- `practiceQueue.ts`, `VocabTopicPage.tsx`, `VocabPractice.tsx`; route `/english/:slug` in `AppRoutes.tsx`.
- `practiceQueue.test.ts` (T9), `VocabTopicPage.test.tsx` (T10–T12).
- Check: `npm run check`; manual M1–M7.

### 6. Docs

**Commit:** `docs: document the English module`

- `specs/tech-stack.md`: topic endpoints, marks, the İngilizce pages.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 5.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 5.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/5.2-english-module`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(content): list topics and mark items` |
| 2 | `feat(content): add the topic endpoints` |
| 3 | `feat(english): add the topic requests` |
| 4 | `feat(english): list vocabulary topics` |
| 5 | `feat(english): practise vocabulary cards` |
| 6 | `docs: document the English module` |
| 7 | `docs(roadmap): mark phase 5.2 done` |

# Requirements — Phase 5.4 Learning module

**Roadmap phase:** 5.4 Learning module (Milestone 5 — Content modules with import)
**Branch:** `feat/5.4-learning-module`
**Estimate:** 2 days at 1–2 hours/day

## Goal

The Öğrenme page lists the user's lessons (topics). A lesson page lists its parts with their summary and a done check, and shows "3 / 8 parça" with a progress bar. Each part opens on its own page, sized for one pomodoro: title, summary, body (paragraphs and C#-highlighted code blocks), exercises, a "Tamamlandı" toggle and "Önceki / Sonraki" links.

## Scope

- **API**: lesson gets the mark `done`. No new endpoints.
- **Renderer**: `CodeSample` and `highlight.ts` move from `modules/interview/` to `modules/content/` (second use); `modules/learning/` with `LearningPage` (shared `TopicListPage`), `LessonTopicPage`, `LessonPartPage`, `LessonBody`, `lessonBody.ts`; routes `/learning/:slug` and `/learning/:slug/:partId`. `ContentEmptyPage` is deleted (no module uses it any more).
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Reading | **Part by part.** The lesson page lists the parts; a part opens on its own page with "Önceki" / "Sonraki" links. |
| Body | **Paragraphs and code blocks.** Blank lines separate paragraphs (single line breaks are kept); lines between ```` ``` ```` fences are a code block shown with the 5.3 C# `CodeSample`. Nothing else is interpreted and no HTML is ever rendered. |
| Done | **A toggle.** "Tamamlandı" (`aria-pressed`) on the part page saves `done`, pressing again removes it. The lesson page shows a check on done parts and "3 / 8 parça" with a `<progress>` bar. |

## User stories

1. **As the user**, I import a lesson (copy the prompt, paste the AI's JSON) and it appears on Öğrenme with "6 parça".
2. **As the user**, I open a lesson, see its parts in order with their summary and which ones I finished, and "2 / 6 parça".
3. **As the user**, I open a part, read the body with highlighted code, look at the exercises, mark it "Tamamlandı" and go to the next part.
4. **As the user**, I import more parts for the same lesson and they are appended; parts with the same title are skipped and my progress stays.

## Business and technical rules

### API

- `ContentType.Marks` for lesson: `done`.
- Merge key: normalized part `title` (5.1); summaries per topic count `marks.done`.

### Lesson list (`/learning`)

- `TopicListPage` with counts "8 parça · 3 tamamlandı" (no "tamamlandı" part at 0) and Turkish level names.

### Lesson page (`/learning/:slug`, `LessonTopicPage`)

- A link back to Öğrenme, the title, level, tags, then "3 / 8 parça" and a `<progress value=3 max=8>` labelled "İlerleme".
- An ordered list of the parts in added order: the title as a link to `/learning/<slug>/<partId>`, the summary, and "✓ Tamamlandı" on done parts.
- Unknown slug → "Konu bulunamadı."; failure → "Konu yüklenemedi.".

### Part page (`/learning/:slug/:partId`, `LessonPartPage`)

- A link back to the lesson ("← <topic>"), "Parça 2 / 8", the part title (`h1`), the summary (muted), the body (`LessonBody`), and, when there are exercises, "Alıştırmalar" with an ordered list.
- "Tamamlandı" (`aria-pressed`): saves `done` or removes it, disabled while saving, "Kaydedilemedi." on failure; the part reloads after a save.
- "← Önceki" and "Sonraki →" links to the neighbouring parts (left out at the ends).
- Unknown part in a known lesson → "Parça bulunamadı.".
- Moving to another part scrolls to the top.

### Body (`parseLessonBody(body)` → blocks)

- Lines are split on `\n` (a `\r` before it is dropped). A line that starts with ```` ``` ```` (after trimming) opens a code block, the next such line closes it; the fence lines are not shown and any language after the opening fence is ignored. An unclosed fence makes the rest of the body code.
- Outside code, runs of non-blank lines are paragraphs (shown with line breaks kept); blank lines only separate.
- Each code block is shown with `CodeSample` (C#).

## Out of scope

| Item | Where it goes |
|---|---|
| Starting a pomodoro from a part, finishing a session marks it done | Phase 10.2 (AI teacher) |
| Exercise answers or checks per exercise | Not planned for the MVP |
| Markdown beyond paragraphs and code fences | Not planned |
| Editing or deleting parts | Not planned for the MVP |

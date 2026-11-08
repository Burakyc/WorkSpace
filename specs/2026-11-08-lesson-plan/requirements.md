# Requirements — Phase 10.1 Lesson plan

**Roadmap phase:** 10.1 Lesson plan (Post-MVP — AI teacher)
**Branch:** `feat/10.1-lesson-plan`
**Estimate:** 1 day at 1–2 hours/day

## Goal

On Öğrenme, "Ders planı" opens a small form: the topic, its level, and optionally the number of parts, the language and what the user already knows. "Plan promptunu kopyala" copies a teacher prompt filled with those answers and the user's focus length. The user pastes it into any AI and pastes the JSON back; the existing validator and merge save it as a Learning topic, split into pomodoro-sized parts.

## Scope

- **Prompt**: `prompts/lesson-plan.md`, a template that answers with the existing lesson schema.
- **Renderer**: `modules/learning/lessonPlanPrompt.ts` (a pure function that fills the template), `modules/learning/LessonPlanPanel.tsx`; `TopicListPage` gets an optional extra panel; `CopyPromptButton` gets optional `getText`, `label` and `disabled`.
- **API**: no change. `PromptTemplateTests` also checks the new template's example.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| AI mode | **Copy-paste through the 5.1 flow.** Phase 9.1 is not on `main` yet. The seam for the other modes is the split that already exists: `buildLessonPlanPrompt` gives the prompt, `ImportPanel` takes the answer. A later mode replaces the copy and paste steps and keeps both. |
| AI modes (after 9.x reached `main`) | "Promptu oluştur" builds the prompt, then the shared `AiContentPanel` (module `learning`) runs it in the chosen mode: copy-paste, file import or API. This replaces "Plan promptunu kopyala" and the panel's own `ImportPanel`. The panel appears only after the prompt is built, and a form change hides it ("Form değişti; promptu yeniden oluştur."), so a stale prompt is never copied or sent. A prompt that cannot be built shows "Prompt oluşturulamadı.". |
| Place | **A panel on Öğrenme.** "Ders planı" sits next to "İçerik ekle", and in the empty state. There is no new route. |
| Form | Topic and level, plus **number of parts** (optional, 1–50), **language** (the last choice is remembered) and **what I know / my aim** (optional). |
| Continuing a lesson | The topic box suggests the existing lessons. Choosing one fixes the level to the lesson's and adds its part titles to the prompt, so the AI does not repeat them. |
| Content | **The full lesson at once.** The schema does not change: the AI writes every part with its body and exercises in one JSON. |
| Part size | The prompt asks for parts of one focus session, using `focusMinutes` from the settings (25 when they cannot be read). |

## User stories

1. **As the user**, I give a topic and a level, copy the prompt, paste it into an AI, paste the answer back, and the lesson appears on Öğrenme split into parts.
2. **As the user**, I say how many parts I want, which language to write in and what I already know, and the prompt carries all of it.
3. **As the user**, I pick an existing lesson, so the new prompt lists its parts and the import adds only new ones; my progress stays.
4. **As the user**, I get line-by-line errors when the AI's answer is invalid, and nothing is saved.

## Business and technical rules

### Prompt (`prompts/lesson-plan.md`, `buildLessonPlanPrompt(input)`)

- Input: `{ topic, level, parts: number | null, language: 'en' | 'tr', background, focusMinutes, existingParts: string[] }`.
- The template holds `{{topic}}`, `{{level}}`, `{{language}}` (`English` / `Turkish`), `{{parts}}` (the number, or "your choice"), `{{details}}` and `{{focusMinutes}}`. All are replaced in one pass, so user text with `{{level}}` or `$&` stays literal.
- `{{details}}` adds a line per optional answer: the trimmed background, and the existing part titles as a list. Without them, it adds nothing.
- The answer must fit `schemas/lesson.schema.json`. The template's JSON example must pass it (test), and it says bodies may use ```` ``` ```` code fences, which `parseLessonBody` understands.

### Panel (`LessonPlanPanel`, props `topics`, `onImported`)

- **Konu** (`<input list>`, 1–120 characters, suggestions from `topics`), **Seviye** (`<select>`: Başlangıç, Orta, İleri; default Başlangıç), **Parça sayısı** (optional number, 1–50; otherwise "1 ile 50 arasında olmalı." and copying is off), **İçerik dili** (İngilizce, Türkçe; default İngilizce because study content is mostly English; remembered in `localStorage` `devpath.learning.planLanguage`), **Bildiklerim / hedefim** (optional, at most 500 characters).
- "Plan promptunu kopyala" (`CopyPromptButton`) is off without a topic. It reads the focus length, and an existing lesson's parts, when pressed. A failed lesson read shows "Kopyalanamadı.".
- A topic equal to an existing lesson's name (after trimming) is that lesson: the level select shows its level and is disabled, and "Bu ders zaten var; yeni parçalar eklenir, mevcut parçalar değişmez." appears.
- Below the form is the usual `ImportPanel` for `lesson`; an import reloads the list.

### List page (`TopicListPage`)

- Optional prop `extra: { label, render(topics, onImported) }`. Its button sits next to "İçerik ekle" (`aria-expanded`), and in the empty state next to "Promptu kopyala".
- Only one panel is open at a time. In the empty state the plan panel replaces the default import panel while open. A panel stays open after its import, so the summary stays visible.
- English and Interview pages pass no `extra` and look the same.

## Out of scope

| Item | Where it goes |
|---|---|
| AI mode setting, file inbox, API calls | Phases 9.1–9.3 |
| Outline first, part bodies later | Not planned; the user chose the full lesson at once |
| Pomodoro from a part, content next to the timer | Phase 10.2 |
| Editing or deleting parts | Not planned |

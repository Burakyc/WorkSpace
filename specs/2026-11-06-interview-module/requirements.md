# Requirements — Phase 5.3 Interview module

**Roadmap phase:** 5.3 Interview module (Milestone 5 — Content modules with import)
**Branch:** `feat/5.3-interview-module`
**Estimate:** 2 days at 1–2 hours/day

## Goal

The Mülakat page lists the user's interview topics. A topic page shows its questions as cards: question, difficulty and tags, with the answer and an optional C# code sample behind "Cevabı göster". The user marks a question as practised and filters the questions by difficulty, tag and practised state. This completes the README's "Adding content" scenario: copy the prompt, paste the AI's JSON, see the cards.

## Scope

- **API**: interview gets the mark `practised`. No new endpoints (the 5.2 topic endpoints are generic).
- **Renderer**: the 5.2 topic list becomes a shared `TopicListPage` (second use), used by İngilizce and Mülakat; `modules/interview/` with `InterviewTopicPage`, `QuestionCard`, `filterQuestions.ts`, `CodeSample` (Shiki); the `/interview/:slug` route.
- **Packages**: `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs-precompiled`, `@shikijs/themes` 4.6.0 (confirmed during planning; already installed through `@blocknote/code-block`, same version).
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Answer | **Hidden behind "Cevabı göster"** ("Cevabı gizle" closes it), so the user can answer first. The code sample opens with the answer. |
| Filters | **On the topic page**: difficulty, tag and practised state. The Mülakat page lists topics. |
| Code | **C# highlighting with Shiki**, the same engine as the notes code blocks. Rendered as coloured spans (no HTML injection); light and dark colours switch with CSS. |
| Shiki packages | **`@shikijs/*` 4.6.0 as direct dependencies.** BlockNote uses Shiki but does not export its highlighter. |
| Tag filter options | The tags used on questions (not the topic's tags, which every question of the topic shares). Without question tags the tag filter is not shown. (Not asked.) |
| Deviation: hard badge | "Zor" uses the danger colour so hard questions stand out; easy and medium use the accent badge. |

## User stories

1. **As the user**, I click "Promptu kopyala" on Mülakat, paste the prompt into an AI chat, paste the JSON answer back, and see the topic; opening it shows the questions as cards. (README "Adding content".)
2. **As the user**, I read a question, think of my answer, then click "Cevabı göster" to compare, with the code sample highlighted as C#.
3. **As the user**, I mark questions I practised with "Çalıştım" and see "10 soru · 4 çalışıldı".
4. **As the user**, I show only the hard questions with the tag `di` that I have not practised yet.

## Business and technical rules

### API

- `ContentType.Marks` for interview: `practised`. `PUT /api/content/interview/{slug}/items/{id}/mark` with `{ mark: "practised" }` or `{ mark: null }`.
- Merge key: normalized `question` (5.1 `ContentKey.Key`): "What is DI?" and "  what is  di?" are the same question.

### Topic list (`TopicListPage`, shared)

- The 5.2 `EnglishPage` behaviour, with props: `type`, `basePath` (`/english`, `/interview`), `icon`, `title`, `description`, `counts(summary)` and `levelLabel(level)`.
- İngilizce: counts "12 kart · 5 biliyorum · 2 tekrar", level as is (`B2`).
- Mülakat: counts "10 soru · 4 çalışıldı" (no "çalışıldı" part at 0), level in Turkish: `beginner` → "Başlangıç", `intermediate` → "Orta", `advanced` → "İleri" (`levelLabel.ts`, also for 5.4).

### Topic page (`/interview/:slug`)

- A link back to Mülakat, the title, level, topic tags and counts (as in 5.2; "Konu bulunamadı." / "Konu yüklenemedi.").
- **Filters** (a row of labelled `<select>`s, applied at once, not stored):
  - "Zorluk": Hepsi, Kolay (`easy`), Orta (`medium`), Zor (`hard`).
  - "Etiket": Hepsi and every question tag (sorted); hidden when no question has tags.
  - "Durum": Hepsi, Çalışılmadı, Çalışıldı.
  - `filterQuestions(items, filter)` keeps a question when it matches all three. "3 / 10 soru" shows how many are shown; none → "Bu filtreye uyan soru yok.".
- **Question card** (`QuestionCard`): the question, a difficulty badge (Kolay / Orta / Zor), its tags (`#di`); "Cevabı göster" / "Cevabı gizle" (`aria-expanded`) shows the answer (line breaks kept) and the code sample; "Çalıştım" is a toggle (`aria-pressed`): pressing it saves `practised`, pressing again removes the mark. While saving the button is disabled; a failure shows "Kaydedilemedi." on the card. After a save the page reloads the topic (the filters and opened answers stay).
- Questions keep their added order.

### Code sample (`CodeSample`)

- Shows the code at once as plain monospace text, then, when the highlighter is ready, as Shiki tokens for C# with the `github-light` and `github-dark` themes (`--shiki-light` / `--shiki-dark` CSS variables per token; the page picks one with `prefers-color-scheme`).
- The highlighter (`highlight.ts`) is created once, on the first code sample shown, with only the C# grammar and the JavaScript regex engine; if it fails, the plain text stays.
- Long lines scroll horizontally inside the sample.

## Out of scope

| Item | Where it goes |
|---|---|
| Filtering across all topics | Not planned (decided: per topic) |
| Other code languages | Not planned; the schema has no language field |
| Spaced repetition for questions | "Later" in roadmap.md |
| Editing or deleting questions | Not planned for the MVP |

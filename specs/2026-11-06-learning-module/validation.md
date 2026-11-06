# Validation — Phase 5.4 Learning module

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 5.4, plus the decisions in [requirements.md](requirements.md):

- [ ] Topic list and lesson pages split into parts (title, summary, body, optional exercises).
- [ ] Mark a part as done; topic shows parts done / total.
- [ ] Parts open one by one with "Önceki" / "Sonraki"; bodies show paragraphs and highlighted code blocks.
- [ ] Tests: lesson merge by part title, progress count.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Merge by title | `Modules/Content/ImportServiceTests.cs` | "Why DI" then "  why  di " + a new part → added 1, skipped 1; the done mark of the existing part stays |
| T2 | Progress count | `Modules/Content/ContentServiceTests.cs` | Two of three parts `done` → summary `marks.done` = 2; `known` on lesson → "Geçersiz işaret." |
| T3 | Import then show | `src/modules/learning/LearningPage.test.tsx` | Empty → empty state; import → row "Başlangıç", "2 parça"; with done parts "3 parça · 1 tamamlandı" |
| T4 | Body | `src/modules/learning/parseLessonBody.test.ts` | Paragraphs split on blank lines with line breaks kept; ```` ```csharp ```` … ```` ``` ```` → one code block without fences; CRLF; unclosed fence; blank-only body → no blocks |
| T5 | Lesson page | `src/modules/learning/LessonTopicPage.test.tsx` | Parts in order with links, summaries and "✓ Tamamlandı" on done ones; "1 / 3 parça" and `<progress>` value 1 max 3; unknown slug → "Konu bulunamadı." |
| T6 | Part page | `src/modules/learning/LessonPartPage.test.tsx` | "Parça 2 / 3", title, summary, paragraphs, code text, exercises; "← Önceki" / "Sonraki →" links, none at the ends; unknown part → "Parça bulunamadı." |
| T7 | Done toggle | same | "Tamamlandı" sends `{ mark: "done" }` and is pressed after the reload; again sends `{ mark: null }`; failure → "Kaydedilemedi." |

## Manual test steps

Run `npm run dev` with no lessons.

| ID | Step | Expected |
|---|---|---|
| M1 | Öğrenme: "Promptu kopyala", then import a lesson with 3 parts (one body with a C# code block, one part with exercises) | The lesson with its level and "3 parça" |
| M2 | Open the lesson | Parts in order with summaries; "0 / 3 parça" and an empty progress bar |
| M3 | Open part 1, read, "Tamamlandı", "Sonraki →" | Body paragraphs and the coloured code; the button is pressed; part 2 opens at the top |
| M4 | Back to the lesson | "✓ Tamamlandı" on part 1; "1 / 3 parça"; the list shows "3 parça · 1 tamamlandı" |
| M5 | Import the same lesson with one existing and one new part title | "1 öğe eklendi, 1 öğe zaten vardı."; 4 parts, part 1 still done |
| M6 | Keyboard only: open a part, toggle "Tamamlandı", follow "Sonraki →" | All reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M6 done with the expected results
- [ ] `roadmap.md` phase 5.4 ticked and set to `done`

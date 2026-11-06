# Validation — Phase 5.3 Interview module

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 5.3, plus the decisions in [requirements.md](requirements.md):

- [ ] Topic list and question cards (question, answer, optional code sample, difficulty).
- [ ] "Adding content" scenario works end to end: copy prompt → paste AI JSON → cards appear.
- [ ] Mark a question as practised; filter by tag and difficulty.
- [ ] The answer is hidden behind "Cevabı göster"; code samples are highlighted as C#.
- [ ] Tests: interview merge key, filter logic.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Practised | `Modules/Content/ContentServiceTests.cs` | `practised` on an interview question is stored and counted; `known` on interview → "Geçersiz işaret." |
| T2 | Merge key | `Modules/Content/ImportServiceTests.cs` | "What is DI?" then "  what is  DI?" + a new question → added 1, skipped 1 |
| T3 | Levels | `src/modules/content/levelLabel.test.ts` | `beginner` → "Başlangıç", `intermediate` → "Orta", `advanced` → "İleri", `B2` → "B2" |
| T4 | Import then show | `src/modules/interview/InterviewPage.test.tsx` | Empty → empty state with "Promptu kopyala"; paste + "İçe aktar" → topic row with "Orta", tags and "2 soru"; a topic with practised questions shows "3 soru · 1 çalışıldı" |
| T5 | Highlighter | `src/modules/interview/highlight.test.ts` | `highlightCSharp('var x = 1;')` gives lines of tokens whose text joins back to the code and that carry `--shiki-light` / `--shiki-dark` |
| T6 | Code sample | `src/modules/interview/CodeSample.test.tsx` | Plain code at once; coloured spans after the highlighter resolves; a failing highlighter keeps the plain text |
| T7 | Filter | `src/modules/interview/filterQuestions.test.ts` | Difficulty, tag, practised state alone and combined; "all" keeps everything; order kept |
| T8 | Cards | `src/modules/interview/InterviewTopicPage.test.tsx` | Questions with difficulty and tags, no answer; "Cevabı göster" (`aria-expanded`) shows answer and code; unknown slug → "Konu bulunamadı." |
| T9 | Filters | same | Zorluk "Zor" → "1 / 3 soru"; Etiket lists question tags only; Durum "Çalışılmadı"; nothing left → "Bu filtreye uyan soru yok." |
| T10 | Practised | same | "Çalıştım" sends `{ mark: "practised" }`, is pressed after the reload; pressed again sends `{ mark: null }`; failure → "Kaydedilemedi." |

## Manual test steps

Run `npm run dev` with no interview topics.

| ID | Step | Expected |
|---|---|---|
| M1 | Mülakat: "Promptu kopyala", paste into a text editor | The interview template |
| M2 | Paste interview JSON with 3 questions (one with code, tags on two) and "İçe aktar" | The topic with "Orta" and "3 soru" (README "Adding content") |
| M3 | Open it, click "Cevabı göster" on the question with code | Answer with line breaks; the code is coloured as C# (check light and dark) |
| M4 | Filter Zorluk "Zor", then an Etiket, then Durum | The shown questions and "n / 3 soru" follow each filter |
| M5 | "Çalıştım" on two questions, unpress one | Pressed state stays after reload; the list shows "3 soru · 1 çalışıldı" |
| M6 | Keyboard only: filters, "Cevabı göster", "Çalıştım" | All reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M6 done with the expected results
- [ ] `roadmap.md` phase 5.3 ticked and set to `done`

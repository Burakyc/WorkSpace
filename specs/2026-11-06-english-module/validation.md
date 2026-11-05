# Validation — Phase 5.2 English module

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 5.2, plus the decisions in [requirements.md](requirements.md):

- [ ] Empty state: "Copy the prompt to add your first content" (in Turkish) with the copy button.
- [ ] Topic list with level and tags; topic page shows vocab cards (term, meaning, example).
- [ ] Simple practice: flip card, mark "biliyorum / tekrar et" (stored per item; spaced repetition comes later).
- [ ] Importing into an existing topic merges.
- [ ] Practice shows "Tekrar et" cards first, then unmarked ones; "Hepsini çalış" when all are known.
- [ ] Tests: import-then-show flow (RTL).
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | List | `Modules/Content/ContentServiceTests.cs` | Two imported topics → summaries sorted by topic (Turkish collation, "Çalışma" before "Dil"), item counts and mark counts; no folder → empty; an unreadable file is skipped |
| T2 | Get | same | Stored topic without `schemaVersion`; unknown or invalid slug (`../x`, `A b`) → null |
| T3 | Mark | same | `known` sets `mark` and `markedAt`; `null` removes both; topic `updatedAt` unchanged; unknown item → null |
| T4 | Bad mark | same | `"done"` on vocab → `mark` error "Geçersiz işaret." |
| T5 | Endpoints | `Modules/Content/ContentEndpointTests.cs` | Import, list, get, mark, list shows the mark count; unknown slug/item → `404`; bad mark → `400`; unknown type → `400` |
| T6 | Client | `src/shared/api/client.test.ts` | `listTopics('vocab')`, `getTopic('vocab', 'a b')`, `markItem('vocab', 's', 'i 1', 'known')` call the right method, path (encoded) and body |
| T7 | Import then show | `src/modules/english/EnglishPage.test.tsx` | Empty → empty state, copy button and panel; paste + "İçe aktar" → the topic appears in the list with level, tags and "2 kart" |
| T8 | List | same | Topics as links to `/english/<slug>` with counts "3 kart · 1 biliyorum · 1 tekrar"; "İçerik ekle" toggles the panel (`aria-expanded`); failure → "Konular yüklenemedi." |
| T9 | Queue | `src/modules/english/practiceQueue.test.ts` | repeat first, then unmarked, known left out, added order kept; all known → empty |
| T10 | Topic page | `src/modules/english/VocabTopicPage.test.tsx` | Cards with term, meaning, definition, example and mark labels; unknown slug → "Konu bulunamadı." |
| T11 | Practice | same | "Çalış" → "1 / 2" with the repeat card's term; "Çevir" shows the back; "Biliyorum" sends `PUT …/mark { mark: "known" }` and shows the next card; after the last → "Bitti: 2 kart çalışıldı."; "Listeye dön" shows the updated marks |
| T12 | All known and failure | same | All known → "Hepsini biliyorsun." and "Hepsini çalış" practises every card; a failed mark → "Kaydedilemedi." and the card stays |

## Manual test steps

Run `npm run dev` with no English topics.

| ID | Step | Expected |
|---|---|---|
| M1 | Open İngilizce | Empty state with "Promptu kopyala" and the import panel |
| M2 | Import a vocab topic with 3 cards | The topic appears with level, tags and "3 kart"; the panel stays open for more |
| M3 | Open the topic | Every card with term, meaning, definition and example |
| M4 | "Çalış": flip the first card, mark "Tekrar et"; flip the second, mark "Biliyorum"; "Bitir" | Marks shown in the list; the list on İngilizce shows "1 biliyorum · 1 tekrar" |
| M5 | "Çalış" again | The "Tekrar et" card first, then the unmarked one; the known card does not come |
| M6 | Import the same topic with one new and one existing card | "1 öğe eklendi, 1 öğe zaten vardı."; the topic has 4 cards and the marks are kept |
| M7 | Keyboard only: open a topic, practise a card | Every button reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 5.2 ticked and set to `done`

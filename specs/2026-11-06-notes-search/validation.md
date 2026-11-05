# Validation — Phase 4.3 Notes search

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 4.3, plus the decisions in [requirements.md](requirements.md):

- [x] Search box over page titles and text content; results open the page.
- [x] API extracts plain text from BlockNote JSON for search.
- [x] Matching ignores case and Turkish letter differences; every word must match.
- [x] Results show title, location and a snippet with marked matches.
- [x] Tests: text extraction and search ranking (title matches first).
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Extraction | `Modules/Notes/NoteTextTests.cs` | Heading, styled text pieces, a link, a code block (string content), nested children and a table give one line per block in order |
| T2 | Odd shapes | same | Empty array, blocks without content, unknown inline types → no error, empty lines skipped |
| T3 | Folding | `Modules/Notes/SearchTextTests.cs` | "İSTANBUL Işık şçğöü" → "istanbul isik scgou"; length unchanged |
| T4 | Words | `Modules/Notes/NoteSearchServiceTests.cs` | "dependency inj" finds "Dependency Injection"; "baslangic" finds "Başlangıç"; a page with only one of two words is not found; folders are not found |
| T5 | Ranking | same | Title match first even when older; text matches next, newest first; at most 50 |
| T6 | Snippet | same | Around the first match with "…" at cuts; highlights point at every match in the snippet; title-only match gives the start of the text without highlights |
| T7 | Bad query | same | "a", "   " and 201 characters → `q` error |
| T8 | Endpoint | `Modules/Notes/NotesEndpointTests.cs` | Save content, `GET /api/notes/search?q=…` returns the page with `path`, `snippet`, `highlights`; `q=a` → `400` |
| T9 | Client | `src/shared/api/client.test.ts` | `searchNotes('di ömür')` → `GET /api/notes/search?q=di%20%C3%B6m%C3%BCr` |
| T10 | Search | `src/modules/notes/NotesPage.test.tsx` | Type + Enter → "2 sonuç", titles as links, location, `<mark>` around the match |
| T11 | Open and clear | same | Clicking a result opens the page and keeps the results; clearing the box shows the tree |
| T12 | Short and empty | same | One character + Enter → "En az 2 karakter yaz." and no request; no results → "Sonuç yok." |
| T13 | Error | same | API failure → "Arama yapılamadı." |

## Manual test steps

Run `npm run dev` and create: folder "ASP.NET" with page "Dependency Injection" (text "Servisler constructor ile alınır."), page "Başlangıç" (text "dependency injection notlarına bak"), page "Boş".

| ID | Step | Expected |
|---|---|---|
| M1 | Search "dependency" + Enter | Two results, "Dependency Injection" first with "ASP.NET" as location; the other shows the text piece with "dependency" marked |
| M2 | Search "baslangic", then "SERVİSLER" | "Başlangıç" found; then "Dependency Injection" with "Servisler" marked |
| M3 | Click a result, then clear the box | The page opens; the results stay until the box is cleared, then the tree is back |
| M4 | Search "a" + Enter; search "yokyok" + Enter | "En az 2 karakter yaz."; "Sonuç yok." |
| M5 | Tab to the search box and through the results | Reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M5 done with the expected results
- [x] `roadmap.md` phase 4.3 ticked and set to `done`

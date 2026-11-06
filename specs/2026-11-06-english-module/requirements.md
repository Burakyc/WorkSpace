# Requirements — Phase 5.2 English module

**Roadmap phase:** 5.2 English module (Milestone 5 — Content modules with import)
**Branch:** `feat/5.2-english-module`
**Estimate:** 2 days at 1–2 hours/day

## Goal

The İngilizce page lists the user's vocabulary topics. A topic page shows its cards (term, Turkish meaning, English definition, example) and a practice mode: cards come one at a time, the user flips each one and marks it "Biliyorum" or "Tekrar et". The mark is stored on the item. New content comes in through the 5.1 import panel and merges into existing topics.

## Scope

- **API** (`Modules/Content/`): `ContentService` and `ContentController` with generic topic endpoints for any content type (list, get, mark an item). Only vocab has marks in this phase; 5.3 and 5.4 add theirs.
- **Renderer** (`src/modules/english/`): `EnglishPage` (topic list, "İçerik ekle" panel, empty state), `VocabTopicPage` (cards, practice), `practiceQueue.ts`; client requests; the `/english/:slug` route.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Practice | **A practice mode** on the topic page ("Çalış"). One card at a time: the front shows the term; "Çevir" shows the back (Turkish meaning, English definition when there is one, example). "Biliyorum" or "Tekrar et" saves the mark and moves to the next card. |
| Which cards | **The ones not known yet:** first those marked "Tekrar et", then unmarked ones, each in the order they were added. When every card is known, "Hepsini çalış" practises all of them. |
| Import panel | **An "İçerik ekle" button** above the topic list opens and closes "Promptu kopyala" and the import panel; after an import the list reloads. With no topics the page shows the empty state with the panel open. |
| Topic order | Alphabetical by topic name (Turkish collation). (Not asked: a list the user scans by name.) |
| Deviation: empty state | `EnglishPage` renders the empty state itself instead of reusing `ContentEmptyPage`, so the import panel stays the same element when the first import turns the empty state into the list, and its summary stays visible. |
| Addition: focus | In practice, focus moves to "Çevir", then to "Biliyorum", so a card can be practised with Enter alone. |

## User stories

1. **As the user**, I open İngilizce and see my topics with their level, tags and how many cards I know.
2. **As the user**, I open a topic and see every card: term, meaning, definition, example, and my mark.
3. **As the user**, I click "Çalış", flip each card and mark it; the cards I marked "Tekrar et" come first next time.
4. **As the user**, I paste more cards for an existing topic and they are added to it.

## Business and technical rules

### Marks

- Each content type has a list of allowed marks. Vocab: `known` ("Biliyorum") and `repeat` ("Tekrar et").
- An item stores `mark` (one of the type's marks) and `markedAt` (UTC). Setting `null` removes both. Setting the same mark again only updates `markedAt`.
- The topic file keeps `schemaVersion` 1: the new fields are optional, older items simply have none. Marking does not change the topic's `updatedAt` (that is for content changes).

### Endpoints (`/api/content/{type}`)

- `GET /api/content/{type}` → topic summaries `{ slug, topic, level, tags, itemCount, marks: { known: 3, repeat: 1 }, updatedAt }`, alphabetical by `topic` (`tr-TR` collation). No folder or no files → `[]`. A file that cannot be read is skipped (logged), so one bad file does not hide the others.
- `GET /api/content/{type}/{slug}` → the topic file as stored (without `schemaVersion`), or `404`.
- `PUT /api/content/{type}/{slug}/items/{id}/mark` with `{ mark }` → the updated item; `404` for an unknown topic or item; a mark the type does not allow → `400` on `mark` ("Geçersiz işaret.").
- An unknown `type` → `400` on `type` (as in 5.1). A `slug` that is not `a–z`, `0–9` and `-` (1–80) → `404`, so it never reaches the file system.

### Renderer

- **`/english` (`EnglishPage`)**: title "İngilizce" with an "İçerik ekle" toggle button (`aria-expanded`). The panel holds `CopyPromptButton` and `ImportPanel type="vocab"`; `onImported` reloads the list.
  - Loading: "Yükleniyor…"; failure: "Konular yüklenemedi.".
  - No topics: the 5.1 empty state ("İlk içeriğini eklemek için promptu kopyala…") with the panel shown under it.
  - Topics: a list; each row links to `/english/<slug>` and shows the topic, level, tags (`#work`) and "12 kart · 5 biliyorum · 2 tekrar".
- **`/english/:slug` (`VocabTopicPage`)**: a link back to İngilizce, the topic title, level and tags, the counts and "Çalış" (disabled without cards). Below, every card in added order: term, meaning, definition (if any), example and a mark label ("Biliyorum" / "Tekrar et"). Unknown slug → "Konu bulunamadı."; failure → "Konu yüklenemedi.".
- **Practice (`VocabPractice`)**: replaces the card list while active.
  - The queue is built once when practice starts (`practiceQueue(items)`): `repeat` items, then unmarked ones; empty → "Hepsini biliyorsun." with "Hepsini çalış" (all items in added order) and "Bitir".
  - Shows "3 / 12", the term and "Çevir"; after flipping: meaning, definition, example and the two mark buttons. A mark is saved with `PUT …/mark`; on success the next card shows (front side); on failure "Kaydedilemedi." and the card stays.
  - After the last card: "Bitti: 12 kart çalışıldı." with "Listeye dön". "Bitir" is always there. Leaving practice reloads the topic.
- Text from imports is rendered as text only.

## Out of scope

| Item | Where it goes |
|---|---|
| Spaced repetition | "Later" in roadmap.md |
| Reverse cards (meaning → term), typing answers | Not planned |
| Deleting or editing topics and cards | Not planned for the MVP |
| Daily English reminder | Phase 7.2 |

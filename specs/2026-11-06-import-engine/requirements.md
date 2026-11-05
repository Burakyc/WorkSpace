# Requirements — Phase 5.1 Import engine and validator

**Roadmap phase:** 5.1 Import engine and validator (Milestone 5 — Content modules with import)
**Branch:** `feat/5.1-import-engine`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

One import engine for the three content modules. The user copies a prompt template, pastes it into any AI chat, and pastes the JSON answer (or picks a `.json` file) back into the İngilizce, Öğrenme or Mülakat page. The API checks it against the type's JSON Schema and lists every problem with its line number. Valid content is saved to `content/<module>/<topic-slug>.json`; importing into an existing topic adds new items, skips the ones that already exist and never changes anything already saved.

## Scope

- **Schemas** (`schemas/`): `vocab.schema.json`, `lesson.schema.json`, `interview.schema.json`, each the shared envelope plus its item shape. The API embeds them.
- **API** (`Modules/Content/`): content types, JSON-pointer-to-line mapping, the validator (JsonSchema.Net 9.6.0), the merge, `POST /api/import/validate` and `POST /api/import`.
- **Prompts** (`prompts/`): `vocab.md`, `lesson.md`, `interview.md`.
- **Renderer** (`src/modules/content/`): the shared import panel and the "Promptu kopyala" button, shown on the İngilizce, Öğrenme and Mülakat pages (still without topic lists).
- **Docker**: the build context moves to the repo root so the image build can read `schemas/`.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Schema library | **JsonSchema.Net 9.6.0** (draft 2020-12). Its English messages are replaced by Turkish ones through `ErrorMessages`. |
| Where the panel shows | **On each module page.** İngilizce, Öğrenme and Mülakat show their empty state with "Promptu kopyala" and the import panel; each page imports only its own type. Topic lists come in 5.2–5.4. |
| Prompt language | **English.** Each template starts with `Topic:` and `Level:` lines the user fills in, then asks for JSON only, with an example. |
| `level` | **Fixed list per type.** vocab: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`. lesson and interview: `beginner`, `intermediate`, `advanced` (shown in Turkish later: başlangıç / orta / ileri). |
| Vocab meaning | **Both.** `meaning` (Turkish, required) and `definition` (English, optional). `term`, `meaning`, `example` are required. |
| Interview tags | **Both.** Topic `tags` in the envelope and optional `tags` per question; the 5.3 filter uses both. |
| Different level on merge | **The existing level stays.** The report says so (`levelKept: true`). |
| Renderer fake API | Content pages get their own small fake (`modules/content/testing/fakeContentApi.ts`); the shared goals fake is not touched (another branch is changing it). |
| Deviation: schema error messages | JsonSchema.Net's evaluation paths did not resolve back into the schema JSON (the `items` property and keyword share a name), so the rule behind a message is found from the value's instance path instead, and the library's `ErrorMessages` are not changed (no global state). |
| Deviation: file input label | "Ya da bir JSON dosyası seç" (a native file input with its own button) instead of "Dosya seç". |
| Deviation: prompt lines | The templates also have a third line for the number of cards, questions or parts. |
| Deviation: tag union | The union of a topic's tags is not capped at 10 (each import still is). |
| Fix found in manual testing | The three module routes render the same component, so the panel kept its text when switching modules; it now has a key per type (`fix(content): give each module page its own import state`). |

## User stories

1. **As the user**, I click "Promptu kopyala", paste the prompt into an AI chat, paste the JSON answer into the box and click "İçe aktar"; I see "Phrasal verbs for meetings: 12 öğe eklendi, 3 öğe zaten vardı."
2. **As the user**, when the AI's answer is wrong I see every problem with its line ("Satır 14 · items[2]: Eksik alan: meaning") and nothing is saved.
3. **As the user**, I import a second file for the same topic and only the new items are added; what I already had is unchanged.
4. **As the user**, I pick a `.json` file instead of pasting, and its text goes into the box.

## Business and technical rules

### Envelope (every schema)

| Field | Rule |
|---|---|
| `schemaVersion` | required, `1` |
| `type` | required, the schema's own type (`"vocab"`, `"lesson"`, `"interview"`) |
| `topic` | required string, 1–120 characters, not only spaces |
| `level` | required, from the type's list above |
| `tags` | optional array of strings (each 1–30 characters), at most 10; normalized like session tags (`Tags.Normalize`) and each must be valid then |
| `items` | required array, 1–500 items |

Every object has `additionalProperties: false`, so unknown properties are errors.

### Items

| Type | Module folder | Fields | Merge key |
|---|---|---|---|
| `vocab` | `english` | `term` (1–100), `meaning` (1–300, Turkish), `example` (1–500), `definition?` (1–300, English) | `term` |
| `lesson` | `learning` | `title` (1–200), `summary` (1–1,000), `body` (1–20,000), `exercises?` (array of 1–1,000 character strings, at most 20) | `title` |
| `interview` | `interview` | `question` (1–500), `answer` (1–5,000), `difficulty` (`easy` \| `medium` \| `hard`), `code?` (1–5,000), `tags?` (like the envelope `tags`) | `question` |

- **Normalized key** (`ContentKey.Key`): trim, whitespace runs → one space, `SearchText.Fold` (case and Turkish letters ignored). "Follow up ON " and "follow up on" are the same item.
- **Topic slug** (`ContentKey.Slug`): accents removed (Unicode decomposition), `SearchText.Fold`, every run of characters other than `a–z` and `0–9` → `-`, `-` trimmed from both ends, at most 80 characters. "Phrasal verbs — İş toplantıları" → `phrasal-verbs-is-toplantilari`. A topic whose slug is empty is an error on `/topic` ("Konu adı en az bir harf veya rakam içermeli.").

### Validation (`ImportValidator`)

Checks run in this order and stop at the first failing step:

1. Text empty or only spaces → "JSON metni boş."
2. Text over 2 MB (UTF-8 bytes) → "Dosya 2 MB'tan büyük olamaz."
3. One surrounding Markdown code fence (```` ```json ```` … ```` ``` ````, as AI chats often add) is accepted: its two lines are blanked, so line numbers stay right. Anything else outside the JSON is a syntax error.
4. Parse (no comments, no trailing commas, duplicate property names rejected) → "Geçerli JSON değil: …" with the line of the problem. The root must be an object ("JSON bir nesne olmalı.").
5. Schema of the expected type. Every failing keyword gives one error: `{ path, line, message }`, where `path` is the JSON pointer of the value (`/items/2/meaning`), `line` is the 1-based line where that value starts and `message` is Turkish (for example "Eksik alan: meaning", "Bilinmeyen alan: q", "En fazla 100 karakter olabilir.", "Şunlardan biri olmalı: A1, A2, B1, B2, C1, C2", "Metin olmalı."). Summary errors of applicator keywords (`properties`, `items`) are dropped, since their children are listed.
6. Rules the schema cannot express: tag normalization (`/tags/0`, `/items/3/tags/1`) and the topic slug.

Errors are sorted by line, then path. A file with errors is never saved.

### Merge (`ImportService`)

- File: `content/<module folder>/<slug>.json`, through `JsonFileStore.UpdateAsync` (atomic, one lock per file), `DocumentSchema(1, [])`:

  ```json
  { "schemaVersion": 1, "type": "vocab", "topic": "Phrasal verbs for meetings", "slug": "phrasal-verbs-for-meetings",
    "level": "B2", "tags": ["english", "work"], "createdAt": "…", "updatedAt": "…",
    "items": [ { "id": "<guid>", "addedAt": "…", "term": "follow up on", "meaning": "…", "example": "…" } ] }
  ```

- New topic: the file is created with the imported `topic`, `level` and normalized `tags`.
- Existing topic: `topic` (display name) and `level` stay; `tags` are unioned (existing first); each item whose normalized key is not in the topic yet is appended with a new `id` and `addedAt`; items whose key exists are skipped. Duplicates inside one file: the first is added, the rest skipped. Existing items (and any progress fields later phases add to them) are never changed. `updatedAt` changes only when items or tags were added; when nothing is new the file is not written. The tag union has no cap of 10 (each import still has at most 10).
- Report: `{ type, topic, slug, created, added, skipped, levelKept }` (`topic` is the stored name; `levelKept` is true when the file's `level` differed and was ignored).

### Endpoints

- `POST /api/import/validate` with `{ type, text }` → `200 { errors: [...] }` (empty when valid).
- `POST /api/import` with `{ type, text }` → `200 { errors: [], report }` when saved, `200 { errors: [...], report: null }` when not. Import problems are a normal answer for the import panel, not a form-field `400`.
- Unknown `type` → `400` validation problem on `type`: "Tür vocab, lesson veya interview olmalı.".
- Request size limit 8 MB (room for JSON escaping around a 2 MB text).

### Renderer

- `ImportPanel` (props: `type`, `onImported?`): a labelled textarea "İçe aktarılacak JSON", a file input "Ya da bir JSON dosyası seç" (`.json`, its text replaces the box; over 2 MB → "Dosya 2 MB'tan büyük olamaz." without a request), "Kontrol et" (validate) and "İçe aktar" (import). Both are disabled while the box is empty or a request runs.
- Errors: "N sorun bulundu:" and an ordered list, one row per error: "Satır 14 · items[2].meaning: Eksik alan: meaning" (pointer shown as `items[2].meaning`; no line → no "Satır" part; empty path → only the message).
- While a request runs: "Kontrol ediliyor…". Valid check: "Sorun yok, içe aktarılabilir." Saved: "<topic>: N öğe eklendi, M öğe zaten vardı." plus "Konu zaten vardı; seviyesi değiştirilmedi." when `levelKept`. The box is cleared after a save; `onImported(report)` is called.
- Request failure: "İçe aktarma yapılamadı.".
- `CopyPromptButton` (prop: `type`): copies `prompts/<type>.md` (bundled with Vite `?raw`) with `navigator.clipboard.writeText`, then "Kopyalandı." or "Kopyalanamadı.".
- The İngilizce, Öğrenme and Mülakat pages: `ContentEmptyPage` = the existing empty state with `CopyPromptButton` and `ImportPanel` under it.

## Out of scope

| Item | Where it goes |
|---|---|
| Topic lists, cards, practice, progress | Phases 5.2–5.4 |
| `link-analysis` schema | Phase 11.3 |
| Inbox folder import, AI API calls | Phases 9.2, 9.3 |
| Editing or deleting imported items | Not planned for the MVP |
| Replacing an existing item with a new version | Not planned (merge never overwrites) |

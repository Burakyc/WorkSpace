# Requirements — Phase 11.1 Style prompt

**Roadmap phase:** 11.1 Style prompt (Post assistant)
**Branch:** `feat/11.1-style-prompt`, cut from the milestone branch `claude/milestone-11-fc0882`
**Estimate:** 1 day at 1–2 hours/day

## Goal

The user writes the style prompt that later post drafts follow, sees two examples and can go back to any of the last 10 versions. This phase only stores the text; drafts come in 11.2.

## Scope

- **API:** new folder `Modules/Posts/`: `StyleService`, `PostsController`, `GET` and `PUT /api/posts/style`, `style.json`.
- **Renderer:** new module `modules/posts/`, sidebar item "Gönderiler" (`/posts`) with the style section.
- **Prompts:** `prompts/style-example-en.md`, `prompts/style-example-tr.md`.
- `tech-stack.md`, `roadmap.md` updated. No new packages.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Place | **New sidebar item "Gönderiler"**, after "Mülakat". The style prompt is a section of that page; the drafts of 11.2 and 11.3 join the same page. |
| First open | **Empty box and examples.** The box starts empty; the examples are read-only next to it, each with a button that puts it in the box. Nothing is saved until "Kaydet". |
| Example language | **Both**: one English and one Turkish example, each asking for posts in its language. |
| History | **"Kaydet" makes a version** (only when the text changed; no autosave). An old version's "Kutuya al" puts its text in the box; saving it is a separate step. The last 10 old versions are kept. |

## User stories

1. **As the user**, I open Gönderiler, take an example into the box, change it and save it.
2. **As the user**, I change my style prompt later and the old text moves to the history.
3. **As the user**, I bring back an old version into the box, read it and save it if I want it.

## Business and technical rules

### API

- `GET /api/posts/style` answers `{ text, updatedAt, history: [{ text, savedAt }] }`; without a file `{ text: "", updatedAt: null, history: [] }`. History is newest first.
- `PUT /api/posts/style` with `{ text }` answers the same shape. Trailing whitespace is trimmed. Over 5,000 characters → `400` on `text` ("Stil promptu en fazla 5.000 karakter olabilir."). A null text counts as empty.
- The same text as the current one writes nothing and keeps `updatedAt`.
- A different text becomes the current one with `updatedAt` now. The old non-empty text goes to the front of `history`, with `savedAt` = its `updatedAt`. History keeps the 10 newest.
- An empty text is allowed and means "no style". It is not a history entry itself, so going from empty to a text adds nothing to the history.
- `style.json`: `{ schemaVersion: 1, text, updatedAt, history }`, written through `JsonFileStore.UpdateAsync` (atomic, one lock).

### Renderer

- Page `/posts`: title "Gönderiler" and a line saying the app only prepares drafts and never posts.
- Section "Stil promptu": a labelled textarea, "Kaydet" (disabled when nothing changed or while saving), status "Kaydedilmemiş değişiklik var." / "Kaydedildi.", a field error under the box.
- Hint while the saved text is empty: "Henüz stil promptun yok. Bir örneği kutuya al ya da kendin yaz."
- Examples: "İngilizce örnek" and "Türkçe örnek" as text (line breaks kept), with "İngilizce örneği kutuya al" and "Türkçe örneği kutuya al". They are bundled with Vite `?raw`.
- "Geçmiş sürümler": each version shows its date (`tr-TR`), the full text and "Kutuya al" (its accessible name includes the date). Empty: "Henüz eski sürüm yok."
- "Kutuya al" (example or version) replaces the box, moves focus to the box and saves nothing. The box and the status show it as an unsaved change.
- A failed load shows "Stil promptu yüklenemedi."; a failed save "Stil promptu kaydedilemedi." and keeps the text.
- All texts are rendered as text.

## Out of scope

| Item | Where it goes |
|---|---|
| Using the style prompt in a draft | 11.2 |
| Diffing versions | Not planned; the text is short |
| A warning when leaving with unsaved text | Not planned; the daily log has none either |
| Deleting one history entry | Not planned; older ones fall off after 10 |

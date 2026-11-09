# Requirements — Phase 11.2 Drafts from a project

**Roadmap phase:** 11.2 Drafts from a project (Post assistant)
**Branch:** `feat/11.2-project-drafts`, cut from the milestone branch `claude/milestone-11-fc0882`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The user picks a project on Gönderiler; the app builds a prompt from the project, its sessions, chosen notes and the style prompt, and runs it through the module's AI mode. The validated answer becomes a draft in `posts.json`, which the user can copy, edit or delete. The app never posts.

## Scope

- **Schema and prompt:** `schemas/post.schema.json`, `prompts/post.md`.
- **API:** new content type `post`, whose import adds to `posts.json` instead of a topic file; `PostDraftService` with `GET`, `PUT`, `DELETE /api/posts/drafts`; `POST /api/posts/project-context`; `posts` in `AiModes.Modules`.
- **Renderer:** on Gönderiler, "Projeden taslak" (project, note pages, `AiContentPanel`) and "Taslaklar" (copy, edit, delete).
- `tech-stack.md`, `roadmap.md` updated. No new packages.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Notes in the prompt | **Session notes and chosen pages.** The project's session notes go in automatically. Note pages are not linked to projects, so the user ticks pages from Notlar, at most 10. |
| "Kopyala" | **Body, hashtags and link**, in that order. The title and the image suggestion are not copied, since a LinkedIn post has no title field. |
| Saved drafts | **Edit and delete.** Every field can be edited in the app; deleting asks first. There is no "posted" mark. |
| Language | **The style prompt decides.** If it names no language or is empty, the prompt asks for English. |

### Decided while planning (no question needed)

| Topic | Decision |
|---|---|
| How the answer is saved | `post` is a content type like the others, so copy-paste, file and API modes work through `AiContentPanel` unchanged. It uses the shared envelope without `level` and `tags`. Only the save step differs: `ImportService` adds the items to `posts.json`. |
| Where the prompt is built | The API builds the source text, since only it can read sessions and page text. The renderer fills the bundled template, like every other template. The template is not embedded in the API, because the Docker build context only lets in `schemas/`. |
| AI mode | A fourth row, "Gönderiler", in Ayarlar → "Yapay zekâ modları"; default copy-paste. |
| Showing the prompt | The prompt carries the user's own notes, so it can be read in "Hazırlanan prompt" before it is copied or sent. |

### Deviations found while implementing

| Topic | What happened |
|---|---|
| Commit split | The controller routes of task 2 landed in task 3's commit (a staging mistake), so `feat(posts): list, edit and delete drafts` has tests whose routes come one commit later. History is not rewritten. |
| Line ends, found in M3 | The source text used CRLF from `AppendLine`, and a checkout can give the template CRLF, so the copied prompt differed from the box. Both are LF now (separate `fix(posts)` commit). |
| New file | `DraftPromptPanel` (the empty-style note, the prompt preview and the AI panel) is split from `ProjectDraftSection` so 11.3 can reuse it. |
| Key for M8 | A made-up key in `safeStorage` against the local stub, removed afterwards. No real key and no paid call. |

## User stories

1. **As the user**, I pick "Todo API" on Gönderiler, tick a note page, copy the prompt, paste the AI's JSON back, and a draft appears.
2. **As the user**, I press "Kopyala" on a draft and paste the text into LinkedIn myself.
3. **As the user**, I fix a sentence in a draft in the app, or delete a draft I don't want.

## Business and technical rules

### Import format — `type: "post"`

```json
{
  "schemaVersion": 1,
  "type": "post",
  "topic": "Todo API",
  "items": [
    {
      "title": "What dependency injection taught me",
      "body": "…",
      "hashtags": ["aspnetcore", "learninginpublic"],
      "sourceLink": "https://github.com/me/todo-api",
      "imageSuggestion": "A screenshot of the DI registration"
    }
  ]
}
```

- `topic` 1–120 characters, `items` 1–5. `title` 1–120, `body` 1–3,000 (LinkedIn's limit), optional `hashtags` (at most 10, each 1–50 characters without spaces, `#` optional), optional `sourceLink` (`https://`, up to 2,000), optional `imageSuggestion` (up to 500). No other properties.
- A failed `pattern` other than the "not only spaces" one reads "Biçimi geçersiz."

### `posts.json`

- `{ schemaVersion: 1, items: [{ id, topic, title, body, hashtags, sourceLink, imageSuggestion, createdAt, updatedAt }] }`, through `JsonRepository<PostDraft>`.
- Import: each item gets a new id and dates; hashtags lose a leading `#`. An item whose normalized title (`ContentKey.Key`) exists is skipped and counted as `skipped`, so importing a file twice adds nothing and nothing is overwritten. `report.topic` is the file's topic, `created` is true when something was added, `levelKept` false.
- The report line for this type reads "Todo API: 1 taslak eklendi, 0 taslak zaten vardı."

### Drafts — `/api/posts/drafts`

- `GET` lists them newest first (`createdAt` descending).
- `PUT /{id}` with `{ title, body, hashtags, sourceLink, imageSuggestion }` applies the schema's limits with Turkish errors per field; `topic` and `createdAt` stay; `updatedAt` is now. Empty link or suggestion → null. Unknown id → `404`.
- `DELETE /{id}` → `204`; unknown → `404`.

### Source text — `POST /api/posts/project-context`

- Input `{ projectId, noteIds }`. Unknown project → `400` on `projectId`. More than 10 pages, an unknown id or a folder → `400` on `noteIds`. Archived projects are allowed by the API.
- Answer `{ topic, text }`, where `topic` is the project title and `text` has English labels:

  ```
  Project: Todo API
  Goal: Learn ASP.NET Core
  Project link: https://github.com/me/todo-api
  Completed sessions: 12 (300 minutes), 2026-11-01 to 2026-11-08
  Tags: di (5), ef-core (3)

  Session notes, newest first:
  - 2026-11-08: Registered the repository as scoped.

  Note page "DI notes":
  <page text>
  ```

- A line or block without data is left out. Stopped-early sessions don't count in the numbers, but their notes are used. At most the 50 newest session notes; each page's text is cut at 5,000 characters. Dates are local.

### Prompt — `prompts/post.md`

- Placeholders `{{topic}}`, `{{style}}`, `{{source}}`, filled in one pass, so a note containing `{{style}}` stays as it is.
- It asks for one draft, tells the AI to treat the source as data and not to invent facts or links, and to use the project link as `sourceLink` when there is one.
- Empty style: `{{style}}` becomes "(none)".

### Renderer — "Projeden taslak"

- A project select grouped by goal (active projects). No project: "Önce Hedefler'den bir proje ekle." with a link.
- "Not sayfaları (isteğe bağlı)" in a `<details>`: one checkbox per page; at 10 ticked the others are disabled.
- After a project is picked the panel appears: `<AiContentPanel module="posts" type="post" prompt=… onImported=… />`. A change of project, pages or saved style rebuilds the prompt. Nothing calls an AI on its own.
- "Hazırlanan prompt" (`<details>`, read-only box). With an empty style: "Stil promptun boş; taslak varsayılan üslupla yazılır."
- A failed context load: "Proje bilgileri okunamadı."

### Renderer — "Taslaklar"

- Newest first; each shows title, topic and date, body (line breaks kept), `#hashtags`, the link with "Aç" (`openExternal`) and the image suggestion, all as text.
- "Kopyala" writes body, hashtags and link, separated by blank lines, to `navigator.clipboard` and shows "Kopyalandı."
- "Düzenle" opens a form (Başlık, Metin, Hashtag'ler separated by spaces, Kaynak bağlantısı, Görsel önerisi) with "Kaydet" and "Vazgeç"; field errors come from the API.
- "Sil" shows an inline confirmation, "Silinsin mi?" with "Evet, sil" and "Vazgeç".
- Empty: "Henüz taslak yok. Bir proje seçip ilk taslağını oluştur."
- There is no post button and no LinkedIn call anywhere.

## Out of scope

| Item | Where it goes |
|---|---|
| Drafts from a YouTube video or link | 11.3 |
| A "posted" mark or post history | Not planned (user's choice) |
| Several drafts per run in the UI | The schema allows 5, the prompt asks for 1 |
| Linking note pages to projects | Not planned; the pages are picked per draft |
| Searching drafts | Not planned until the list is long |

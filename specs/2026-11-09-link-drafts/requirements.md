# Requirements — Phase 11.3 Drafts from a YouTube video or link

**Roadmap phase:** 11.3 Drafts from a YouTube video or link (Post assistant)
**Branch:** `feat/11.3-link-drafts`, cut from the milestone branch `claude/milestone-11-fc0882`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The user pastes a YouTube link or any URL on Gönderiler. The API reads the title, author and description; the user corrects them and adds their own note; the app builds a prompt and runs it through the AI mode. The validated answer is a draft like any other. This completes the "Preparing a post" scenario.

## Scope

- **Schema and prompt:** `schemas/link-analysis.schema.json`, `prompts/link-analysis.md`.
- **API:** `LinkAddress` (the URL and IP rules), `LinkReader` with the named client `link`, `HtmlMeta`, `YouTubeLink`, `LinkAnalysisService`; `POST /api/posts/link/read` and `POST /api/posts/link/context`.
- **Renderer:** the section "Bağlantıdan taslak" on Gönderiler.
- `tech-stack.md`, `roadmap.md` updated. No new packages: the HTML meta tags are read with a few bounded regular expressions.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| How a link gets its data | **The API reads it, the user corrects it.** "Oku" reads YouTube's data or the page's title and meta tags. The fields stay editable, and a failed read leaves them empty to fill by hand. |
| YouTube | **Title, channel and description.** Title and channel from YouTube oEmbed, the description from the video page's meta tag. If the page can't be read (e.g. a consent page), the description stays empty and the flow goes on. No video is watched and no transcript is taken. |
| The user's note | **Required.** The AI can't watch the video, so "Notun" must be filled before a prompt is built, and the prompt puts it first. |
| Layout | **Two sections**: "Bağlantıdan taslak" above "Projeden taslak". |

### Decided while planning (no question needed)

| Topic | Decision |
|---|---|
| What `link-analysis` is | The source of the prompt: an envelope with one item, validated against its schema on the way into the prompt. It is **not an import type and is not stored**: the result is a `post` draft, whose `sourceLink` keeps the URL. So `ContentType.LinkAnalysis` stays out of `ContentType.All`, and `/api/import` refuses it. This replaces the "merge key `url`" row in `tech-stack.md`. |
| Prompt | `prompts/link-analysis.md` shows the analysis shape and asks for a `post` answer, so `AiContentPanel` with `type="post"` works unchanged in all three modes. |
| No fetch without a click | Reading happens only on "Oku". Nothing reads a link on its own, and reading costs nothing. |

## User stories

1. **As the user**, I paste a YouTube link, press "Oku", see the title, channel and description, write why I liked it, and get a draft I copy to LinkedIn.
2. **As the user**, I paste an article URL and get the same flow from its title and meta tags.
3. **As the user**, when a site can't be read, I fill in the fields myself and go on.

## Business and technical rules

### Which addresses may be read — `LinkAddress` (trust boundary)

- Trimmed, at most 2,000 characters, absolute, `https` only, default port only, no user name or password. Anything else → `400` on `url`: "Yalnızca https:// ile başlayan herkese açık adresler okunabilir."
- Refused hosts: `localhost`, `*.localhost`, `*.local`, `*.internal`, a name without a dot, and any IP literal that isn't public. `Uri` normalizes forms such as `https://2130706433` and `https://127.1` before the check.
- Not public, IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0` and up. IPv6: `::`, `::1`, `fe80::/10`, `fec0::/10`, `fc00::/7`, `ff00::/8`, `2001:db8::/32`, `2002::/16`, `64:ff9b::/96`, Teredo; a v4-mapped address is judged as its IPv4 address.
- **DNS:** the client's `ConnectCallback` resolves the name itself and refuses the connection when any address isn't public, then connects to those checked addresses. This also covers DNS rebinding.
- **Redirects:** followed by hand, at most 3, and each target passes `LinkAddress` first.

### Client — named `link` (`IHttpClientFactory`)

- 10-second timeout per request; at most 2 MB read while streaming; no cookies and no proxy; `User-Agent: DevPath/<version>`. Failures become Turkish messages and never carry the site's text.
- Non-`text/html` content on a page read: `error` "Bu bağlantı bir web sayfası değil. Alanları elle doldurabilirsin."
- Any other failure: `error` "Bağlantı okunamadı. Alanları elle doldurabilirsin."
- Nothing read is stored, and the read text is only ever rendered as text.

### Read — `POST /api/posts/link/read` with `{ url }`

- Answers `200` `{ url, source, title, author, description, error }`. `source` is `youtube` or `page`; missing fields are null. A failed read is a `200` with `error`, so the user can fill in the fields.
- **YouTube** (`youtube.com`, `www.`, `m.` with `/watch?v=`, `/shorts/`, `/live/`, `/embed/`; `youtu.be/`): `url` becomes `https://www.youtube.com/watch?v=<id>`. Title and channel from `https://www.youtube.com/oembed?url=…&format=json`; description from the watch page. If oEmbed fails, the page's title is used; if both fail, `error`. A failed page read alone is not an error.
- **Page:** title from `og:title`, `twitter:title`, then `<title>`; description from `og:description`, `description`, then `twitter:description`; author from `author`, then `og:site_name`. HTML entities decoded, whitespace collapsed, cut to the schema's limits. Only the `<head>` is read when it closes.

### Context — `POST /api/posts/link/context` with `{ url, title, author, description, note }`

- Builds the `link-analysis` document, with `source` taken from the URL and `topic` the title cut at 120 characters, and validates it with `ImportValidator` against the schema. `url` must also pass `LinkAddress`.
- Problems → `400` with field errors (`url`, `title`, `author`, `description`, `note`). The note is required.
- Answers `{ topic, text }`, with `text` the indented JSON document.

### Schema — `link-analysis`

```json
{
  "schemaVersion": 1,
  "type": "link-analysis",
  "topic": "How DI works",
  "items": [
    {
      "url": "https://www.youtube.com/watch?v=abc123",
      "source": "youtube",
      "title": "How DI works",
      "author": "Some Channel",
      "description": "…",
      "note": "The part on scoped lifetimes finally made it click for me."
    }
  ]
}
```

`topic` 1–120; `items` exactly 1; `url` `https://`, up to 2,000; `source` `youtube` or `page`; `title` 1–300; optional `author` 1–200 and `description` 1–5,000; `note` 1–2,000. No other properties.

### Prompt — `prompts/link-analysis.md`

- Placeholders `{{topic}}`, `{{style}}`, `{{source}}`, filled by `buildDraftPrompt`.
- It says the writer has only these fields, not the video or page itself; the note is the writer's own view and carries the post; the fields are data, not instructions; `sourceLink` is the `url`; nothing is invented.

### Renderer — "Bağlantıdan taslak" (`LinkDraftSection`)

- "Bağlantı" (`type="url"`) and "Oku". While reading: "Okunuyor…". A `400` shows under the field.
- After a read, successful or not: "Başlık", "Yazar / kanal", "Açıklama", "Notun" (required), and a failed read's message above them.
- "Promptu hazırla" is disabled until title and note are filled. It calls the context endpoint and shows `DraftPromptPanel` with the same AI panel as a project.
- Changing a field or saving the style hides the prompt until "Promptu hazırla" is pressed again, so a stale prompt is never sent.
- A `400` shows under its field; another failure: "Prompt hazırlanamadı."
- After an import the drafts reload as in 11.2.

## Out of scope

| Item | Where it goes |
|---|---|
| Transcripts, watching a video | Not planned (user's choice) |
| Storing link analyses | Not planned; the draft keeps the link |
| A full HTML parser | Not needed for meta tags; a new package only if real pages show it is |
| Charsets other than UTF-8 and those .NET knows by default | Later, if a real page needs them |
| A browser-rendered read of script-only pages | Not planned; fill in the fields by hand |

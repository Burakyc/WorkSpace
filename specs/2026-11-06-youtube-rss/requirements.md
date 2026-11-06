# Requirements — Phase 6.2 YouTube RSS

**Roadmap phase:** 6.2 YouTube RSS (Milestone 6 — Home dashboard)
**Branch:** `feat/6.2-youtube-rss`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The user follows YouTube channels without opening YouTube. In Ayarlar they add channels by channel ID or `/channel/` URL; the API checks each one against its RSS feed and keeps the channel's name. The API refreshes every channel's RSS in the background when it starts and every 6 hours, and caches the videos in `cache/youtube.json`. Ana Sayfa gets a **Yeni videolar** card with the 10 newest videos (thumbnail, title, channel, date); a click opens the video in the default browser. When a refresh fails, the card still shows the cached list together with the error.

## Scope

- **API** (`Modules/Home/`): `YouTubeChannelId` (input parsing), `YouTubeRss` (Atom parsing), `YouTubeFeedClient` (HTTP), `YouTubeService` (channels, cache, refresh), `YouTubeRefresher` (background), `YouTubeController` (`/api/youtube/…`), registered in `AddYouTube()`.
- **Tests**: a default handler in `ApiFactory` that fails every outgoing HTTP call, so no API test can reach the network; stub handlers per test.
- **Renderer**: the "YouTube kanalları" section in Ayarlar; the `VideosCard` on Ana Sayfa.
- `tech-stack.md` updated.
- No new packages (`System.Xml.Linq` and `IHttpClientFactory` are part of .NET / ASP.NET Core).

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Channel input | **Channel ID or `/channel/` URL.** `UC` + 22 letters, digits, `-` or `_`, or `https://www.youtube.com/channel/<id>` (with or without `https://`, `www.` / `m.`, a trailing path or query). `@handle` URLs are refused with a hint to copy the channel ID. |
| Check on add | **Yes, and keep the name.** Adding fetches the channel's RSS once; a channel that does not exist or cannot be reached is not added. The feed's title is saved as the channel name and its videos go straight into the cache. |
| Card | **The 10 newest videos across all channels**, one list by `publishedAt`. |
| Manual refresh | **"Yenile" on the card** refreshes every channel at once. Adding a channel also puts its videos in the cache. |
| Refresh time (implementation) | The card shows "Son yenileme" (`lastRefreshAt`, the last attempt) instead of a "last successful refresh" time: the API keeps success times per channel only, and the error line already says which channels failed. |
| Error display (implementation) | The failure is shown **inside the Yeni videolar card** (danger border, the Turkish error above the cached list), the same way 6.1 shows feed errors. |

## User stories

1. **As the user**, I paste a channel ID or channel URL in Ayarlar and see the channel's name in the list; a wrong ID gives a clear error.
2. **As the user**, I open the app and see the newest videos of my channels without waiting; they refresh by themselves.
3. **As the user**, I click a video and it opens in my browser.
4. **As the user**, when I am offline the card still shows the last videos and tells me the refresh failed.

## Business and technical rules

### Channels (`settings.json`, section `youtube`)

```json
{ "schemaVersion": 1, "pomodoro": { … }, "youtube": { "channels": [ { "id": "UC…", "title": "…" } ] } }
```

- Written through `JsonFileStore.UpdateAsync` on `settings.json` (the same file and schema as the pomodoro settings), in the order added. At most 50 channels.

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/youtube/channels` | – | `[{ id, title }]` |
| POST | `/api/youtube/channels` | `{ "input": "…" }` | `201` with the channel |
| DELETE | `/api/youtube/channels/{id}` | – | `204`; removes the channel and its cached videos; unknown id → `404` |

Errors (`400`, field `input`):

- Not an ID or `/channel/` URL: "Kanal ID'si (UC ile başlar) ya da youtube.com/channel/… adresi gir."
- An `@handle` URL: "@kullanıcı adresleri desteklenmiyor. Kanal sayfasındaki kanal ID'sini (UC…) gir."
- Already added: "Bu kanal zaten ekli."
- 50 channels: "En fazla 50 kanal eklenebilir."
- RSS answers `404`: "Kanal bulunamadı."
- Network error, timeout, other status or unreadable feed: "Kanal kontrol edilemedi. İnternet bağlantını kontrol et."

### Fetching (`YouTubeFeedClient`)

- `GET https://www.youtube.com/feeds/videos.xml?channel_id=<id>` with the named `HttpClient` `youtube` from `IHttpClientFactory`, timeout 10 seconds, responses over 2 MB refused.
- `YouTubeRss.Parse`: Atom with the `yt:` namespace. DTDs are prohibited. The feed `<title>` is the channel title. Each `<entry>` with a valid `yt:videoId` (11 characters), a non-empty `<title>` and a valid `<published>` becomes a video; other entries are skipped. The thumbnail is always `https://i.ytimg.com/vi/<videoId>/mqdefault.jpg` and the link `https://www.youtube.com/watch?v=<videoId>` (built from the id, so nothing from the feed becomes a URL; `i.ytimg.com` is already in the CSP).

### Cache (`cache/youtube.json`)

```json
{
  "schemaVersion": 1,
  "channels": [
    { "channelId": "UC…", "fetchedAt": "…", "videos": [ { "id", "title", "publishedAt" } ] }
  ],
  "lastRefreshAt": "…",
  "error": null
}
```

- **Refresh** fetches every channel one after another. A channel that succeeds gets its videos and `fetchedAt` replaced; a channel that fails keeps its old videos. `lastRefreshAt` is the refresh time (`TimeProvider`); `error` is null when all channels succeeded, otherwise "Güncellenemeyen kanallar: A, B." (channel titles). With no channels, nothing is fetched.
- Refreshes never overlap (one `SemaphoreSlim`); a manual refresh during a background one waits for it and then runs.
- **Background** (`YouTubeRefresher`, a `BackgroundService`): one refresh right after start, then every 6 hours (`PeriodicTimer` with the `TimeProvider`). An exception is logged and the loop goes on.

### `GET /api/youtube/videos` and `POST /api/youtube/refresh`

Both answer `200` with:

```json
{ "videos": [ { "id", "title", "channelId", "channelTitle", "publishedAt", "thumbnailUrl", "url" } ], "lastRefreshAt": "…" | null, "error": "…" | null }
```

- `videos`: the 10 newest of the current channels' cached videos (`publishedAt` descending). Videos of a removed channel never show.
- `GET` reads only the cache and never fetches, so Ana Sayfa never waits on the network. `POST /refresh` runs a refresh first.

### Renderer

- **Ayarlar → YouTube kanalları**: the channel list (title, muted id, "Kaldır"); a field "Kanal ID'si veya adresi" with "Ekle" ("Ekleniyor…" while checking). API errors show under the field. Removing asks for no confirmation (a channel is quickly added again).
- **Ana Sayfa → Yeni videolar** (`VideosCard`): each video is a row with the thumbnail (`alt=""`, lazy loaded, 16:9), the title as a button that calls `openExternal(url)`, and "channel · date" muted. "Yenile" (disabled and "Yenileniyor…" while running) calls `POST /api/youtube/refresh` and shows its answer. A failed request keeps the list and shows "Videolar yenilenemedi.".
  - No channels: "Henüz kanal yok." with a link to Ayarlar.
  - Channels but no cached videos: "Videolar henüz çekilmedi." plus "Yenile".
  - `error` set: danger border and the error text above the cached list. The card shows "Son yenileme: <lastRefreshAt>" whenever a refresh has run.
  - A failed `GET`: "Videolar yüklenemedi."

## Out of scope

| Item | Where it goes |
|---|---|
| `@handle` and `/c/` URLs | Not planned (needs scraping the channel page) |
| "New since your last visit" | Phase 6.3 |
| Watching videos inside the app, playlists, shorts filtering | Not planned |
| Reordering channels | Not planned |

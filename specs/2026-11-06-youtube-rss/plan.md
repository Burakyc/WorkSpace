# Plan — Phase 6.2 YouTube RSS

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/6.2-youtube-rss
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Channel input and RSS parsing

**Commit:** `feat(youtube): parse channel ids and RSS feeds`

- `Modules/Home/YouTubeChannelId.cs`, `Modules/Home/YouTubeRss.cs` (records `YouTubeFeed`, `YouTubeVideoEntry`).
- `YouTubeChannelIdTests.cs` (T1), `YouTubeRssTests.cs` (T2–T3).
- Check: `npm run check`.

### 2. Channels, cache and refresh

**Commit:** `feat(youtube): keep channels and cache their videos`

- `Modules/Home/YouTubeFeedClient.cs`, `Modules/Home/YouTubeService.cs`, `Modules/Home/YouTubeModule.cs` (`AddYouTube()` with the named client); registered in `Program.cs`.
- `ApiFactory`: a default primary handler that fails every outgoing call (`NoNetworkHandler`); `StubHttpHandler` test helper.
- `YouTubeServiceTests.cs` (T4–T7).
- Check: `npm run check`.

### 3. Endpoints and background refresh

**Commit:** `feat(youtube): refresh feeds in the background`

- `Modules/Home/YouTubeController.cs`, `Modules/Home/YouTubeRefresher.cs` (hosted in `AddYouTube()`).
- `YouTubeEndpointTests.cs` (T8–T9).
- Check: `npm run check`.

### 4. Renderer client

**Commit:** `feat(youtube): add the YouTube requests`

- Types `YouTubeChannel`, `YouTubeVideo`, `YouTubeVideos`; `listYouTubeChannels`, `addYouTubeChannel`, `removeYouTubeChannel`, `getYouTubeVideos`, `refreshYouTube`; fake API routes.
- `client.test.ts` (T10).
- Check: `npm run check`.

### 5. Channels in Ayarlar

**Commit:** `feat(settings): add and remove YouTube channels`

- `modules/settings/YouTubeChannelsForm.tsx`, used in `SettingsPage.tsx`.
- `YouTubeChannelsForm.test.tsx` (T11).
- Check: `npm run check`.

### 6. New videos card

**Commit:** `feat(home): show new YouTube videos`

- `modules/home/VideosCard.tsx` and CSS, added to `HomePage.tsx`.
- `HomePage.test.tsx` (T12–T15).
- Check: `npm run check`; manual M1–M6.

### 7. Docs

**Commit:** `docs: document the YouTube feed`

- `specs/tech-stack.md`: channels in `settings.json`, the endpoints, the cache, the background refresh, the test network guard.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 6.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 6.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/6.2-youtube-rss`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(youtube): parse channel ids and RSS feeds` |
| 2 | `feat(youtube): keep channels and cache their videos` |
| 3 | `feat(youtube): refresh feeds in the background` |
| 4 | `feat(youtube): add the YouTube requests` |
| 5 | `feat(settings): add and remove YouTube channels` |
| 6 | `feat(home): show new YouTube videos` |
| 7 | `docs: document the YouTube feed` |
| 8 | `docs(roadmap): mark phase 6.2 done` |

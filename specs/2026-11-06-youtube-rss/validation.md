# Validation — Phase 6.2 YouTube RSS

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 6.2, plus the decisions in [requirements.md](requirements.md):

- [ ] Settings: add/remove YouTube channels (channel ID or URL); a channel is checked against its RSS and saved with its name.
- [ ] API fetches channel RSS in the background on start and every 6 hours; caches to `cache/youtube.json`.
- [ ] "New videos" card with thumbnail, title, date; click opens in the default browser; "Yenile" refreshes.
- [ ] Offline or failed fetch shows the cached list plus an error.
- [ ] Ana Sayfa never waits on the network (`GET /api/youtube/videos` reads the cache only).
- [ ] Tests: RSS parsing, failure falls back to cache (stub HTTP handler); no API test can reach the network.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Channel input | `Modules/Home/YouTubeChannelIdTests.cs` | Bare id, `youtube.com/channel/<id>`, with `https://www.`, `m.`, trailing `/videos` or `?x=1` → the id; `@handle` → handle error; short id, other host, empty → format error |
| T2 | RSS parsing | `Modules/Home/YouTubeRssTests.cs` | A sample feed → channel title and videos (id, title, `publishedAt`); thumbnail and link built from the id |
| T3 | Odd feeds | same | Entries without id, with a bad id, empty title or bad date are skipped; not XML → error; a DTD → error |
| T4 | Add | `Modules/Home/YouTubeServiceTests.cs` | Stub `200` → channel saved with the feed title and its videos cached; `404` → "Kanal bulunamadı."; network error → "Kanal kontrol edilemedi…"; duplicate; 51st channel |
| T5 | Refresh | same | Two channels refreshed, cache replaced, `lastRefreshAt` set, `error` null; no channels → no HTTP call |
| T6 | Fallback | same | One channel fails → its old videos kept, the other updated, `error` "Güncellenemeyen kanallar: B." |
| T7 | Videos | same | The 10 newest across channels; videos of a removed channel gone; `GET` makes no HTTP call |
| T8 | Endpoints | `Modules/Home/YouTubeEndpointTests.cs` | With a stub handler: `POST` → `201`, `GET channels`, `POST refresh` → videos, `DELETE` → `204`, unknown → `404`; bad input → `400` with `input` |
| T9 | Network guard | same | Without a stub, adding a channel gives "Kanal kontrol edilemedi…" (the default test handler refuses the call) |
| T10 | Client | `src/shared/api/client.test.ts` | The five requests with their methods, paths and bodies |
| T11 | Settings | `src/modules/settings/YouTubeChannelsForm.test.tsx` | Add shows the channel title; an API error shows under the field; "Kaldır" removes it |
| T12 | Card | `src/modules/home/HomePage.test.tsx` | Videos with thumbnail, title button and "channel · date"; clicking the title calls `openExternal(url)` |
| T13 | Card error | same | `error` set → the error text and the cached list both shown |
| T14 | Yenile | same | "Yenile" calls the refresh and shows the new list; a failed refresh → "Videolar yenilenemedi." with the old list |
| T15 | Empty states | same | No channels → link to Ayarlar; channels but no videos → "Videolar henüz çekilmedi." |

## Manual test steps

Run `npm run dev` (online).

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar → YouTube kanalları: add `UC_x5XG1OV2P6uZZ5FSM9Ttw` (Google for Developers) | The channel appears with its name; `settings.json` has it |
| M2 | Add the same channel as `https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw/videos`; add `https://www.youtube.com/@GoogleDevelopers`; add `UCxxxxxxxxxxxxxxxxxxxxxx` | "Bu kanal zaten ekli."; the @handle error; "Kanal bulunamadı." |
| M3 | Ana Sayfa | Yeni videolar shows up to 10 videos with thumbnails; clicking a title opens it in the default browser |
| M4 | Restart the app | The card shows the list at once (from the cache); `cache/youtube.json` has a new `lastRefreshAt` shortly after start |
| M5 | Turn the network off (or block youtube.com), click "Yenile" | Danger border, "Güncellenemeyen kanallar: …", the cached list still shown |
| M6 | Network back, "Yenile"; then remove the channel in Ayarlar | Error gone; after removing, the card shows "Henüz kanal yok." |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M6 done with the expected results
- [ ] `roadmap.md` phase 6.2 ticked and set to `done`

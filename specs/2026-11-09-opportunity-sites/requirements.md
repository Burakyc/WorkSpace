# Requirements — Phase 12.1 Opportunity sites

**Roadmap phase:** 12.1 Opportunity sites (Opportunity tracker)
**Branch:** `feat/12.1-opportunity-sites`, cut from `main`
**Estimate:** 1 day at 1–2 hours/day

## Goal

The user keeps a short list of opportunity sites (internships, bootcamps, events, jobs) and opens any of them from Ana Sayfa with one click. The app stores only names and links; it never reads the sites.

## Scope

- **API:** new folder `Modules/Opportunities/`: `OpportunitySite`, `OpportunitySiteUrl` (parse and check), `OpportunityService`, `OpportunitiesController`; `AddOpportunities()` in `Program.cs`. Data in `settings.json` under `opportunities.sites`.
- **Renderer:** Ayarlar → new section "Fırsat siteleri" (`OpportunitySitesForm`); Ana Sayfa → new card "Fırsat siteleri" (`OpportunitiesCard`). Typed client methods.
- `tech-stack.md`, `roadmap.md` updated. No new packages.

The existing YouTube channel list (`YouTubeService`, `YouTubeChannelsForm`, `VideosCard`) is the pattern to follow: same `settings.json` section style, same `JsonFileStore.UpdateAsync` write, same add/remove form shape.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Starting sites | **Shown until the first edit.** With no `opportunities` section, the API answers the four defaults and writes nothing. The first add or remove saves the whole list. Removing every site saves an empty list, which stays empty; there is no reset button. |
| URL input | **Bare domain or https.** `patika.dev` becomes `https://patika.dev/`; `https://…` is kept; `http://` and any other scheme are refused. |
| Name | **Optional.** An empty name shows the host without `www.` (e.g. `coderspace.io`). |
| Branch | `feat/12.1-opportunity-sites` from `main`; fast-forward `main` at the end, no push. |

## User stories

1. **As the user**, I open Ana Sayfa, see my opportunity sites and click "coderspace.io" to check new events in my browser.
2. **As the user**, I add a site I found (e.g. `kariyer.net`) in Ayarlar, with or without a name.
3. **As the user**, I remove a site I no longer follow; it disappears from Ana Sayfa too.

## Business and technical rules

### Data

- `settings.json` → `opportunities: { sites: [{ id, name, url }] }`, in add order. `id` is the host in lower case without a leading `www.` (unique, so it doubles as the delete key). `name` is the saved name or `""`.
- Defaults, in this order: `youthall.com` "Youthall", `anbean.com.tr` "Anbean", `coderspace.io` "Coderspace", `patika.dev` "Patika.dev", each `https://<host>/`.
- A missing or unreadable `opportunities` section reads as the defaults; a broken entry is skipped. No `schemaVersion` change: `settings.json` stays on its version, sections are optional.

### URL rules (`OpportunitySiteUrl.Parse`)

- Trim. Empty → "Adres gerekli."
- No `://` → `https://` is put in front. Then it must parse as an absolute URI with scheme `https`, else "Sadece https adresleri eklenebilir." (`http://x.com`, `ftp://…`, `javascript:…` all land here).
- The host must contain a dot and no user info (`user@host`); otherwise "Geçerli bir adres gir." Ports are refused too (same message); a site never needs one.
- Over 2,000 characters → "Adres en fazla 2.000 karakter olabilir."
- A path and query are kept (e.g. `https://www.youthall.com/tr/jobs`). The saved URL is the parsed `AbsoluteUri`.

### API

- `GET /api/opportunities/sites` → `[{ id, name, url }]`.
- `POST /api/opportunities/sites` with `{ name, url }` → `201` and the saved site. Errors are `400` validation problems: `url` for the rules above and for "Bu site zaten ekli." (same `id`), `name` for "Ad en fazla 60 karakter olabilir.", and "En fazla 30 site eklenebilir." on `url`. The name is trimmed.
- `DELETE /api/opportunities/sites/{id}` → `204`, or `404` when no site has that id. Deleting a default site saves the remaining defaults.
- Writes go through `JsonFileStore.UpdateAsync` on `settings.json` (atomic, one lock), touching only the `opportunities` section.
- Nothing in this module makes an HTTP request (no named client is registered).

### Renderer

- **Ayarlar → "Fırsat siteleri"** (after "YouTube kanalları"): a list of sites (name or host, the URL as text, "Kaldır" with the site's name in its accessible name) and an add form with labelled "Ad (isteğe bağlı)" and "Adres" fields and "Ekle". A field error shows under its field; the form clears after a successful add. Empty list: "Henüz fırsat sitesi yok." A failed load: "Fırsat siteleri yüklenemedi."; a failed remove: "Site kaldırılamadı."
- A note under the heading: "Uygulama bu sitelerden ilan çekmez; sadece bağlantıları açar."
- **Ana Sayfa → "Fırsat siteleri"** card (after "Yeni videolar"): each site as a button with the name or host; a click calls `window.devpath.openExternal(url)` (main already refuses anything that is not https). Empty: "Henüz fırsat sitesi yok." with a link to Ayarlar. A failed load shows "Fırsat siteleri yüklenemedi." inside the card only.
- All names and URLs are rendered as text.

## Out of scope

| Item | Where it goes |
|---|---|
| Fetching, scraping or storing listings from the sites | Never (roadmap rule) |
| Editing or reordering a site | Not planned; remove and add again |
| A "back to defaults" button | Not planned (decision above) |
| Site icons (favicons) | Not planned; would need a request to the site |
| Tracking applications | "Job application tracking" in Later |

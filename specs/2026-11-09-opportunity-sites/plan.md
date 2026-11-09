# Plan — Phase 12.1 Opportunity sites

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/12.1-opportunity-sites` from `main`.

Every task ends with `npm run check` (after `npx prettier --write src` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Store the sites

**Commit:** `feat(opportunities): store the followed opportunity sites`

- `Modules/Opportunities/`: `OpportunitySite.cs` (records `OpportunitySite`, `OpportunitySiteInput`, the defaults), `OpportunitySiteUrl.cs`, `OpportunityService.cs`, `OpportunitiesController.cs`, `OpportunitiesModule.cs`; `AddOpportunities()` in `Program.cs`.
- Follow `YouTubeService` for reading and writing the `settings.json` section.
- `OpportunitySiteUrlTests`, `OpportunityServiceTests`, `OpportunityEndpointTests` (T1–T5).

### 2. Manage the sites in Ayarlar

**Commit:** `feat(opportunities): manage opportunity sites in Ayarlar`

- `types.ts` (`OpportunitySite`), `client.ts` (`listOpportunitySites`, `addOpportunitySite`, `removeOpportunitySite`), `client.test.ts` (T6).
- `modules/settings/OpportunitySitesForm.tsx` after `YouTubeChannelsForm` in `SettingsPage.tsx`; `OpportunitySitesForm.test.tsx` (T7–T8).

### 3. Ana Sayfa card

**Commit:** `feat(home): open opportunity sites from Ana Sayfa`

- `modules/home/OpportunitiesCard.tsx` on `HomeCard`, after `VideosCard` in `HomePage.tsx`; `OpportunitiesCard.test.tsx` (T9–T10).

### 4. Docs

**Commit:** `docs: document opportunity sites`

- `specs/tech-stack.md`: a bullet for the module, endpoints and the `opportunities` section; add "opportunity sites" to the `settings.json` line in the data folder tree.

### 5. Close the phase

**Commit:** `docs(roadmap): mark phase 12.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 12.1 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line in `Promtps.md`.
- Fast-forward `main` to the phase branch. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(opportunities): store the followed opportunity sites` |
| 2 | `feat(opportunities): manage opportunity sites in Ayarlar` |
| 3 | `feat(home): open opportunity sites from Ana Sayfa` |
| 4 | `docs: document opportunity sites` |
| 5 | `docs(roadmap): mark phase 12.1 done` |

# Plan — Phase 6.1 Dashboard, reminders and feed

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/6.1-home-dashboard
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Feed schema and validator

**Commit:** `feat(home): validate the agent feed`

- `schemas/feed.schema.json`.
- `Modules/Home/FeedValidator.cs` (records `FeedItem`, `FeedValidation`).
- `FeedValidatorTests.cs` (T1–T3), `FeedSchemaFileTests.cs` (T4).
- Check: `npm run check`.

### 2. Feed endpoint

**Commit:** `feat(home): read feed.json`

- `Modules/Home/FeedService.cs` (record `FeedResponse`), `Modules/Home/HomeController.cs` (`GET /api/home/feed`); `FeedService` registered in `Program.cs`.
- `FeedServiceTests.cs` (T5–T6), `HomeEndpointTests.cs` (T7).
- Check: `npm run check`.

### 3. Renderer client

**Commit:** `feat(home): add the feed request`

- Types `FeedItem`, `FeedResponse`; `getFeed()`; fake API route `home/feed`.
- `client.test.ts` (T8).
- Check: `npm run check`.

### 4. Home grid and today card

**Commit:** `feat(home): show today and a quick start on the home page`

- `HomePage.tsx`, `HomePage.module.css`, `HomeCard.tsx`, `TodayCard.tsx`; `/` uses `HomePage` in `navigation.tsx`.
- `HomePage.test.tsx` (T9–T11).
- Check: `npm run check`.

### 5. Reminders and feed cards

**Commit:** `feat(home): show today's reminders and the feed`

- `reminders.ts` (defaults, `reminderStatus`), `RemindersCard.tsx`, `FeedCard.tsx`.
- `reminders.test.ts` (T12), `HomePage.test.tsx` (T13–T15).
- Check: `npm run check`; manual M1–M5.

### 6. Docs

**Commit:** `docs: document the home dashboard`

- `specs/tech-stack.md`: the home page cards, `GET /api/home/feed`, the `feed.json` rules.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 6.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 6.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/6.1-home-dashboard`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(home): validate the agent feed` |
| 2 | `feat(home): read feed.json` |
| 3 | `feat(home): add the feed request` |
| 4 | `feat(home): show today and a quick start on the home page` |
| 5 | `feat(home): show today's reminders and the feed` |
| 6 | `docs: document the home dashboard` |
| 7 | `docs(roadmap): mark phase 6.1 done` |

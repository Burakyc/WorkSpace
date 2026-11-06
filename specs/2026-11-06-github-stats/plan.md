# Plan — Phase 6.3 GitHub stats and "what changed"

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/6.3-github-stats
```

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. GitHub client

**Commit:** `feat(github): fetch public stats`

- `Modules/Home/GitHubClient.cs` (records `GitHubStats`, `GitHubCommit`, `GitHubFetch`), `Modules/Home/GitHubModule.cs` (`AddGitHub()`, named client with redacted headers); registered in `Program.cs`.
- `GitHubClientTests.cs` (T1–T4).
- Check: `npm run check`.

### 2. Username, cache and refresh

**Commit:** `feat(github): cache stats and refresh them`

- `Modules/Home/GitHubService.cs`, `Modules/Home/GitHubController.cs`; `YouTubeRefresher` renamed `HomeRefresher` (YouTube, then GitHub), hosted in `AddGitHub()` instead of `AddYouTube()`.
- `GitHubServiceTests.cs` (T5–T7), `GitHubEndpointTests.cs` (T8).
- Check: `npm run check`.

### 3. What changed since the last visit

**Commit:** `feat(home): compute what changed since the last visit`

- `Modules/Home/Streak.cs`, `Modules/Home/VisitService.cs`, `POST /api/home/visit` in `HomeController`; registered in `AddGitHub()`.
- `StreakTests.cs` (T9), `VisitServiceTests.cs` (T10), `HomeEndpointTests.cs` (T11).
- Check: `npm run check`.

### 4. Secrets in Electron

**Commit:** `feat(electron): store secrets with safeStorage`

- `electron/secrets.ts`; IPC `devpath:secrets-has/set/clear` in `main.ts` with the API restart; `startApi` `env` option for `DEVPATH_GITHUB_TOKEN` and `DEVPATH_LAUNCH_ID`; `secrets` in `preload.ts` and `DevPathBridge`.
- `secrets.test.ts` (T12), `apiProcess.test.ts` (T13).
- Check: `npm run check`.

### 5. Renderer client

**Commit:** `feat(github): add the GitHub requests`

- Types `GitHubSettings`, `GitHubStats`, `GitHubCommit`, `GitHubStatus`, `VisitChanges`; `getGitHubSettings`, `saveGitHubSettings`, `getGitHubStats`, `refreshGitHub`, `recordVisit`; fake API routes and a fake `secrets` bridge.
- `client.test.ts` (T14).
- Check: `npm run check`.

### 6. GitHub in Ayarlar

**Commit:** `feat(settings): set the GitHub username and token`

- `modules/settings/GitHubSettingsForm.tsx`, used in `SettingsPage.tsx`.
- `GitHubSettingsForm.test.tsx` (T15).
- Check: `npm run check`.

### 7. GitHub and changes cards

**Commit:** `feat(home): show GitHub stats and what changed`

- `modules/home/GitHubCard.tsx`, `modules/home/ChangesCard.tsx`, added to `HomePage.tsx`.
- `HomePage.test.tsx` (T16–T18).
- Check: `npm run check`; manual M1–M7.

### 8. Docs

**Commit:** `docs: document GitHub stats and what changed`

- `specs/tech-stack.md`: GitHub client, cache, endpoints, `visit.json`, the secrets store, the launch id, the preload bridge list, the data layout.

### 9. Close the phase

**Commit:** `docs(roadmap): mark phase 6.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 6.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/6.3-github-stats`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(github): fetch public stats` |
| 2 | `feat(github): cache stats and refresh them` |
| 3 | `feat(home): compute what changed since the last visit` |
| 4 | `feat(electron): store secrets with safeStorage` |
| 5 | `feat(github): add the GitHub requests` |
| 6 | `feat(settings): set the GitHub username and token` |
| 7 | `feat(home): show GitHub stats and what changed` |
| 8 | `docs: document GitHub stats and what changed` |
| 9 | `docs(roadmap): mark phase 6.3 done` |

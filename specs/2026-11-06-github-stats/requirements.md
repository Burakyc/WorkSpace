# Requirements — Phase 6.3 GitHub stats and "what changed"

**Roadmap phase:** 6.3 GitHub stats and "what changed" (Milestone 6 — Home dashboard)
**Branch:** `feat/6.3-github-stats`
**Estimate:** 3 days at 1–2 hours/day

## Goal

Ana Sayfa shows the user's public GitHub numbers (stars, followers, public repos, commits in the last 30 days and the 5 latest commits) and a **Son ziyaretinden beri** card: new stars, new followers and new videos since the previous app session, plus the current pomodoro streak. The GitHub username is set in Ayarlar; an optional token is saved with Electron `safeStorage` and is never shown again, never sent to the page, never logged and never returned by the API. The API fetches GitHub on start, every 6 hours, on "Yenile" and when the username is saved, and caches the result in `cache/github.json`; offline or rate-limited fetches show the cached numbers with an error.

## Scope

- **API** (`Modules/Home/`): `GitHubClient` (HTTP), `GitHubService` (username in `settings.json`, cache, refresh), `GitHubController`, `VisitService` + `Streak` (what changed), `POST /api/home/visit`; `YouTubeRefresher` becomes `HomeRefresher` and refreshes GitHub too.
- **Electron**: `electron/secrets.ts` (safeStorage store in `userData/secrets.bin`), the `secrets` bridge (`has`, `set`, `clear`; the page can never read a secret), the token and a per-launch id passed to the API as environment variables, the API restarted when the token changes.
- **Renderer**: "GitHub" section in Ayarlar; `GitHubCard` and `ChangesCard` on Ana Sayfa.
- `tech-stack.md` updated. No new packages.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Commits | **Count for the last 30 days + the 5 latest.** From GitHub's commit search (`author:<user>`, newest first): repo, first line of the message, date; a click opens the commit on github.com. |
| "Last visit" | **Every app launch.** The card compares with what the previous session last showed. A launch id from Electron main keeps one session together when the API restarts (token change, data folder change). |
| Streak | **Counted back from yesterday when today has none yet.** Consecutive local days with at least one completed pomodoro; today counts once it has one. 0 shows a calm "Bugün bir pomodoro ile başla." (no guilt). |
| Refresh | **Like YouTube.** On start and every 6 hours in the background, "Yenile" on the card, and right after the username is saved. |
| Token change (implementation) | As `tech-stack.md` already describes: saving or deleting the token restarts the API with the new environment and reloads the window (a second, like a data folder change). |
| Empty token variable (implementation) | Without a saved token main passes `DEVPATH_GITHUB_TOKEN` as an empty string instead of leaving it out, so a variable set in the developer's shell cannot reach the API. |
| One background loop (implementation) | `YouTubeRefresher` from 6.2 is renamed `HomeRefresher` and refreshes YouTube, then GitHub, each failure logged on its own. |

## User stories

1. **As the user**, I type my GitHub username in Ayarlar and see my stars, followers, repos and recent commits on Ana Sayfa.
2. **As the user**, I paste a token once to avoid rate limits; afterwards Ayarlar only says "Token kayıtlı" and lets me delete it.
3. **As the user**, when I open the app I see what changed since last time: new stars, new followers, new videos and my pomodoro streak.
4. **As the user**, offline or rate-limited, I still see the last numbers and a clear error.

## Business and technical rules

### Username (`settings.json`, section `github`)

- `{ "github": { "username": "…" } }` through `JsonFileStore.UpdateAsync` on `settings.json`.
- `GET /api/github/settings` → `{ username }` (null when not set). `PUT /api/github/settings` `{ username }`: trimmed; empty clears it; otherwise 1–39 letters, digits or single hyphens, not starting or ending with a hyphen, else `400` `username` "Geçerli bir GitHub kullanıcı adı gir.". After saving a username the API refreshes GitHub and answers with the stats (below).

### Fetching (`GitHubClient`)

- Named client `github`, base `https://api.github.com/`, timeout 10 s, headers `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: DevPath`. With `DEVPATH_GITHUB_TOKEN` set, every request carries `Authorization: Bearer <token>`. Header values are redacted in HTTP client logs (`RedactLoggedHeaders`), and no log line or response contains the token.
- Requests (all public data):
  1. `GET users/{user}` → `followers`, `public_repos`.
  2. `GET users/{user}/repos?type=owner&per_page=100&page=N` → the sum of `stargazers_count`; stops at a page with fewer than 100 repos, at most 5 pages. ponytail: 500 repos at most; more pages if ever needed.
  3. `GET search/commits?q=author:{user}+author-date:>={today−30 days}&sort=author-date&order=desc&per_page=5` → `total_count` and the items (`repository.full_name`, `sha`, first line of `commit.message` up to 200 characters, `commit.author.date`, `html_url` kept only when it starts with `https://github.com/`).
- Errors (Turkish, the first failing request decides):
  - `404` on the user → "GitHub kullanıcısı bulunamadı."
  - `401` → "GitHub token geçersiz. Ayarlar'dan sil ya da yenile."
  - `403` or `429` with `x-ratelimit-remaining: 0` → "GitHub istek sınırına ulaşıldı. HH:mm sonrası tekrar dene." (local time from `x-ratelimit-reset`; without the header just the first sentence).
  - Other status → "GitHub isteği başarısız oldu (kod N)."; network error or timeout → "GitHub'a ulaşılamadı."; unreadable JSON → "GitHub yanıtı okunamadı."

### Cache (`cache/github.json`) and endpoints

```json
{ "schemaVersion": 1, "username": "…",
  "stats": { "stars": 12, "followers": 5, "publicRepos": 9, "commitsLast30Days": 41,
             "recentCommits": [ { "repo", "sha", "message", "date", "url" } ] },
  "fetchedAt": "…", "lastRefreshAt": "…", "error": null }
```

- A successful refresh replaces the numbers and `fetchedAt`; a failed one keeps them and sets `error`. `lastRefreshAt` is the attempt time. A cache for another username than the saved one counts as empty. No username → nothing is fetched.
- `GET /api/github/stats` (cache only) and `POST /api/github/refresh` answer `{ username, stats: { stars, followers, publicRepos, commitsLast30Days, recentCommits } | null, fetchedAt, lastRefreshAt, error }`.
- Refreshes never overlap (`SemaphoreSlim`). `HomeRefresher` runs YouTube then GitHub right after start and every 6 hours.

### What changed (`POST /api/home/visit?timeZone=<IANA>`, `visit.json`)

```json
{ "schemaVersion": 1, "launchId": "…", "baseline": { "at", "stars", "followers" } | null, "latest": { "at", "stars", "followers" } }
```

- `launchId` comes from `DEVPATH_LAUNCH_ID` (a random id Electron main creates once per app launch and passes to every API it starts); without it the API uses one id per process.
- Each call (every time Ana Sayfa opens): when the stored `launchId` differs, the stored `latest` becomes `baseline` (a new session started) and the id is saved. Then `latest` = now and the current cached GitHub numbers (null without stats).
- Answer: `{ since: baseline.at | null, newStars, newFollowers, newVideos, streakDays }`.
  - `newStars` / `newFollowers`: current minus baseline, null when either side has no number. Can be negative.
  - `newVideos`: cached videos of followed channels with `publishedAt` after `baseline.at` (null without a baseline).
  - `streakDays`: `Streak.Count` over the local dates (`timeZone`) of completed sessions: today counts when it has one; the run is counted back from today, or from yesterday when today has none.
- Bad `timeZone` → `400` "Saat dilimi tanınmadı.".

### Secrets (Electron)

- `electron/secrets.ts`: `createSecretStore({ read, write, encrypt, decrypt, available })` (injected for tests). The file `userData/secrets.bin` is JSON `{ "schemaVersion": 1, "secrets": { "githubToken": "<base64 of safeStorage.encryptString>" } }`, written atomically (temp file + rename). An unreadable file counts as empty.
- Names are an allow list: only `githubToken`. A value is 1–255 characters with no whitespace, else rejected ("Token geçersiz."). Without OS encryption (`safeStorage.isEncryptionAvailable()` false) saving fails with "Bu bilgisayarda güvenli depolama kullanılamıyor.".
- Bridge (`window.devpath.secrets`): `has(name): Promise<boolean>`, `set(name, value): Promise<void>`, `clear(name): Promise<void>`. Main checks the arguments. `set` and `clear` stop the API, start it again with the new environment (same data folder) and reload the window; if it cannot start, the error window shows and the app quits.
- `startApi` passes `DEVPATH_GITHUB_TOKEN` (empty when none is saved, so a value inherited from the shell never reaches the API) and `DEVPATH_LAUNCH_ID`. The token lives only in main's and the API's memory.

### Renderer

- **Ayarlar → GitHub**: "Kullanıcı adı" with "Kaydet" ("Kaydediliyor…"; errors under the field; "Kaydedildi." after). Token: when `has` → "Token kayıtlı." and "Tokeni sil"; otherwise a password field "Token (isteğe bağlı)" with "Tokeni kaydet" and a note that it is stored encrypted on this computer and only raises the rate limit. The field is cleared right after saving; the page reloads.
- **Ana Sayfa → GitHub** (`GitHubCard`): "Yıldız", "Takipçi", "Public repo" numbers, "Son 30 günde N commit", the latest commits (repo · message as a button that opens the commit, date), "Son yenileme", "Yenile". Error inside the card (danger border) above the cached numbers. No username → "GitHub kullanıcı adını Ayarlar'dan gir." with a link. Never fetched → "GitHub verisi henüz çekilmedi.".
- **Ana Sayfa → Son ziyaretinden beri** (`ChangesCard`): calls the visit endpoint once when the page opens. Rows "Yeni yıldız +2", "Yeni takipçi +1" (or "−1", "0"), "Yeni video 3", "Pomodoro serisi 4 gün". Missing numbers hide their row. No baseline → "İlk açılış: değişiklikler bir sonraki açılışta görünecek." plus the streak row. Streak 0 → "Bugün bir pomodoro ile başla.". A failed request → "Değişiklikler yüklenemedi.".

## Out of scope

| Item | Where it goes |
|---|---|
| LinkedIn numbers, profile cards | Post-MVP showcase |
| Private repos or contributions graph | Not planned (public data only) |
| Other secrets (AI API keys) | Phase 9.3 reuses the same store |
| Notifications for changes | Not planned (calm by default) |

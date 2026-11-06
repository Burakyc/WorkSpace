# Validation — Phase 6.3 GitHub stats and "what changed"

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 6.3, plus the decisions in [requirements.md](requirements.md):

- [ ] Settings: GitHub username; optional token saved with `safeStorage` (only `has`/`clear` visible after saving).
- [ ] API fetches public stars, followers and recent public commits (30-day count + 5 latest); uses the token if present; caches to `cache/github.json`.
- [ ] "What changed since your last visit" card: new stars, new followers, pomodoro streak, new videos since the last app open.
- [ ] Offline or rate-limited fetch shows cached numbers plus an error.
- [ ] Tests: diff since last visit, token never appears in logs or responses.
- [ ] The page can never read the token; it lives only in `secrets.bin` (encrypted) and in main's and the API's memory.
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Stats | `Modules/Home/GitHubClientTests.cs` | Stub answers → followers, public repos, stars summed over 2 pages (stops at a short page), 30-day commit count, 5 commits with first message line; a non-github.com `html_url` → `url` null |
| T2 | Token header | same | With a token every request has `Authorization: Bearer …`; without, none |
| T3 | Errors | same | `404` user, `401`, `403` with `x-ratelimit-remaining: 0` and reset, `500`, network error, bad JSON → the Turkish messages |
| T4 | No token in logs | same | Client logs captured at Trace level (including the HTTP client's own logs) never contain the token |
| T5 | Username | `Modules/Home/GitHubServiceTests.cs` | Valid names saved; `-a`, `a--b`, 40 characters, `a b` → `username` error; empty clears |
| T6 | Cache | same | Refresh stores the stats; a failed refresh keeps the numbers and sets `error`; a cache for another username counts as empty; no username → no HTTP call |
| T7 | Reading | same | `GET` stats never fetches |
| T8 | Endpoints | `Modules/Home/GitHubEndpointTests.cs` | With a stub and `DEVPATH_GITHUB_TOKEN`: `PUT settings` → stats; `GET stats`, `POST refresh`; no response body contains the token |
| T9 | Streak | `Modules/Home/StreakTests.cs` | Today + 2 days before → 3; none today, yesterday + day before → 2; gap → stops; nothing → 0 |
| T10 | Visit | `Modules/Home/VisitServiceTests.cs` | First call → no baseline, `since` null; same launch → baseline unchanged, `latest` updated; new launch → previous `latest` is the baseline; new stars/followers (also negative), new videos after `baseline.at`, nulls without GitHub |
| T11 | Visit endpoint | `Modules/Home/HomeEndpointTests.cs` | `POST /api/home/visit?timeZone=Europe/Istanbul` → `200` with the fields; bad zone → `400` |
| T12 | Secret store | `electron/secrets.test.ts` | set → has true, get decrypts; clear → has false; unknown name, whitespace or empty value rejected; no encryption → error; broken file → empty; the file never holds the plain value |
| T13 | API env | `electron/apiProcess.test.ts` | `apiEnvironment` adds `DEVPATH_GITHUB_TOKEN` only when a token exists, and always `DEVPATH_LAUNCH_ID` |
| T14 | Client | `src/shared/api/client.test.ts` | The five requests with methods, paths and bodies |
| T15 | Settings | `src/modules/settings/GitHubSettingsForm.test.tsx` | Save username; API error under the field; without a token: save calls `secrets.set('githubToken', …)`; with a token: "Token kayıtlı." and "Tokeni sil" calls `secrets.clear` |
| T16 | GitHub card | `src/modules/home/HomePage.test.tsx` | Numbers, commit count, commits open `openExternal(url)`; error with cached numbers; no username → link to Ayarlar; "Yenile" |
| T17 | Changes card | same | "+2" stars, "+1" follower, "3" videos, "4 gün"; first visit text; streak 0 text |
| T18 | Changes failure | same | Request fails → "Değişiklikler yüklenemedi." while the other cards render |

## Manual test steps

Run `npm run dev` (online). Use a real public GitHub username.

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar → GitHub: save the username | "Kaydedildi."; Ana Sayfa GitHub card shows stars, followers, public repos, 30-day commits and up to 5 commits |
| M2 | Click a commit | It opens on github.com in the default browser |
| M3 | Save a token (any non-space text works for the check) | The window reloads; Ayarlar shows "Token kayıtlı." and "Tokeni sil", no token text anywhere; `secrets.bin` holds no plain token; with a fake token "Yenile" shows "GitHub token geçersiz…" |
| M4 | "Tokeni sil" | Reloads; the token field is back; "Yenile" works again |
| M5 | Close and reopen the app | "Son ziyaretinden beri" shows numbers (0 or more) and the streak; first ever open shows the first-visit text |
| M6 | Start the app offline (dead proxy), "Yenile" on the GitHub card | Danger border, "GitHub'a ulaşılamadı.", cached numbers still shown |
| M7 | Search the API log output and `cache/`, `visit.json`, `settings.json` for the token | Not found |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 6.3 ticked and set to `done`

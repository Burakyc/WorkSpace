# Validation — Phase 0.3 Electron starts the API

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.3, plus the decisions in [requirements.md](requirements.md):

- [x] Electron main picks a free port, creates a per-launch token, spawns the API and waits for `/api/health` (10 s timeout, then an error window and quit).
- [x] The API rejects requests without a valid `X-DevPath-Token` header (`401`) and requests with a `Host` other than `127.0.0.1` (`400`).
- [x] Without `DEVPATH_TOKEN` the API runs without the check only in `Development` (with a warning) and refuses to start in any other environment.
- [x] CORS allows only the origin in `DEVPATH_ORIGIN`; preflight requests work without the token.
- [x] Preload exposes only `window.devpath.getApiConfig()`; the IPC handler answers only the app's own page.
- [x] The renderer's typed API client calls `/api/health` with the token and the page shows "API: bağlı", in dev and in a production build.
- [x] Quitting the app stops the API process; killing Electron stops it too (parent watcher). No orphan `DevPath.Api` process.
- [x] Root `npm run dev` builds the API first and opens the app.
- [x] Tests: token middleware (xUnit) and API client adds the header (Vitest), plus the tests below.
- [x] README and `tech-stack.md` are updated.

## Automated tests

Run with:

```bash
npm run check
```

### API (xUnit, `apps/api/DevPath.Api.Tests`)

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Host `127.0.0.1` | `Infrastructure/Security/HostFilteringTests.cs` | `GET /api/health` → `200` |
| T2 | Foreign host | same | `Host: evil.example` (and `localhost`) → `400` |
| T3 | Valid token | `Infrastructure/Security/ApiTokenTests.cs` | `200` |
| T4 | Missing header | same | `401`, `application/problem+json` |
| T5 | Wrong token (same length and different length) | same | `401` |
| T6 | Token not leaked | same | The `401` body does not contain the expected token |
| T7 | No token, Development | same | API starts; `GET /api/health` without header → `200` |
| T8 | No token, Production | same | Creating the client throws; message contains `DEVPATH_TOKEN` |
| T9 | Preflight from allowed origin | `Infrastructure/Security/CorsTests.cs` | `OPTIONS` with `Origin` = `DEVPATH_ORIGIN` and no token → `204`, `Access-Control-Allow-Origin` echoes it, allowed headers include `X-DevPath-Token` |
| T10 | `null` origin | same | With `DEVPATH_ORIGIN=null`, `Origin: null` is allowed |
| T11 | Other origin | same | `Origin: https://evil.example` → no `Access-Control-Allow-Origin` header |
| T12 | No `DEVPATH_ORIGIN` | same | No `Access-Control-Allow-Origin` for any origin |
| T13 | Parent exits | `Infrastructure/Hosting/ParentProcessWatcherTests.cs` | After the child process exits, `StopApplication()` is called |
| T14 | Parent not running | same | Unknown PID → `StopApplication()` called at once |
| T15 | Invalid PID setting | same | `DEVPATH_PARENT_PID` = `abc`, `0` or `-5` → startup error naming `DEVPATH_PARENT_PID` |
| — | Phase 0.1 tests | existing | Still pass (switched to `ApiFactory`) |

### Desktop (Vitest)

| ID | Test | File | Expected |
|---|---|---|---|
| T16 | Free port | `electron/apiProcess.test.ts` | `findFreePort()` returns 1–65535 and a server can listen on it at `127.0.0.1` |
| T17 | Token | same | `createToken()` is 43 characters of base64url; two calls differ |
| T18 | Health OK | same | `waitForHealth` resolves after a stub fetch fails twice then returns `200`; every call has `X-DevPath-Token` |
| T19 | Health timeout | same | Stub fetch always fails → rejects after `timeoutMs` (a 50 ms real timeout) |
| T20 | Child exited | same | `exited` resolves first → rejects at once without waiting for the timeout |
| T21 | `401` is not healthy | same | Stub returns `401` until timeout → rejects |
| T22 | Header and URL | `src/shared/api/client.test.ts` | `getHealth()` calls `<baseUrl>/api/health` with `X-DevPath-Token: <token>` |
| T23 | Typed result | same | Returns `{ status, version }` from the JSON body |
| T24 | Error status | same | `401` response → rejects with `ApiError` whose `status` is `401` |
| T25 | Connected | `src/app/ApiStatus.test.tsx` | Shows "API: bağlanıyor…", then "API: bağlı" |
| T26 | Failed health | same | Fetch rejects → "API: bağlantı yok" |
| T27 | Bridge fails | same | `getApiConfig()` rejects → "API: bağlantı yok" |
| — | Phase 0.2 tests | existing | Still pass (`App.test.tsx` stubs `window.devpath`) |

Not automated: the real Electron process, spawning, quitting and the error window. M1–M12 cover them.

## Manual test steps

Run from the repo root in PowerShell. Open DevTools with `Ctrl+Shift+I` where a step says "console". `<port>` and `<token>` come from M2.

| ID | Step | Expected |
|---|---|---|
| M1 | `npm run dev` | `dotnet build` runs, then one window opens showing "API: bağlı". No errors in the terminal or console. |
| M2 | Console: `await window.devpath.getApiConfig()` | `{ baseUrl: "http://127.0.0.1:<port>", token: "<43 chars>" }`. `Object.keys(window.devpath)` is `["getApiConfig"]`. |
| M3 | `curl.exe -i http://127.0.0.1:<port>/api/health` | `401`. With `-H "X-DevPath-Token: <token>"` → `200`. With the token and `-H "Host: evil.example"` → `400`. |
| M4 | `netstat -ano \| findstr :<port>` | Listening only on `127.0.0.1:<port>`. |
| M5 | Close the window, then `Get-Process DevPath.Api -ErrorAction SilentlyContinue` | Nothing returned. |
| M6 | Start the app again, then `Stop-Process -Name electron -Force`; wait 2 s; `Get-Process DevPath.Api -ErrorAction SilentlyContinue` | Nothing returned (parent watcher stopped it). |
| M7 | `dotnet clean apps/api/DevPath.slnx`, then `npm run dev -w apps/desktop` | Error box "DevPath başlatılamadı" that mentions `dotnet build apps/api/DevPath.slnx`; after OK the app quits; no window, no `DevPath.Api` process. |
| M8 | `npm run build -w apps/desktop`, then `npm run start -w apps/desktop` | Window shows "API: bağlı" (file:// origin `null` passes CORS). No CSP or CORS errors in the console. |
| M9 | With M8 running, run `npm run start -w apps/desktop` again | No second window; `(Get-Process DevPath.Api).Count` is 1. |
| M10 | Console on the app page: `await fetch((await window.devpath.getApiConfig()).baseUrl + '/api/health').then(r => r.status)` | `401` (no token sent). |
| M11 | `dotnet run --project apps/api/DevPath.Api` (no `DEVPATH_TOKEN`) | A warning about the missing token is logged; http://127.0.0.1:5180/api/health returns `200` in the browser. |
| M12 | `$env:ASPNETCORE_ENVIRONMENT='Production'; dotnet run --project apps/api/DevPath.Api --no-launch-profile`; afterwards `Remove-Item Env:ASPNETCORE_ENVIRONMENT` | The API exits with an error naming `DEVPATH_TOKEN`. |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M12 done with the expected results
- [x] `roadmap.md` phase 0.3 ticked and set to `done`

# Requirements — Phase 0.3 Electron starts the API

**Roadmap phase:** 0.3 Electron starts the API (Milestone 0 — Skeleton)
**Branch:** `feat/0.3-electron-starts-api`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The app is one process from the user's point of view. Electron main starts the API on a free port with a per-launch token, waits until it is healthy, then opens the window. The renderer gets the port and token through the preload bridge, calls `/api/health` with its typed client and shows "API: bağlı". Quitting the app (or Electron dying) stops the API.

## Scope

- **API**
  - `Host` header check: only `127.0.0.1` is accepted.
  - Token middleware: every request needs `X-DevPath-Token: <DEVPATH_TOKEN>`, otherwise `401`.
  - CORS for exactly one origin, passed by Electron in `DEVPATH_ORIGIN`.
  - Parent process watcher: the API stops when the process in `DEVPATH_PARENT_PID` exits.
- **Electron main**
  - `electron/apiProcess.ts`: free port, random token, spawn the API exe, wait for `/api/health` (10 s timeout), stop.
  - Error window when the API does not start; the app then quits.
  - IPC handler that returns the API config to the app's own page only.
  - Stops the API on quit.
- **Preload:** `window.devpath.getApiConfig()`.
- **Renderer:** typed API client in `src/shared/api/`, and an API status line on the placeholder page.
- **Dev workflow:** root `npm run dev` builds the API first.
- README and `tech-stack.md` updated with the decisions below.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| API started without `DEVPATH_TOKEN` | **Development:** the check is off and a warning is logged at startup (for `dotnet run` and browsing `/openapi/v1.json`). **Any other environment:** the API refuses to start. Electron always passes a token, so the check is always on inside the app. |
| How Electron starts the API in dev | Root `npm run dev` runs `dotnet build apps/api/DevPath.slnx` first. Electron spawns `apps/api/DevPath.Api/bin/Debug/net10.0/DevPath.Api.exe` directly (not `dotnet run`), so start-up fits in 10 s and `kill()` stops the only process. The packaged path (`resources/api/DevPath.Api.exe`) is added in phase 0.6. |
| CORS origin | Electron passes the renderer's exact origin in `DEVPATH_ORIGIN`: the Vite dev server origin (e.g. `http://localhost:5173`) in dev, `null` for `file://` in a build. The API allows only that origin. Without `DEVPATH_ORIGIN`, no cross-origin request is allowed. The token stays the real guard. |
| Electron crash | Electron passes its PID in `DEVPATH_PARENT_PID`; the API stops itself when that process exits. |
| `Host` check | ASP.NET Core's built-in host filtering with `AllowedHosts: "127.0.0.1"` (returns `400`). It does not compare the port; DNS rebinding always changes the host name, so the port adds nothing. `tech-stack.md` is updated to say so. |
| Error window | `dialog.showErrorBox` with a Turkish title and message, then `app.quit()`. No retry button. |
| `getApiConfig()` | Async (`Promise<ApiConfig>`) through `ipcRenderer.invoke`, because the sandboxed preload cannot read main's memory directly. |

## User stories

1. **As the user**, I start DevPath and only see one app. The API starts in the background and the window opens when it is ready.
2. **As the user**, I see "API: bağlı" on the page when the app can talk to its API.
3. **As the user**, if the API cannot start, I get a clear Turkish error message instead of a blank window, and nothing is left running.
4. **As the user**, when I close the app (or it crashes), no `DevPath.Api` process is left behind.
5. **As the user**, other programs and web pages on my machine cannot read or change my data through the API: they don't know the token, and a foreign `Host` header is rejected.
6. **As the developer**, `npm run dev` builds the API and opens the app; `dotnet run --project apps/api/DevPath.Api` still works on its own for quick API checks.

## Business and technical rules

### API

- **Middleware order:** host filtering (built in) → CORS → token check → controllers. CORS runs before the token check so a browser preflight (`OPTIONS`, which carries no custom headers) is answered without a token.
- **Token check** (`Infrastructure/Security/`):
  - Applies to every path, including `/api/health` and `/openapi/v1.json`.
  - Compares with `CryptographicOperations.FixedTimeEquals` on UTF-8 bytes.
  - Missing or wrong header → `401` with an RFC 7807 `ProblemDetails` body. The token never appears in logs or responses.
  - `DEVPATH_TOKEN` missing or blank: in `Development` the middleware is not added and one warning is logged; in any other environment startup throws an error that names `DEVPATH_TOKEN`.
- **CORS:** one named policy. Origin = `DEVPATH_ORIGIN` (only if set). Headers: `X-DevPath-Token`, `Content-Type`. Methods: `GET`, `POST`, `PUT`, `DELETE`. No credentials.
- **Host filtering:** `AllowedHosts` in `appsettings.json` becomes `"127.0.0.1"`. Requests with another `Host` get `400`.
- **Parent watcher** (`Infrastructure/Hosting/`): a `BackgroundService`, registered only when `DEVPATH_PARENT_PID` is set. It waits for that process to exit, then calls `IHostApplicationLifetime.StopApplication()`. If the PID is not running at startup, the API stops at once. A value that is not a positive integer is a startup error naming `DEVPATH_PARENT_PID`.
- Configuration is read like `DEVPATH_PORT`: plain environment variables through `builder.Configuration`.

### Electron main

- **Port:** a free port from the OS (`net` server listening on `127.0.0.1:0`, read the port, close). The short gap before the API binds is accepted; if the API then fails to bind, start-up fails and the error window shows.
- **Token:** `crypto.randomBytes(32).toString('base64url')`, new on every launch, kept only in main's memory and passed to the API by environment variable.
- **Spawn:** `child_process.spawn(exePath, [], { env, stdio: 'inherit', windowsHide: true })` with `env` = the current environment plus `DEVPATH_PORT`, `DEVPATH_TOKEN`, `DEVPATH_ORIGIN`, `DEVPATH_PARENT_PID` and, when not packaged, `ASPNETCORE_ENVIRONMENT=Development`.
- **Exe path (unpackaged):** `apps/api/DevPath.Api/bin/Debug/net10.0/DevPath.Api.exe`, resolved from `app.getAppPath()`. If it does not exist, the error message says to run `dotnet build apps/api/DevPath.slnx`.
- **Health wait:** poll `GET http://127.0.0.1:<port>/api/health` with the token header every 200 ms until `200`, for at most 10 s. It fails early if the child process exits.
- **Failure:** stop the child (if any), `dialog.showErrorBox('DevPath başlatılamadı', <reason>)`, `app.quit()`. The main window is never created.
- **Order:** single-instance lock → start API → create window. A second instance never starts an API.
- **Quit:** `will-quit` stops the child with `kill()`. Electron crash is covered by the API's parent watcher.
- **IPC:** `ipcMain.handle('devpath:get-api-config', …)` returns `{ baseUrl: 'http://127.0.0.1:<port>', token }` only when `event.senderFrame.url` passes `isAllowedNavigation(url, appUrl)`; otherwise it throws.

### Preload and renderer

- Preload exposes exactly one object: `window.devpath = { getApiConfig(): Promise<ApiConfig> }` via `contextBridge`. No other `ipcRenderer` access.
- Types `ApiConfig` and `HealthResponse` live in `src/shared/api/types.ts`; the preload imports `ApiConfig` from there. `window.devpath` is declared once for the renderer.
- `src/shared/api/client.ts`: `createApiClient(config, fetchFn = fetch)` returns typed methods (`getHealth()` for now). Every request gets the base URL and `X-DevPath-Token`. A non-`2xx` response throws an error with the status. No `any`.
- The placeholder page shows one status line:
  - while checking: "API: bağlanıyor…"
  - on `status: "ok"`: "API: bağlı"
  - on any error: "API: bağlantı yok"
- CSP stays as it is; `connect-src http://127.0.0.1:*` already allows the API.

## Out of scope

| Item | Where it goes |
|---|---|
| Packaged exe path, `dotnet publish`, installer | Phase 0.6 |
| `DEVPATH_DATA_DIR`, `app-config.json` | Phase 0.4 |
| Restarting the API when settings or secrets change | Phases 0.5 and 6.3 |
| `safeStorage`, `secrets.*`, `notify()`, `openExternal()` in the preload | Later phases (6.3, 2.1, 6.2) |
| Retry button in the error window, automatic API restart after a crash | Not planned |
| Docker, binding to `0.0.0.0` | Phase 0.7 |
| Developer panel showing API health and errors | Phase 7.3 |
| End-to-end tests of the Electron app | Not planned; manual steps cover it |

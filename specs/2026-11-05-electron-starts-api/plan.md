# Plan — Phase 0.3 Electron starts the API

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.3-electron-starts-api
```

Every task ends with `npm run check`. A task is committed only when it passes. No new npm or NuGet packages are needed in this phase; everything uses Node, Electron and ASP.NET Core built-ins.

## Tasks

### 1. Host header check

**Commit:** `feat(api): accept only 127.0.0.1 as host`

- `appsettings.json`: `"AllowedHosts": "127.0.0.1"`.
- Tests: add `DevPath.Api.Tests/ApiFactory.cs` (`WebApplicationFactory<Program>`) that overrides `ConfigureClient` to use `http://127.0.0.1` as base address. Switch the existing health and OpenAPI tests to it.
- `Infrastructure/Security/HostFilteringTests.cs`: T1–T2.
- Check: `npm run check`.

### 2. Token middleware

**Commit:** `feat(api): require the per-launch token header`

- `Infrastructure/Security/ApiTokenMiddleware.cs`: reads the expected token from its constructor; missing or wrong `X-DevPath-Token` → `401` `ProblemDetails`; fixed-time compare.
- `Program.cs`: read `DEVPATH_TOKEN`. Blank + `Development` → log a warning, do not add the middleware. Blank + other environment → throw an error naming `DEVPATH_TOKEN`. Otherwise `app.UseMiddleware<ApiTokenMiddleware>(token)` before `MapControllers`.
- `ApiFactory` sets a test token (`UseSetting("DEVPATH_TOKEN", …)`) and adds the header in `ConfigureClient`.
- `Infrastructure/Security/ApiTokenTests.cs`: T3–T8.
- Check: `npm run check`.

### 3. CORS for the app origin

**Commit:** `feat(api): allow cors for the app origin only`

- `Program.cs`: when `DEVPATH_ORIGIN` is set, add one CORS policy (that origin; headers `X-DevPath-Token`, `Content-Type`; methods `GET`, `POST`, `PUT`, `DELETE`) and `app.UseCors(...)` **before** the token middleware.
- First test checks that `WithOrigins("null")` matches the `Origin: null` header; if it does not, stop and ask before changing the approach.
- `Infrastructure/Security/CorsTests.cs`: T9–T12.
- Check: `npm run check`.

### 4. Parent process watcher

**Commit:** `feat(api): stop when the parent process exits`

- `Infrastructure/Hosting/ParentProcessWatcher.cs`: `BackgroundService` that takes the PID, does `Process.GetProcessById(pid).WaitForExitAsync(ct)` and then `StopApplication()`. `ArgumentException` from `GetProcessById` (not running) → stop at once.
- `Program.cs`: register it only when `DEVPATH_PARENT_PID` is set; a value that is not a positive integer throws an error naming `DEVPATH_PARENT_PID`.
- `Infrastructure/Hosting/ParentProcessWatcherTests.cs`: T13–T15 (start a short-lived child process, e.g. `cmd /c ping -n 2 127.0.0.1`, and a fake `IHostApplicationLifetime`).
- Check: `npm run check`.

### 5. Start and stop the API from Electron main

**Commit:** `feat(desktop): start the api from electron main`

- `electron/apiProcess.ts`:
  - `findFreePort(): Promise<number>`
  - `createToken(): string`
  - `waitForHealth(baseUrl, token, { timeoutMs, intervalMs, fetchFn, exited }): Promise<void>`
  - `startApi({ exePath, origin, development }): Promise<{ port, token, stop() }>`: spawns as in requirements.md; on any failure stops the child and rejects with a Turkish-ready reason.
- `electron/main.ts`: inside the single-instance branch, `await startApi(...)` before `createWindow()`. Origin = `new URL(devServerUrl).origin` or `'null'`. Exe path from `app.getAppPath()`; missing exe → reason mentions `dotnet build apps/api/DevPath.slnx`. On failure `dialog.showErrorBox('DevPath başlatılamadı', reason)` and `app.quit()`. `app.on('will-quit', () => api?.stop())`.
- `electron/apiProcess.test.ts`: T16–T21.
- Check: `npm run check`; manual M1, M5, M7.

### 6. Build the API before `npm run dev`

**Commit:** `chore: build the api before npm run dev`

- Root `package.json`: `"dev": "dotnet build apps/api/DevPath.slnx && npm run dev -w apps/desktop"`.
- Check: `npm run dev` from a clean `bin/` folder opens the window within 10 s of the build finishing.

### 7. `getApiConfig()` in the preload bridge

**Commit:** `feat(desktop): expose getApiConfig through the preload bridge`

- `src/shared/api/types.ts`: `ApiConfig { baseUrl: string; token: string }`, `HealthResponse { status: string; version: string }`, `DevPathBridge { getApiConfig(): Promise<ApiConfig> }`.
- `src/shared/api/bridge.d.ts`: `interface Window { devpath: DevPathBridge }`.
- `electron/preload.ts`: `contextBridge.exposeInMainWorld('devpath', { getApiConfig: () => ipcRenderer.invoke('devpath:get-api-config') })`. Remove the phase 0.3 comment.
- `electron/main.ts`: `ipcMain.handle('devpath:get-api-config', …)` with the `isAllowedNavigation(event.senderFrame?.url, appUrl)` check.
- Check: `npm run check`; manual M2.

### 8. Typed API client

**Commit:** `feat(desktop): add typed api client`

- `src/shared/api/client.ts`: `createApiClient(config, fetchFn = fetch)` with a private `get<T>(path)` and `getHealth(): Promise<HealthResponse>`. Non-`2xx` throws `ApiError` with `status`.
- `src/shared/api/client.test.ts`: T22–T24.
- Check: `npm run check`.

### 9. API status on the page

**Commit:** `feat(desktop): show api connection status`

- `src/app/ApiStatus.tsx`: on mount, `window.devpath.getApiConfig()` → `createApiClient(config).getHealth()`; renders "API: bağlanıyor…", "API: bağlı" or "API: bağlantı yok". Cancels the state update on unmount.
- `App.tsx` renders `<ApiStatus />` under the placeholder text.
- `src/app/ApiStatus.test.tsx`: T25–T27, with `window.devpath` and `fetch` stubbed. `App.test.tsx` stubs `window.devpath` too.
- Check: `npm run check`; manual M1, M8.

### 10. Docs

**Commit:** `docs: document api token and dev start`

- `README.md` "Development": `npm run dev` builds the API first; standalone `dotnet run` runs without a token check in Development and logs a warning; with `DEVPATH_TOKEN` set, call it with `curl.exe -H "X-DevPath-Token: <token>" http://127.0.0.1:5180/api/health`.
- `specs/tech-stack.md`:
  - Process lifecycle: dev spawns the built `DevPath.Api.exe` after `dotnet build` (not `dotnet run`); env vars `DEVPATH_ORIGIN` and `DEVPATH_PARENT_PID`; error window via `dialog.showErrorBox`.
  - API rules: host check via `AllowedHosts: "127.0.0.1"` (port not compared, with the reason); CORS origin from `DEVPATH_ORIGIN` (`null` for `file://`); dev-only token bypass when `DEVPATH_TOKEN` is unset; the API stops when its parent exits.
  - Preload: `getApiConfig()` returns a `Promise`.

### 11. Close the phase

**Commit:** `docs(roadmap): mark phase 0.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 0.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.3-electron-starts-api` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(api): accept only 127.0.0.1 as host` |
| 2 | `feat(api): require the per-launch token header` |
| 3 | `feat(api): allow cors for the app origin only` |
| 4 | `feat(api): stop when the parent process exits` |
| 5 | `feat(desktop): start the api from electron main` |
| 6 | `chore: build the api before npm run dev` |
| 7 | `feat(desktop): expose getApiConfig through the preload bridge` |
| 8 | `feat(desktop): add typed api client` |
| 9 | `feat(desktop): show api connection status` |
| 10 | `docs: document api token and dev start` |
| 11 | `docs(roadmap): mark phase 0.3 done` |

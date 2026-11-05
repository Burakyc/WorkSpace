# Requirements — Phase 0.1 API skeleton

**Roadmap phase:** 0.1 API skeleton (Milestone 0 — Skeleton)
**Branch:** `feat/0.1-api-skeleton`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

An ASP.NET Core Web API on .NET 10 that starts on `127.0.0.1`, answers a health check, and has a working xUnit test project. Every later backend phase builds on this.

## Scope

- Root `.gitignore` that keeps personal data, secrets and build output out of git.
- `global.json` pinning the .NET 10 SDK.
- `apps/api/DevPath.slnx` with two projects:
  - `DevPath.Api` — ASP.NET Core Web API with controllers.
  - `DevPath.Api.Tests` — xUnit v2 tests (VSTest runner) with `WebApplicationFactory`.
- Shared build settings in `apps/api/Directory.Build.props`: `net10.0`, nullable enabled, implicit usings, warnings as errors, version `0.0.1`.
- Kestrel listens on `127.0.0.1:<port>` only. The port comes from `DEVPATH_PORT`, with a fallback to `5180`.
- `GET /api/health` returns `{ "status": "ok", "version": "<app version>" }`.
- Built-in OpenAPI document at `/openapi/v1.json`, in Development only.
- Short "Development" section in `README.md` with the commands to build, test and run the API.
- Spec updates so `tech-stack.md` and `roadmap.md` match the decisions below (`.slnx`, OpenAPI in Development, port fallback).

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Phase to plan | 0.1 API skeleton (first phase in order) |
| Port without `DEVPATH_PORT` | Fall back to `5180` so `dotnet run` works on its own |
| Solution format | `.slnx` (.NET 10 default) |
| OpenAPI | Built-in `Microsoft.AspNetCore.OpenApi`, Development only |
| `Promtps.md` | Keep the current name |
| Test framework | xUnit v2 + VSTest (decided during task 3: xunit.v3 4.x needs the Microsoft Testing Platform opt-in on the .NET 10 SDK) |

## User stories

1. **As the developer**, I run `dotnet run --project apps/api/DevPath.Api` and the API answers on `http://127.0.0.1:5180`, so I can try endpoints without Electron.
2. **As the Electron main process** (phase 0.3), I set `DEVPATH_PORT` to a free port and the API listens on exactly that port.
3. **As the developer**, I call `GET /api/health` and see that the API is up and which version is running.
4. **As the developer**, I run `dotnet test apps/api/DevPath.slnx` and get a passing test suite that covers the health endpoint and port handling.
5. **As the developer**, I open `/openapi/v1.json` in Development to check which endpoints exist.
6. **As the user**, I can be sure my personal data, backups and secrets never end up in a commit, because git ignores them from the first code commit.

## Business and technical rules

- **Loopback only.** Kestrel binds to `IPAddress.Loopback` (`127.0.0.1`). It never binds to `0.0.0.0`, `[::]`, `localhost` or a LAN address. `ASPNETCORE_URLS` and `launchSettings.json` URLs must not change this.
- **Port rules.**
  - `DEVPATH_PORT` not set or empty → `5180`.
  - A whole number from `1` to `65535` → that port.
  - Anything else (`abc`, `0`, `70000`, `-1`, `5180.5`) → the API does not start, logs a clear error naming `DEVPATH_PORT` and the bad value, and exits with a non-zero code.
- **Plain HTTP.** No HTTPS redirection and no dev certificate: traffic never leaves the machine, and the per-launch token arrives in phase 0.3.
- **Health response.** `200 OK`, `application/json`, camelCase: `status` is always `"ok"`; `version` is the assembly informational version without the source-revision suffix (e.g. `0.0.1`).
- **OpenAPI.** Served only when the environment is `Development`. In any other environment `/openapi/v1.json` returns `404`.
- **Code standards** (from CLAUDE.md / tech-stack.md): nullable on, warnings as errors, file-scoped namespaces, records for DTOs, thin controllers, async with `CancellationToken` where there is I/O.
- **Folder layout** follows tech-stack.md: health lives in `Modules/System/`, port handling in `Infrastructure/Hosting/`.
- **No template leftovers.** The `WeatherForecast` sample and its files are removed.
- **No data access.** This phase reads and writes no files under the data folder.

## Out of scope

| Item | Where it goes |
|---|---|
| `X-DevPath-Token` check, `Host` header check, CORS | Phase 0.3 |
| Electron, Vite, React, npm workspaces, `npm run check` | Phase 0.2 |
| Electron spawning and stopping the API | Phase 0.3 |
| `JsonFileStore`, `IRepository<T>`, migrations, `DEVPATH_DATA_DIR` | Phase 0.4 |
| Self-contained publish and installer | Phase 0.6 |
| Global error handling / `ProblemDetails` | Phase 1.1, with the first endpoint that can fail |
| In-memory error log buffer | Phase 7.3 |
| CI pipeline | Not planned |
| Renaming `Promtps.md` | Declined |

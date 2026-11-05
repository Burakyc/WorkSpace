# Requirements — Phase 0.7 Docker for the API

**Roadmap phase:** 0.7 Docker for the API (Milestone 0 — Skeleton)
**Branch:** `feat/0.7-docker-api`
**Estimate:** 1 day at 1–2 hours/day

## Goal

An optional development container for the API only. `npm run docker:api` builds and runs the API in Docker with the same security rules as the desktop app: reachable on `127.0.0.1` only, token required, data in the repo's gitignored `data/` folder. The desktop app and `npm run check` never need Docker.

## Scope

- `apps/api/Dockerfile` (multi-stage) and `apps/api/.dockerignore`.
- Root `docker-compose.yml` with the API service only.
- Kestrel binds `0.0.0.0` only when `DEVPATH_IN_CONTAINER=1`; otherwise `127.0.0.1` as before.
- `.env.example` (committed) and `.env` (gitignored) for `DEVPATH_TOKEN` and `DEVPATH_PORT`.
- Root script `docker:api`.
- README and `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Docker engine during implementation | Claude starts Docker Desktop to build and test the container; containers are stopped afterwards, Docker Desktop stays open. |
| Environment in the container | **Production**, like the installed app: token and data folder required, no OpenAPI document. |
| Data | **Repo `data/`** (gitignored) bind-mounted at `/data`, as in the roadmap. The repo lives in OneDrive, so README notes that sync can lock files during writes (pause sync or keep the repo outside OneDrive if writes fail). |
| `npm run docker:api` | **Foreground**: `docker compose up --build`; logs in the terminal, Ctrl+C stops it; `docker compose down` removes the container. |
| Base images | `mcr.microsoft.com/dotnet/sdk:10.0` (build) and `mcr.microsoft.com/dotnet/aspnet:10.0` (run): minor tags, so patch updates come with a rebuild. Not single-file or self-contained: the runtime image already has .NET. |
| Non-root user | The ASP.NET image's built-in `app` user (`USER $APP_UID`). |
| CORS in the container | No `DEVPATH_ORIGIN`: the container is for `curl`/tools, not for the desktop renderer. |
| Health check in compose | None: the runtime image has no `curl`, and the endpoint needs the token. |

## User stories

1. **As the developer**, I copy `.env.example` to `.env`, set a token, run `npm run docker:api`, and the API answers on `http://127.0.0.1:5180` with that token.
2. **As the developer**, if I forget the token, compose stops with a clear message instead of starting an open API.
3. **As the developer**, data written by the containerized API lands in the repo's `data/` folder and survives `docker compose down`.
4. **As the user**, nothing about the desktop app changes: it never needs Docker, and outside a container the API still listens on `127.0.0.1` only.

## Business and technical rules

### Binding

- `Infrastructure/Hosting/ApiBinding.cs`: `IPAddress Resolve(string? inContainer)` returns `IPAddress.Any` only for exactly `"1"`; anything else (unset, `"0"`, `"true"`, …) returns `IPAddress.Loopback`.
- `Program.cs` listens on `ApiBinding.Resolve(DEVPATH_IN_CONTAINER)` and `DEVPATH_PORT`.
- `tech-stack.md` "API rules" records the exception: inside the container the API must bind `0.0.0.0` to be reachable through Docker's port mapping; the host side is still published on `127.0.0.1` only, so nothing outside the machine can reach it.

### Image

- Build stage: restore with only `Directory.Build.props` and the `.csproj` first (layer cache), then copy the source and `dotnet publish -c Release -p:DebugType=None -o /app`.
- Run stage: `aspnet:10.0`, `WORKDIR /app`, `ENV DEVPATH_IN_CONTAINER=1 ASPNETCORE_ENVIRONMENT=Production DEVPATH_DATA_DIR=/data`, `USER $APP_UID`, `ENTRYPOINT ["dotnet", "DevPath.Api.dll"]`.
- `.dockerignore`: `**/bin`, `**/obj`, `publish/`, `DevPath.Api.Tests/`, `*.user`.

### Compose

- One service `api`, build context `apps/api`.
- `DEVPATH_TOKEN: ${DEVPATH_TOKEN:?…}`: compose refuses to start without it, with a message pointing to `.env.example`.
- `DEVPATH_PORT: ${DEVPATH_PORT:-5180}`; ports `127.0.0.1:${DEVPATH_PORT:-5180}:${DEVPATH_PORT:-5180}` (same port inside and out, so the `Host` header `127.0.0.1:<port>` passes the host check).
- Volume `./data:/data`.

### Files and scripts

- `.env.example`: `DEVPATH_TOKEN=` with a comment on generating a long random value, `DEVPATH_PORT=5180`.
- `.gitignore` already ignores `.env` and `.env.*`; add `!.env.example` so the example is committed.
- Root `package.json`: `"docker:api": "docker compose up --build"`.

## Out of scope

| Item | Where it goes |
|---|---|
| Running the desktop app or the renderer against the container | Not planned |
| Publishing images to a registry, CI | Not planned |
| Docker for `npm run check` or tests | Not planned (the roadmap says check never needs Docker) |
| HTTPS, reverse proxy | Not planned (local only) |
| A compose health check | Not planned (see decisions) |

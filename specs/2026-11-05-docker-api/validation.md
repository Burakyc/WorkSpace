# Validation — Phase 0.7 Docker for the API

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.7, plus the decisions in [requirements.md](requirements.md):

- [x] Multi-stage `apps/api/Dockerfile`: the .NET 10 SDK stage publishes, the ASP.NET runtime stage runs the API as a non-root user.
- [x] Root `docker-compose.yml` runs only the API and publishes `127.0.0.1:<port>:<port>`.
- [x] Kestrel binds `0.0.0.0` only when `DEVPATH_IN_CONTAINER=1`; otherwise `127.0.0.1`. `tech-stack.md` notes the exception.
- [x] `DEVPATH_TOKEN` comes from a gitignored `.env`; `.env.example` is committed. Compose stops with an error when the token is missing; requests without it get `401`.
- [x] Repo `data/` (gitignored) is bind-mounted as `DEVPATH_DATA_DIR`; data survives `docker compose down`.
- [x] `npm run docker:api` builds and starts the container; README documents it.
- [x] The container runs in Production (no OpenAPI document).
- [x] `npm run check` and the desktop app do not need Docker.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Inside a container | `apps/api/DevPath.Api.Tests/Infrastructure/Hosting/ApiBindingTests.cs` | `Resolve("1")` → `IPAddress.Any` |
| T2 | Everywhere else | same | `null`, `""`, `"0"`, `"true"`, `"yes"`, `" 1"` → `IPAddress.Loopback` |
| — | Earlier tests | existing | Still pass |

The container itself is not tested automatically (check never needs Docker); M2–M8 cover it.

## Manual test steps

Run from the repo root in PowerShell, with Docker Desktop running for M2–M8.

| ID | Step | Expected |
|---|---|---|
| M1 | `dotnet run --project apps/api/DevPath.Api`; `netstat -ano \| findstr :5180` | Listening on `127.0.0.1:5180` only (not `0.0.0.0`). |
| M2 | Without a `.env` file: `docker compose config` | Fails with the message that `DEVPATH_TOKEN` must be set (pointing to `.env.example`). |
| M3 | Copy `.env.example` to `.env` and set `DEVPATH_TOKEN`; `npm run docker:api` | Image builds; the log shows `Data folder: /data` and `Hosting environment: Production`. |
| M4 | `curl.exe -i http://127.0.0.1:5180/api/health` without, then with `-H "X-DevPath-Token: <token>"`; then with the token and `-H "Host: evil.example"` | `401`, `200`, `400`. |
| M5 | `curl.exe -i -H "X-DevPath-Token: <token>" http://127.0.0.1:5180/openapi/v1.json` | `404` (Production). |
| M6 | `netstat -ano \| findstr :5180` on the host | Listening on `127.0.0.1:5180` only. |
| M7 | `docker compose exec api id -u` | Not `0` (the `app` user). |
| M8 | `docker compose exec api sh -c "echo kept > /data/m8.txt"`; `docker compose down`; `npm run docker:api` again; `docker compose exec api cat /data/m8.txt` | `kept`; `data\m8.txt` is visible in the repo. Delete it afterwards. |
| M9 | `git status` | Neither `.env` nor anything under `data/` is listed; `.env.example` is tracked. |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M9 done with the expected results
- [x] `roadmap.md` phase 0.7 ticked and set to `done`

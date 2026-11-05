# Validation — Phase 0.1 API skeleton

The phase is done only when every acceptance criterion below is checked, all automated tests pass, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.1, plus the decisions in [requirements.md](requirements.md):

- [ ] `apps/api/DevPath.slnx` contains `DevPath.Api` and `DevPath.Api.Tests`; nullable is enabled and warnings are errors.
- [ ] `dotnet build apps/api/DevPath.slnx` finishes with 0 warnings and 0 errors.
- [ ] `GET /api/health` returns `200` with `{ "status": "ok", "version": "0.0.1" }`.
- [ ] Kestrel listens on `127.0.0.1:<DEVPATH_PORT>` only, and on `127.0.0.1:5180` when `DEVPATH_PORT` is not set.
- [ ] An invalid `DEVPATH_PORT` stops startup with a clear error and a non-zero exit code.
- [ ] `/openapi/v1.json` is served in Development and returns `404` in Production.
- [ ] xUnit tests with `WebApplicationFactory` cover the health endpoint; all tests pass.
- [ ] `.gitignore` covers `data/`, `backups/`, `.env*`, `secrets.bin`, `bin/`, `obj/`, `node_modules/`, `dist/`.
- [ ] No `WeatherForecast` template code is left.
- [ ] README has a "Development" section with the build, test and run commands.
- [ ] `tech-stack.md` and `roadmap.md` match the phase decisions (`.slnx`, OpenAPI in Development, port fallback).

## Automated tests

Run with:

```bash
dotnet test apps/api/DevPath.slnx
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | `Resolve` with `null`, `""` and `"  "` | `Infrastructure/Hosting/ApiPortTests.cs` | Returns `5180` |
| T2 | `Resolve` with `"1"`, `"6000"`, `"65535"` | same | Returns the number |
| T3 | `Resolve` with `"abc"`, `"0"`, `"-1"`, `"65536"`, `"70000"`, `"5180.5"`, `" 6000"` | same | Throws `ArgumentException`; message contains `DEVPATH_PORT` and the value |
| T5 | `GET /api/health` | `Modules/System/HealthEndpointTests.cs` | `200`, content type `application/json` |
| T6 | Health body | same | Deserializes to `status == "ok"` and `version == "0.0.1"`; JSON property names are camelCase |
| T7 | Version has no source-revision suffix | same | `version` does not contain `+` |
| T8 | `GET /openapi/v1.json` in Development | `OpenApiTests.cs` | `200`; document contains `/api/health` |
| T9 | `GET /openapi/v1.json` in Production (`UseEnvironment("Production")`) | same | `404` |

Not automated: the Kestrel socket binding. `WebApplicationFactory` runs on an in-memory `TestServer`, so binding is checked by M1–M3. `ApiPort` (T1–T3) covers the logic that feeds it.

## Manual test steps

Run from the repo root in PowerShell. Stop the API with `Ctrl+C` between steps.

| ID | Step | Expected |
|---|---|---|
| M1 | `dotnet run --project apps/api/DevPath.Api` | Log shows `Now listening on: http://127.0.0.1:5180`. No "Overriding address(es)" warning. |
| M2 | While M1 runs, in a second terminal: `netstat -ano \| findstr :5180` | Exactly one `LISTENING` line, on `127.0.0.1:5180`. No `0.0.0.0:5180` or `[::]:5180`. |
| M3 | While M1 runs: find your LAN IPv4 with `ipconfig`, then `curl.exe http://<LAN-IP>:5180/api/health` | Connection refused / fails. `curl.exe http://localhost:5180/api/health` may also fail if `localhost` resolves to `::1`; that is expected. |
| M4 | `$env:DEVPATH_PORT='6000'; dotnet run --project apps/api/DevPath.Api` | Listens on `http://127.0.0.1:6000`. Afterwards: `Remove-Item Env:DEVPATH_PORT`. |
| M4b | `$env:DEVPATH_PORT='abc'; dotnet run --project apps/api/DevPath.Api` | Does not start. Error mentions `DEVPATH_PORT` and `abc`. `$LASTEXITCODE` is not `0`. Afterwards: `Remove-Item Env:DEVPATH_PORT`. |
| M5 | With M1 running: `curl.exe http://127.0.0.1:5180/api/health` | `{"status":"ok","version":"0.0.1"}` |
| M6 | With M1 running: `curl.exe http://127.0.0.1:5180/openapi/v1.json` | OpenAPI JSON that lists `/api/health`. |
| M7 | `$env:ASPNETCORE_ENVIRONMENT='Production'; dotnet run --no-launch-profile --project apps/api/DevPath.Api`, then `curl.exe -i http://127.0.0.1:5180/openapi/v1.json` | `HTTP/1.1 404 Not Found`. Afterwards: `Remove-Item Env:ASPNETCORE_ENVIRONMENT`. |
| M8 | `dotnet build apps/api/DevPath.slnx`, then `git status` | No `bin/` or `obj/` folders listed. |
| M9 | `New-Item -ItemType Directory -Force data; Set-Content data/x.json '{}'; git status` | `data/` is not listed. Afterwards delete `data/`. |
| M10 | Search the API project for `WeatherForecast` | No matches. |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `dotnet build` 0 warnings, `dotnet test` all green
- [ ] M1–M10 done with the expected results
- [ ] `roadmap.md` phase 0.1 ticked and set to `done`

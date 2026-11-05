# Plan — Phase 0.1 API skeleton

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.1-api-skeleton
```

Prerequisite: .NET 10 SDK installed (`dotnet --version` prints `10.0.x`).

Every task ends with `dotnet build apps/api/DevPath.slnx` (zero warnings) and `dotnet test apps/api/DevPath.slnx` passing. Task 1 has no .NET code yet, so it only needs a `git status` check. A task is committed only when its checks pass.

## Tasks

### 1. Root `.gitignore`

**Commit:** `chore: add root gitignore`

- Create `.gitignore` at the repo root with:
  - personal data: `data/`, `backups/`
  - secrets: `.env`, `.env.*`, `secrets.bin`
  - .NET: `bin/`, `obj/`, `TestResults/`, `*.user`, `.vs/`
  - Node (for phase 0.2): `node_modules/`, `dist/`, `out/`, `release/`
  - local tool settings: `.claude/settings.local.json`
- Check: `git status` shows only `.gitignore`, and a test file at `data/x.json` is not listed.

### 2. Solution and API project

**Commit:** `chore(api): scaffold solution and web api project`

- `global.json` at the repo root: SDK `10.0.100`, `rollForward: latestFeature`.
- `apps/api/Directory.Build.props`: `TargetFramework net10.0`, `Nullable enable`, `ImplicitUsings enable`, `TreatWarningsAsErrors true`, `Version 0.0.1`, `IncludeSourceRevisionInInformationalVersion false`.
- `dotnet new sln -n DevPath -o apps/api` (creates `DevPath.slnx`).
- `dotnet new webapi --use-controllers -n DevPath.Api -o apps/api/DevPath.Api`, then add it to the solution.
- Remove template leftovers: `WeatherForecast.cs`, `WeatherForecastController.cs`, the `.http` file, `UseHttpsRedirection()`, `UseAuthorization()`, and the duplicate properties that `Directory.Build.props` now sets.
- In `Properties/launchSettings.json`, keep one `http` profile with `ASPNETCORE_ENVIRONMENT=Development` and no `applicationUrl` (Kestrel binding comes from code in task 4).
- Check: `dotnet build apps/api/DevPath.slnx` succeeds with zero warnings.

### 3. Test project

**Commit:** `test(api): add xunit test project`

- `apps/api/DevPath.Api.Tests/DevPath.Api.Tests.csproj` with `xunit` 2.9.3, `xunit.runner.visualstudio` 3.1.5, `Microsoft.NET.Test.Sdk` and `Microsoft.AspNetCore.Mvc.Testing` (xUnit v2 + VSTest; changed from xunit.v3 during implementation, which needs the Microsoft Testing Platform opt-in on the .NET 10 SDK); a project reference to `DevPath.Api`; add it to the solution.
- If `WebApplicationFactory<Program>` cannot see `Program`, add `public partial class Program;` at the end of `Program.cs`.
- Check: `dotnet test apps/api/DevPath.slnx` runs and exits with code 0.

### 4. Loopback binding and `DEVPATH_PORT`

**Commit:** `feat(api): bind kestrel to 127.0.0.1 with DEVPATH_PORT`

- `Infrastructure/Hosting/ApiPort.cs`: `public static int Resolve(string? value)`.
  - `null` or whitespace → `5180` (`ApiPort.Default`).
  - Integer `1–65535` → that value (parse with `CultureInfo.InvariantCulture`, `NumberStyles.None`).
  - Anything else → `ArgumentException` with a message naming `DEVPATH_PORT` and the bad value.
- `Program.cs`: `var port = ApiPort.Resolve(builder.Configuration["DEVPATH_PORT"]);` then `builder.WebHost.ConfigureKestrel(o => o.Listen(IPAddress.Loopback, port));`.
- Tests in `DevPath.Api.Tests/Infrastructure/Hosting/ApiPortTests.cs` (see validation.md, T1–T3).
- Check: build and tests pass; manual steps M1–M4 in validation.md.

### 5. Health endpoint

**Commit:** `feat(api): add health endpoint`

- `Modules/System/HealthResponse.cs`: `public sealed record HealthResponse(string Status, string Version);`
- `Modules/System/AppInfo.cs`: `public static string Version` read once from `AssemblyInformationalVersionAttribute`.
- `Modules/System/HealthController.cs`: `[ApiController] [Route("api/health")]`, `[HttpGet]` returns `Ok(new HealthResponse("ok", AppInfo.Version))`. No other logic.
- Tests in `DevPath.Api.Tests/Modules/System/HealthEndpointTests.cs` with `WebApplicationFactory<Program>` (T5–T7).
- Check: build and tests pass; manual step M5.

### 6. OpenAPI in Development

**Commit:** `feat(api): serve openapi document in development`

- Keep the template's `Microsoft.AspNetCore.OpenApi` package (or add it if the template did not include it).
- `Program.cs`: `builder.Services.AddOpenApi();` and `if (app.Environment.IsDevelopment()) app.MapOpenApi();`.
- Tests in `DevPath.Api.Tests/OpenApiTests.cs`: Development returns the document and lists `/api/health`; Production returns 404 (T8–T9).
- Check: build and tests pass; manual steps M6–M7.

### 7. README development section

**Commit:** `docs: add api development commands to readme`

- Add a short "Development" section to `README.md`: prerequisite (.NET 10 SDK), and the build, test and run commands, the default URL `http://127.0.0.1:5180/api/health`, and the `DEVPATH_PORT` variable.

### 8. Align specs with phase decisions

**Commit:** `docs(specs): align tech stack and roadmap with phase 0.1`

- `specs/tech-stack.md`: `DevPath.sln` → `DevPath.slnx` in the folder structure; under API rules, add "OpenAPI at `/openapi/v1.json` in Development only" and "falls back to port 5180 when `DEVPATH_PORT` is not set".
- `specs/roadmap.md`: phase 0.1 says `DevPath.slnx`.

### 9. Close the phase

**Commit:** `docs(roadmap): mark phase 0.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 0.1 boxes in `specs/roadmap.md` and set its status to `done`.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.1-api-skeleton` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `chore: add root gitignore` |
| 2 | `chore(api): scaffold solution and web api project` |
| 3 | `test(api): add xunit test project` |
| 4 | `feat(api): bind kestrel to 127.0.0.1 with DEVPATH_PORT` |
| 5 | `feat(api): add health endpoint` |
| 6 | `feat(api): serve openapi document in development` |
| 7 | `docs: add api development commands to readme` |
| 8 | `docs(specs): align tech stack and roadmap with phase 0.1` |
| 9 | `docs(roadmap): mark phase 0.1 done` |

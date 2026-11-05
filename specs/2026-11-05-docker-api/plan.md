# Plan — Phase 0.7 Docker for the API

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.7-docker-api
```

Every task ends with `npm run check` (which never uses Docker). A task is committed only when it passes. Container checks need Docker Desktop running.

## Tasks

### 1. Bind `0.0.0.0` only inside a container

**Commit:** `feat(api): bind all interfaces only inside a container`

- `Infrastructure/Hosting/ApiBinding.cs` and its use in `Program.cs` (rules in requirements.md).
- `Infrastructure/Hosting/ApiBindingTests.cs`: T1–T2.
- Check: `npm run check`; `dotnet run` still listens on `127.0.0.1:5180` only (M1).

### 2. Dockerfile

**Commit:** `chore(api): add a multi-stage dockerfile`

- `apps/api/Dockerfile` and `apps/api/.dockerignore` as in requirements.md.
- Check: `docker build -t devpath-api apps/api` succeeds; the image runs as a non-root user (M3).

### 3. Compose, `.env.example` and the npm script

**Commit:** `chore: run the api with docker compose`

- Root `docker-compose.yml`, `.env.example`, `.gitignore` (`!.env.example`), root script `docker:api`.
- Check: `npm run check`; M2, M4–M8.

### 4. Docs

**Commit:** `docs: document the api container`

- `README.md`: "API in Docker (optional)" with setup (`.env`), `npm run docker:api`, `curl.exe` example, `docker compose down`, the OneDrive note.
- `specs/tech-stack.md`: binding exception in "API rules"; a short "Docker (optional)" note in the overview.

### 5. Close the phase

**Commit:** `docs(roadmap): mark phase 0.7 done`

- Run every check in validation.md (automated and manual), then `docker compose down`.
- Only if all pass: tick the 0.7 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.7-docker-api` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(api): bind all interfaces only inside a container` |
| 2 | `chore(api): add a multi-stage dockerfile` |
| 3 | `chore: run the api with docker compose` |
| 3a | `fix(api): drop the default container port so kestrel does not warn` (found during M3) |
| 4 | `docs: document the api container` |
| 5 | `docs(roadmap): mark phase 0.7 done` |

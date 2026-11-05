# Plan — Phase 0.6 Windows installer

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.6-windows-installer
```

Every task ends with `npm run check`. A task is committed only when it passes. The first `dotnet publish` and `electron-builder` runs download the .NET runtime pack, NSIS and the Electron zip; later runs use the caches.

## Tasks

### 1. Self-contained API publish

**Commit:** `chore(api): publish a self-contained single-file exe`

- Root `package.json`: `"publish:api"` script (command in requirements.md).
- `.gitignore`: `apps/api/publish/`.
- Check: `npm run publish:api` creates `apps/api/publish/DevPath.Api.exe` (no `.pdb`); running it with `DEVPATH_TOKEN`, `DEVPATH_DATA_DIR` and `DEVPATH_PORT` set answers `/api/health` on a machine path without using the installed .NET runtime (M1).

### 2. Packaged API path in Electron main

**Commit:** `feat(desktop): use the bundled api when packaged`

- `electron/apiProcess.ts`: `resolveApiExePath({ packaged, resourcesPath, appPath }): string`.
- `electron/main.ts`: uses it; `ASPNETCORE_ENVIRONMENT` already follows `app.isPackaged`; the missing-exe message depends on `packaged`.
- `electron/apiProcess.test.ts`: T1–T2.
- Check: `npm run check`.

### 3. App icon

**Commit:** `feat(desktop): add a generated app icon`

- `apps/desktop/build/make-icon.ps1`: draws the 256×256 PNG with `System.Drawing` and writes `apps/desktop/build/icon.png`.
- Run it once and commit both files.
- Check: the PNG is 256×256 and looks right (M2).

### 4. electron-builder and the NSIS installer

**Commit:** `chore(desktop): package a per-user nsis installer`

- `npm install -E -D electron-builder -w apps/desktop` (reason in the commit body: builds the Windows installer).
- `apps/desktop/electron-builder.yml` as in requirements.md.
- Scripts: `apps/desktop` `"package"`, root `"package"`.
- If electron-builder cannot find the Electron version through the npm workspace, set `electronVersion` in the config to the installed exact version.
- Check: `npm run check`; `npm run package` builds `apps/desktop/release/DevPath Setup 0.0.1.exe` (M3); installer size noted.

### 5. Docs

**Commit:** `docs: document packaging and the installer`

- `README.md` "Development": `npm run package`, where the installer lands, SmartScreen note, what uninstall keeps.
- `specs/tech-stack.md`: packaging row (per-user NSIS wizard, unsigned, `node_modules` excluded, API files bundled), packaged `userData` = `%APPDATA%\DevPath`.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 0.6 done`

- Run every check in validation.md (automated and manual, including install and uninstall on this machine).
- If startup is 3 s or more: add `-p:PublishReadyToRun=true` to `publish:api`, rebuild, measure again, and record it in requirements.md (one extra commit `chore(api): publish ready-to-run`).
- Only if all pass: tick the 0.6 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.6-windows-installer` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `chore(api): publish a self-contained single-file exe` |
| 2 | `feat(desktop): use the bundled api when packaged` |
| 3 | `feat(desktop): add a generated app icon` |
| 4 | `chore(desktop): package a per-user nsis installer` |
| 4a | `fix(desktop): give the installed app its own userData folder` (found during M6) |
| 5 | `docs: document packaging and the installer` |
| 6 | `docs(roadmap): mark phase 0.6 done` |

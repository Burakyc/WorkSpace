# Requirements — Phase 0.6 Windows installer

**Roadmap phase:** 0.6 Windows installer (Milestone 0 — Skeleton)
**Branch:** `feat/0.6-windows-installer`
**Estimate:** 1–2 days at 1–2 hours/day

## Goal

Prove packaging early so every later phase can ship. One command builds a Windows installer that contains the desktop app and a self-contained API. The installed app starts in under 3 seconds, starts its API and shows the shell. Uninstalling removes the app but never the user's data.

## Scope

- `dotnet publish` of the API as a self-contained, single-file `DevPath.Api.exe` for `win-x64`.
- `electron-builder` with an NSIS installer that bundles the API under `resources/api/`.
- Electron main uses the bundled API when packaged.
- App name `DevPath`, version from `apps/desktop/package.json`, a simple generated icon.
- `npm run package` at the repo root builds everything in one command.
- README and `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Installer type | **Per-user wizard**: NSIS with `oneClick: false`, `perMachine: false`, `allowToChangeInstallationDirectory: true`. No admin rights; default folder `%LOCALAPPDATA%\Programs\DevPath`. Start menu and desktop shortcuts; "run after finish". |
| Icon | **Simple generated icon**: a 256×256 PNG (indigo `#4f46e5` rounded square with white "DP") drawn by `apps/desktop/build/make-icon.ps1` with `System.Drawing` (no new dependency). The PNG is committed; electron-builder converts it to `.ico`. |
| Install test | Claude installs, starts, measures and uninstalls the app on the dev machine during validation (silent `/S` install for the automated steps, plus one look at the wizard). |
| Code signing | **Unsigned.** It is a personal app; Windows SmartScreen will warn on first run ("More info → Run anyway"). |
| Bundled files | Only the publish output the API needs: `DevPath.Api.exe` and `appsettings.json` (no `.pdb`, no `appsettings.Development.json`, no `web.config`). The API runs with its folder as working directory (phase 0.3), so it finds `appsettings.json`. |
| `node_modules` | Not packaged. electron-vite already bundles the renderer (React, router, icons) and main/preload use only Node and Electron, so `files` excludes `node_modules`. This keeps the installer small without moving dependencies around. |
| `userData` | `productName: DevPath` makes the installed app's `userData` `%APPDATA%\DevPath` (with `app-config.json` there); the default data folder `%APPDATA%\DevPath\data` sits inside it. Unpackaged runs keep `%APPDATA%\@devpath\desktop` and `dev-data`. |
| Uninstall | `deleteAppDataOnUninstall: false`: `%APPDATA%\DevPath` (settings and data) stays. A data folder chosen elsewhere is never touched either. |
| Startup speed | Measured: normal starts 1.5–2.4 s; the first start right after installing about 3.3–3.7 s (one-time file scanning and profile creation). `PublishReadyToRun` was tried and did not change the first start (3.70 s) while adding 14 MB, so it is not used. The 3-second criterion applies to normal starts (decided with the user after measuring). |
| Install-mode page | electron-builder's per-user wizard always shows a first page "Sadece benim için / herkes için" (found during M4). "Sadece benim için" is preselected and needs no admin rights; hiding the page would need a custom NSIS script, so it stays. |
| App name when packaged | `productName` in electron-builder names the exe and installer but not the running app: Electron reads its name from the packaged `package.json`. `extraMetadata.productName: DevPath` fixes that, so the installed app uses `%APPDATA%\DevPath` and no longer shares `app-config.json` with development (found during M6). |
| Commit types | `chore(...)` instead of `build(...)`/`perf(...)`: CLAUDE.md allows only feat, fix, docs, refactor, test and chore. |

## User stories

1. **As the user**, I double-click one installer, choose where to install (or keep the default) and get Start menu and desktop shortcuts, without admin rights.
2. **As the user**, the installed app opens in under 3 seconds and shows the shell with "API: bağlı", with no .NET installed separately.
3. **As the user**, uninstalling DevPath removes the program but keeps my data folder and settings.
4. **As the developer**, `npm run package` builds the installer in one command, so every later phase can ship.

## Business and technical rules

### API publish

- Command (root script `publish:api`):
  `dotnet publish apps/api/DevPath.Api -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:DebugType=None -o apps/api/publish`
- `apps/api/publish/` is gitignored.
- The published exe runs in `Production` (Electron passes `ASPNETCORE_ENVIRONMENT=Production` when packaged), so the token and data folder rules from phases 0.3 and 0.4 apply in full.

### Desktop packaging

- `apps/desktop/electron-builder.yml`:
  - `appId: com.devpath.workspace`, `productName: DevPath`, `directories.output: release`, `directories.buildResources: build`.
  - `files`: `out/**/*` and `package.json`; `!node_modules/**/*`.
  - `extraResources`: `../api/publish` → `api`, filtered to `DevPath.Api.exe` and `appsettings.json`.
  - `win.target: nsis` (x64), `win.icon: build/icon.png`.
  - `nsis`: the wizard settings above, `createDesktopShortcut: true`, `createStartMenuShortcut: true`, `runAfterFinish: true`, `deleteAppDataOnUninstall: false`.
- `asar: true` (default). The renderer loads from `file://…/app.asar/out/renderer/index.html`; navigation guard and CSP from phase 0.2 stay as they are.
- Output: `apps/desktop/release/DevPath Setup <version>.exe` (gitignored by `release/`).

### Electron main

- API path: packaged → `join(process.resourcesPath, 'api', 'DevPath.Api.exe')`; unpackaged → the Debug build path from phase 0.3. The choice is a small pure function with a unit test.
- Missing exe when packaged → error box "API bulunamadı: <path>. Uygulamayı yeniden kurun." (the `dotnet build` hint stays for development only).

### Scripts

- Root `package.json`: `"publish:api"` (above) and `"package": "npm run publish:api && npm run package -w apps/desktop"`.
- `apps/desktop/package.json`: `"package": "electron-vite build && electron-builder --win nsis"`.
- `electron-builder` as an exact dev dependency of `apps/desktop`.

## Out of scope

| Item | Where it goes |
|---|---|
| Code signing | Not planned (personal app) |
| Auto-update | Not planned for the MVP |
| Per-machine install, other platforms | Not planned (Windows, per-user only) |
| A designed app icon | Later; the generated one is a placeholder |
| Moving or deleting data on uninstall | Not planned (decided) |
| CI builds of the installer | Not planned |
| Release tag `v0.1.0` | Phase 7.4 |

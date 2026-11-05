# Validation — Phase 0.6 Windows installer

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.6, plus the decisions in [requirements.md](requirements.md):

- [ ] `dotnet publish` produces a self-contained single-file `DevPath.Api.exe` (win-x64) that runs without the installed .NET runtime.
- [ ] electron-builder builds a per-user NSIS wizard installer that bundles the API under `resources/api/` (exe and `appsettings.json` only) and no `node_modules`.
- [ ] The installed app starts in under 3 seconds on the dev machine, starts the API and shows the shell with "API: bağlı".
- [ ] `npm run package` builds the installer in one command.
- [ ] Uninstall removes the program and shortcuts and leaves `%APPDATA%\DevPath` (settings and data) in place.
- [ ] The app and installer use the generated DevPath icon.
- [ ] README and `tech-stack.md` are updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Packaged path | `electron/apiProcess.test.ts` | `resolveApiExePath({ packaged: true, resourcesPath: R, … })` → `R\api\DevPath.Api.exe` |
| T2 | Development path | same | Unpackaged → `<appPath>\..\api\DevPath.Api\bin\Debug\net10.0\DevPath.Api.exe` |
| — | Earlier tests | existing | Still pass |

Packaging itself is not unit tested; M1–M9 cover it.

## Manual test steps

Run from the repo root in PowerShell.

| ID | Step | Expected |
|---|---|---|
| M1 | `npm run publish:api`; then start `apps/api/publish/DevPath.Api.exe` with `DEVPATH_TOKEN`, `DEVPATH_DATA_DIR` (a temp folder) and `DEVPATH_PORT=5199` set, and call `/api/health` with the token | `200` with `{ "status": "ok" }`. The folder holds `DevPath.Api.exe` and `appsettings*.json` but no `.pdb`. |
| M2 | Open `apps/desktop/build/icon.png` | 256×256 indigo rounded square with white "DP". |
| M3 | `npm run package` | Ends without errors; `apps/desktop/release/DevPath Setup 0.0.1.exe` exists. Note its size. |
| M4 | Start the installer and look at the first page; cancel | A wizard (not one-click) with the DevPath icon; no admin (UAC) prompt. |
| M5 | Install with defaults (`"DevPath Setup 0.0.1.exe" /S`) | `%LOCALAPPDATA%\Programs\DevPath\DevPath.exe` exists; `resources\api` holds only `DevPath.Api.exe` and `appsettings.json`; `resources\app.asar` exists and there is no `resources\app\node_modules`; Start menu and desktop shortcuts exist. |
| M6 | Start the installed app three times (closing it in between) and measure the time until the page shows "API: bağlı" | Every run under 3 s. The API log/data folder is `%APPDATA%\DevPath\data`. |
| M7 | With the app open, start it again from the Start menu | No second window; one `DevPath.Api` process. |
| M8 | Close the app | No `DevPath` or `DevPath.Api` process left. |
| M9 | Uninstall (`%LOCALAPPDATA%\Programs\DevPath\Uninstall DevPath.exe /S`) | The install folder and shortcuts are gone; `%APPDATA%\DevPath\data` (and `app-config.json` if present) are still there. |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M9 done with the expected results
- [ ] `roadmap.md` phase 0.6 ticked and set to `done`

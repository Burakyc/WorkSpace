# Validation — Phase 0.4 Storage foundation

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.4, plus the decisions in [requirements.md](requirements.md):

- [ ] `JsonFileStore` writes atomically (temp file, flush, replace) and holds one lock per file for reads, writes and updates.
- [ ] Paths outside the data folder are rejected.
- [ ] `IRepository<T>` has a JSON implementation; every file it writes has `schemaVersion`.
- [ ] Older files are upgraded on read and saved; files without `schemaVersion` count as version 0; newer-than-known files raise `UnsupportedSchemaVersionException` and are not changed.
- [ ] The API takes its data folder from `DEVPATH_DATA_DIR`, falls back to `%APPDATA%\DevPath\dev-data` only in Development, refuses to start otherwise, and creates the folder.
- [ ] Electron main reads `dataDir` from `app-config.json` in `userData`; default `%APPDATA%\DevPath\data` when packaged and `%APPDATA%\DevPath\dev-data` when not; the folder is created on first run and passed as `DEVPATH_DATA_DIR`.
- [ ] A broken `app-config.json` or an uncreatable folder shows a Turkish error window and quits without starting the API.
- [ ] Tests: round trip, interrupted write leaves the old file intact, concurrent writes, migration from v0 to v1, unknown future version, plus the tests below.
- [ ] README and `tech-stack.md` are updated.

## Automated tests

Run with:

```bash
npm run check
```

### API (xUnit, `apps/api/DevPath.Api.Tests/Infrastructure/Storage/`)

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Absolute setting | `DataDirectoryTests.cs` | `Resolve(@"C:\x\data", …)` → that path |
| T2 | Relative setting | same | `Resolve("data", …)` throws; message names `DEVPATH_DATA_DIR` |
| T3 | Unset, Development | same | `%APPDATA%\DevPath\dev-data` |
| T4 | Unset, Production | same | Throws; message names `DEVPATH_DATA_DIR` |
| T5 | Folder created at startup | same | With `DEVPATH_DATA_DIR` = a new temp subfolder, creating the client creates the folder |
| T6 | Production host without setting | same | Creating the client throws; message names `DEVPATH_DATA_DIR` |
| T7 | Round trip | `JsonFileStoreTests.cs` | Write then read returns equal JSON (`JsonNode.DeepEquals`) |
| T8 | Missing file | same | `ReadAsync` → `null` |
| T9 | Interrupted write | same | Write v1; a write whose serialization throws midway rethrows; file still holds v1 byte for byte; no `.tmp` left |
| T10 | Stale `.tmp` | same | A leftover `<file>.tmp` with garbage is ignored by read and replaced by the next write |
| T11 | Concurrent updates | same | 50 parallel `UpdateAsync` calls, each appending one item, mixed with 50 parallel reads → no exception; file has 50 items |
| T12 | Nested path | same | `notes/pages/a.json` creates the parent folders |
| T13 | Path guard | same | `../x.json`, `..\x.json`, `C:\x.json` and `notes/../../x.json` throw `ArgumentException`; nothing is written outside the folder |
| T14 | File is readable JSON | same | The file on disk is indented camelCase JSON |
| T15 | Missing `schemaVersion` | `DocumentSchemaTests.cs` | Treated as 0; v0→v1 step applied; result has `schemaVersion: 1`; `Changed` is true |
| T16 | Several steps | same | v0→v1→v2 run in order (each step sees the previous result) |
| T17 | Current version | same | Returned unchanged; `Changed` is false |
| T18 | Future version | same | `schemaVersion: 3` with current 2 → `UnsupportedSchemaVersionException` naming the file, 3 and 2 |
| T19 | Missing step | same | Current 2 with only a 0→1 step, file at v1 → error; message names the missing version |
| T20 | Bad `schemaVersion` | same | `"1"` (string) or `1.5` → error naming the file |
| T21 | Migration saved on read | `JsonFileStoreTests.cs` | v0 file on disk → after `ReadAsync` the file on disk has `schemaVersion: 1` and the migrated content |
| T22 | Current file not rewritten | same | Reading a current-version file leaves its last-write time unchanged |
| T23 | Future file untouched | same | Reading a newer file throws and the file is byte-for-byte unchanged |
| T24 | Empty when missing | `JsonRepositoryTests.cs` | `GetAllAsync` → empty; `GetAsync("x")` → `null`; no file created |
| T25 | Upsert creates file | same | File has `schemaVersion` = current and one item in `items` |
| T26 | Upsert replaces | same | Same id twice → one item with the new values, same position |
| T27 | Order kept | same | Three upserts → `GetAllAsync` returns them in insert order |
| T28 | Delete | same | Known id → `true`, item gone; unknown id → `false`, file not rewritten |
| T29 | Persisted | same | A new `JsonRepository` on the same folder reads the same items |
| T30 | Concurrent upserts | same | 50 parallel upserts with different ids → 50 items |
| — | Phase 0.1–0.3 tests | existing | Still pass (`ApiFactory` now sets a temp `DEVPATH_DATA_DIR`) |

### Desktop (Vitest)

| ID | Test | File | Expected |
|---|---|---|---|
| T31 | Missing config | `electron/appConfig.test.ts` | `readAppConfig` → `{}` |
| T32 | Valid config | same | `{ "dataDir": "D:\\DevPathData", "other": 1 }` → `{ dataDir: "D:\\DevPathData" }` |
| T33 | Invalid JSON | same | Throws; message contains the file path |
| T34 | Not an object | same | `[]` or `"x"` → throws |
| T35 | Bad `dataDir` | same | Relative path, empty string or a number → throws; message contains the file path |
| T36 | Config wins | same | `resolveDataDir({ dataDir: X }, …)` → `X` for packaged and unpackaged |
| T37 | Defaults | same | No `dataDir` → `<appData>\DevPath\data` when packaged, `<appData>\DevPath\dev-data` when not |

Not automated: Electron creating the folder, the error windows, and the API receiving `DEVPATH_DATA_DIR`. M1–M8 cover them.

## Manual test steps

Run from the repo root in PowerShell. `userData` while unpackaged is `%APPDATA%\@devpath\desktop` (check it once with the console in M1 if unsure). Delete `app-config.json` there after M2–M5.

| ID | Step | Expected |
|---|---|---|
| M1 | Remove `%APPDATA%\DevPath\dev-data` if it exists, then `npm run dev` | The window shows "API: bağlı". The terminal shows `Data folder: …\AppData\Roaming\DevPath\dev-data`, and the folder exists. `%APPDATA%\DevPath\data` was not created. |
| M2 | Close the app. Write `{ "dataDir": "C:\\Temp\\devpath-m2" }` to `%APPDATA%\@devpath\desktop\app-config.json`, then `npm run dev` | `C:\Temp\devpath-m2` is created; the log shows it; "API: bağlı". |
| M3 | Put `{ not json` in `app-config.json`, then `npm run dev` | Error box "DevPath başlatılamadı" naming `app-config.json`; after OK the app quits; no `DevPath.Api` process. |
| M4 | Put `{ "dataDir": "relative\\folder" }` in `app-config.json`, then `npm run dev` | Same error box, naming the file and saying the path must be absolute. |
| M5 | Put a `dataDir` that cannot be created (e.g. `"Q:\\nope"` with no `Q:` drive), then `npm run dev` | Error box naming the folder; app quits; no `DevPath.Api` process. |
| M6 | Delete `app-config.json`. `dotnet run --project apps/api/DevPath.Api` | Log shows `Data folder: …\DevPath\dev-data`; `/api/health` answers. |
| M7 | `$env:DEVPATH_TOKEN='x'; $env:ASPNETCORE_ENVIRONMENT='Production'; dotnet run --project apps/api/DevPath.Api --no-launch-profile`; afterwards remove both variables | The API exits with an error naming `DEVPATH_DATA_DIR`. |
| M8 | After all steps, `git status` | No data files or `.tmp` files under the repo. |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M8 done with the expected results
- [ ] `roadmap.md` phase 0.4 ticked and set to `done`

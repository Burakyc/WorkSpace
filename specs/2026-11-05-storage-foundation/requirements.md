# Requirements — Phase 0.4 Storage foundation

**Roadmap phase:** 0.4 Storage foundation (Milestone 0 — Skeleton)
**Branch:** `feat/0.4-storage-foundation`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

Safe JSON storage that every module builds on. The API gets a data folder from `DEVPATH_DATA_DIR`, writes files atomically with one lock per file, upgrades old files on read, refuses files from a newer app version, and offers `IRepository<T>` for collection files. Electron main decides the data folder (from `app-config.json` or a default), creates it, and passes it to the API.

No module stores real data yet; phase 1.1 (Goals) is the first user. This phase is proven by tests and by the folder appearing on first run.

## Scope

- **API** (`Infrastructure/Storage/`)
  - `DataDirectory`: resolves and creates the data folder at startup, logs its path.
  - `JsonFileStore`: read, write and read-modify-write of JSON documents under the data folder; atomic writes; one lock per file; rejects paths outside the folder.
  - `DocumentSchema` + `Migration`: current version and ordered upgrade steps per file type; upgrade on read and save back; error on a newer version.
  - `IRepository<T>` and `JsonRepository<T>` for `{ "schemaVersion": n, "items": [...] }` files.
- **Electron main**
  - `electron/appConfig.ts`: read `app-config.json` from `userData`, resolve the data folder.
  - Create the folder, pass `DEVPATH_DATA_DIR` to the API, error window on any problem.
- README and `tech-stack.md` updated with the decisions below.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Dev vs. installed data | **Separate.** Installed (packaged) app default: `%APPDATA%\DevPath\data`. Unpackaged Electron (`npm run dev`, `npm run start`) and the API run on its own in `Development` default to `%APPDATA%\DevPath\dev-data`. Outside `Development`, the API refuses to start without `DEVPATH_DATA_DIR`. |
| Copy before migration | **No copy.** A migrated file is saved in place, as `tech-stack.md` says. Daily backups (phase 8.1) cover this later. |
| `userData` folder | **Electron default** for now (`%APPDATA%\@devpath\desktop` while unpackaged). Phase 0.6 sets `productName`, which moves it for the installed app. |
| Broken config or folder | **Error window and quit**, like an API start failure: a Turkish message naming the file or folder. The app never silently falls back to another folder. |
| Who creates the folder | Electron main creates it before starting the API (so the error can name the folder). The API also creates it at startup, so `dotnet run` and Docker (phase 0.7) work on their own. Both are idempotent. |
| Migration steps | A small record, `Migration(int FromVersion, Func<JsonObject, JsonObject> Upgrade)`, instead of an `IMigration` interface: one implementation, no second use. Steps work on `JsonObject`, so old C# types never need to be kept. |
| Locking | Reads take the per-file lock too. On Windows, a file open for reading blocks `File.Move(..., overwrite: true)`, so unlocked reads could make writes fail. |
| Missing `schemaVersion` | Treated as version `0`. |
| "No change" in an update | `UpdateAsync` writes nothing when the update function returns `null` (decided during task 4, so deleting an unknown id neither rewrites nor creates the file). |
| `dataDir` rule in Electron | Same rule as the API's `Path.IsPathFullyQualified`: a drive path (`D:\…`) or UNC path (`\\server\…`); `\data` is rejected. A UTF-8 byte order mark at the start of `app-config.json` is accepted, because Notepad and PowerShell 5.1 write one (decided during task 5). |

## User stories

1. **As the user**, the first time I start the app, a data folder is created for me without any setup.
2. **As the user**, a crash or power cut in the middle of a save never leaves a half-written file. I get either the old data or the new data.
3. **As the user**, when a new app version changes a file format, my old files are upgraded automatically the first time they are read.
4. **As the user**, if I open my data with an older app version than the one that last wrote it, the app refuses the file instead of damaging it.
5. **As the user**, I can point the app at another data folder by putting `dataDir` in `app-config.json`. If that file or folder is wrong, I get a clear Turkish error instead of an empty app.
6. **As the developer**, `npm run dev` and `dotnet run` use a separate `dev-data` folder, so I can't break my real data while developing.
7. **As the developer**, a module stores a list of entities with a few lines: an entity record, a `DocumentSchema` and a `JsonRepository<T>`.

## Business and technical rules

### Data folder (API)

- `DEVPATH_DATA_DIR` set → it must be an absolute path; a relative path is a startup error naming `DEVPATH_DATA_DIR`.
- Not set → `Development`: `%APPDATA%\DevPath\dev-data` (`Environment.SpecialFolder.ApplicationData`). Any other environment: startup error naming `DEVPATH_DATA_DIR`.
- At startup the API creates the folder (`Directory.CreateDirectory`) and logs `Data folder: <path>` at `Information`.
- Registered once in DI as `DataDirectory` (holds the full path).

### `JsonFileStore`

- All paths are relative to the data folder, with `/` separators (e.g. `notes/pages/<id>.json`). The resolved full path must stay inside the data folder; `..`, absolute paths and anything else outside throw `ArgumentException`.
- Operations, all `async` with a `CancellationToken`:
  - `ReadAsync(path, schema)` → `JsonObject?` (`null` when the file does not exist).
  - `WriteAsync(path, schema, document)` → sets `schemaVersion` to the schema's current version and writes.
  - `UpdateAsync(path, schema, Func<JsonObject?, JsonObject> update)` → read, apply, write under one lock (no lost updates).
- **One lock per file:** a `SemaphoreSlim` per full path (case-insensitive, Windows), held for reads, writes and updates.
- **Atomic write:** create missing parent folders; serialize to `<file>.tmp` in the same folder; `Flush(flushToDisk: true)`; `File.Move(tmp, file, overwrite: true)`. If anything fails before the move, the `.tmp` file is deleted (best effort) and the error is rethrown; the original file is untouched. A stale `.tmp` left by a crash is ignored by reads and overwritten by the next write.
- JSON: `System.Text.Json` with one shared `JsonSerializerOptions` (camelCase, indented for readable files).
- No retries on locked files and no cross-process locking: the single-instance lock means one API per data folder.

### Migrations

- `DocumentSchema(int CurrentVersion, IReadOnlyList<Migration> Migrations)` per file type.
- On read: `schemaVersion` missing → `0`; not a whole number → error naming the file.
  - Equal to current → returned as is, file not rewritten.
  - Lower → apply the steps for each version from the file's version up to current, in order, set `schemaVersion` to current, save back atomically (under the same lock), return the result. A missing step is an error (a bug in the schema definition), and nothing is saved.
  - Higher → `UnsupportedSchemaVersionException` naming the file, its version and the supported version. The file is not changed.
- No backup copy before saving a migrated file (see decisions).

### Repository

- `IEntity { string Id }`; `IRepository<T> where T : IEntity` with `GetAllAsync`, `GetAsync(id)`, `UpsertAsync(entity)`, `DeleteAsync(id)` (returns `bool`).
- `JsonRepository<T>(JsonFileStore store, string path, DocumentSchema schema)` stores `{ "schemaVersion": n, "items": [ ... ] }`.
  - Missing file → empty list. The first upsert creates the file.
  - Upsert replaces the item with the same `id` (ordinal) in place, or appends a new one. Order is kept.
  - Delete of an unknown id returns `false` and does not rewrite the file.
- Modules register their repositories themselves in later phases; this phase registers only `DataDirectory` and `JsonFileStore`.

### Electron main

- `app-config.json` lives in `app.getPath('userData')`. In this phase Electron only reads it; the settings page (phase 0.5) writes it.
  - Missing → `{}`.
  - Invalid JSON, not an object, or `dataDir` present but not a non-empty absolute path string → error naming the file.
  - Other keys are ignored (later phases add settings).
- Data folder = `dataDir` from the config, else `%APPDATA%\DevPath\data` when packaged, else `%APPDATA%\DevPath\dev-data` (`app.getPath('appData')`).
- Before starting the API, main creates the folder (`mkdirSync(..., { recursive: true })`). Failure → error naming the folder.
- `DEVPATH_DATA_DIR` is added to the API's environment.
- Every failure above uses the existing `dialog.showErrorBox('DevPath başlatılamadı', <reason>)` and quits; the API is not started.

## Out of scope

| Item | Where it goes |
|---|---|
| Real entities and their files (`goals.json`, …) | Phase 1.1 and later |
| Settings page that shows and changes the data folder, restarting the API | Phase 0.5 |
| Writing `app-config.json`, giving it a `schemaVersion` | Phase 0.5 (first writer) |
| Moving `userData` to `%APPDATA%\DevPath` (`productName`) | Phase 0.6 |
| Daily backups and restore | Phase 8.1 |
| Copy of the old file before a migration | Not planned (decided) |
| Retries when antivirus or sync briefly locks a file; cross-process locks | Not planned; add if seen |
| SQLite or any other store | Not planned (`IRepository<T>` keeps it possible) |
| An API endpoint that reads or writes data | Phase 1.1 |

# Plan — Phase 0.4 Storage foundation

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.4-storage-foundation
```

Every task ends with `npm run check`. A task is committed only when it passes. No new npm or NuGet packages: `System.Text.Json` (`JsonObject`), `System.IO` and Node's `fs`/`path` cover everything.

API tests use a fresh temp folder per test (`Path.Combine(Path.GetTempPath(), "devpath-tests", Guid.NewGuid().ToString())`), deleted afterwards. They never touch `%APPDATA%`.

## Tasks

### 1. Data folder in the API

**Commit:** `feat(api): resolve the data folder from DEVPATH_DATA_DIR`

- `Infrastructure/Storage/DataDirectory.cs`: `sealed record DataDirectory(string Path)` with `static DataDirectory Resolve(string? value, bool isDevelopment)` (rules in requirements.md).
- `Program.cs`: register `DataDirectory` as a singleton from configuration and the environment; after `Build()`, resolve it, `Directory.CreateDirectory`, and log `Data folder: <path>`.
- `ApiFactory` sets `DEVPATH_DATA_DIR` to a temp folder, so the existing Development tests do not create `%APPDATA%\DevPath\dev-data`.
- `Infrastructure/Storage/DataDirectoryTests.cs`: T1–T6.
- Check: `npm run check`.

### 2. `JsonFileStore` with atomic writes and per-file locks

**Commit:** `feat(api): add json file store with atomic writes`

- `Infrastructure/Storage/JsonFileStore.cs` (singleton, takes `DataDirectory`):
  - `ReadAsync(path, ct)`, `WriteAsync(path, document, ct)`, `UpdateAsync(path, update, ct)` on `JsonObject`.
  - Path guard, per-path `SemaphoreSlim` in a `ConcurrentDictionary` (`StringComparer.OrdinalIgnoreCase`), atomic write as in requirements.md, `.tmp` cleanup on failure.
  - Shared `JsonSerializerOptions` (camelCase, indented) in `Infrastructure/Storage/StorageJson.cs`.
- Register in `Program.cs`.
- `Infrastructure/Storage/JsonFileStoreTests.cs`: T7–T14. The interrupted-write test (T9) writes a `JsonObject` that holds a value whose property getter throws, so serialization fails after part of the `.tmp` file is written. No test hooks in production code.
- Check: `npm run check`.

### 3. Schema versions and migrations

**Commit:** `feat(api): migrate json files on read`

- `Infrastructure/Storage/Migration.cs`: `sealed record Migration(int FromVersion, Func<JsonObject, JsonObject> Upgrade)`.
- `Infrastructure/Storage/DocumentSchema.cs`: `sealed record DocumentSchema(int CurrentVersion, IReadOnlyList<Migration> Migrations)` with `(JsonObject Document, bool Changed) Migrate(JsonObject document, string path)`.
- `Infrastructure/Storage/UnsupportedSchemaVersionException.cs`.
- `JsonFileStore`: `ReadAsync`, `WriteAsync` and `UpdateAsync` take a `DocumentSchema`. Read migrates and saves back under the same lock when `Changed`; write and update set `schemaVersion` to current.
- Update the task 2 tests for the new signatures.
- `Infrastructure/Storage/DocumentSchemaTests.cs` (T15–T20) and migration-on-disk tests in `JsonFileStoreTests.cs` (T21–T23).
- Check: `npm run check`.

### 4. `IRepository<T>` and `JsonRepository<T>`

**Commit:** `feat(api): add json repository`

- `Infrastructure/Storage/IEntity.cs`, `IRepository.cs`, `JsonRepository.cs` as in requirements.md. `UpsertAsync` and `DeleteAsync` go through `JsonFileStore.UpdateAsync`.
- `Infrastructure/Storage/JsonRepositoryTests.cs` with a test-only `sealed record TestItem(string Id, string Title) : IEntity`: T24–T30.
- Check: `npm run check`.

### 5. `app-config.json` in Electron main

**Commit:** `feat(desktop): read the data folder from app-config.json`

- `electron/appConfig.ts`:
  - `readAppConfig(file: string): AppConfig` (`{ dataDir?: string }`); throws an `Error` with a Turkish message naming the file for invalid content.
  - `resolveDataDir(config: AppConfig, appDataDir: string, packaged: boolean): string`.
- `electron/appConfig.test.ts`: T31–T37 (temp files with `fs.mkdtempSync`).
- Check: `npm run check`.

### 6. Pass the data folder to the API

**Commit:** `feat(desktop): pass the data folder to the api`

- `electron/apiProcess.ts`: `StartApiOptions` gets `dataDir`; env gets `DEVPATH_DATA_DIR`.
- `electron/main.ts` `launchApi()`: `readAppConfig(join(app.getPath('userData'), 'app-config.json'))` → `resolveDataDir(...)` → `mkdirSync(dataDir, { recursive: true })` (failure → "Veri klasörü oluşturulamadı: <path>") → `startApi({ ..., dataDir })`. All errors reach the existing error box.
- Check: `npm run check`; manual M1–M5.

### 7. Docs

**Commit:** `docs: document the data folder and storage rules`

- `README.md` "Development": `npm run dev` and `dotnet run` use `%APPDATA%\DevPath\dev-data`; `app-config.json` location and `dataDir`; `DEVPATH_DATA_DIR`.
- `specs/tech-stack.md` "Storage design":
  - Data folder: dev default `%APPDATA%\DevPath\dev-data`; API refuses to start outside Development without `DEVPATH_DATA_DIR`; Electron and API both create the folder.
  - File rules: reads take the per-file lock (and why); `.tmp` cleanup; path guard; missing `schemaVersion` = 0; migrations are `Migration` records on `JsonObject`, not `IMigration`; no copy before a migration.

### 8. Close the phase

**Commit:** `docs(roadmap): mark phase 0.4 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 0.4 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.4-storage-foundation` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(api): resolve the data folder from DEVPATH_DATA_DIR` |
| 2 | `feat(api): add json file store with atomic writes` |
| 3 | `feat(api): migrate json files on read` |
| 4 | `feat(api): add json repository` |
| 5 | `feat(desktop): read the data folder from app-config.json` |
| 6 | `feat(desktop): pass the data folder to the api` |
| 7 | `docs: document the data folder and storage rules` |
| 8 | `docs(roadmap): mark phase 0.4 done` |

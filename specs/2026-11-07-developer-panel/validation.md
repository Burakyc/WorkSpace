# Validation — Phase 7.3 Developer panel

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 7.3, plus the decisions in [requirements.md](requirements.md):

- [x] Hidden route (`Ctrl+Shift+D`) showing API health and version, last 50 errors from an in-memory log buffer, and data file sizes.
- [x] No secrets or personal content shown (no messages, no real paths, no file names inside folders).
- [x] API and renderer errors are both listed.
- [x] Tests: error buffer keeps only the last 50.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Last 50 | `Infrastructure/Diagnostics/ErrorBufferTests.cs` | 60 entries → the 50 newest, newest first |
| T2 | Logger | same | `LogError(exception)` from a service → source = the throwing type, kind = exception type; `LogWarning` → nothing; no message kept |
| T3 | Route | same | Inside a request with a matched route the path is `METHOD template` |
| T4 | Sizes | `Modules/System/DataFileSizesTests.cs` | Two files and a folder with nested files → per-file sizes, folder count and sum, total; sorted |
| T5 | Endpoint | `Modules/System/DevEndpointTests.cs` | `GET /api/dev` → `errors`, `files` with `settings.json` after a save, `totalBytes`; no token → `401` |
| T6 | Last 50 | `src/shared/errors/errorLog.test.ts` | 60 records → 50 newest, newest first |
| T7 | Masking and listeners | same | `GET /api/notes/0f8f…/content?x=1` → `GET /api/notes/{…}/content`; a window `error` event and an `unhandledrejection` are recorded with their names |
| T8 | Client | `src/shared/api/client.test.ts` | A `500` and a rejected fetch are recorded; a `400` is not |
| T9 | Shortcut | `src/app/shortcuts.test.ts` | `Ctrl+Shift+D` → `devPanel`; not in the help list |
| T10 | Panel | `src/modules/devpanel/DevPanelPage.test.tsx` | Shows "Durum: çalışıyor", the version, API and renderer errors merged newest first, the file table and total |
| T11 | Failures | same | `/api/dev` fails → "API hataları okunamadı." with renderer errors still listed; health fails → "Durum: yanıt yok" |
| T12 | Toggle | same | `Ctrl+Shift+D` on Ana Sayfa opens the panel; again goes back |

## Manual test steps

Run the app (`npm run dev`) with some data.

| ID | Step | Expected |
|---|---|---|
| M1 | Press `Ctrl+Shift+D` on any page; press it again | The panel opens with status, version and response time; the second press returns to the page |
| M2 | Look at "Veri dosyaları" | `goals.json`, `settings.json`, `notes/` (with count) and so on, plus the total; no note titles or ids |
| M3 | Stop the API process, press "Yenile" | "Durum: yanıt yok"; a renderer `NetworkError` row appears with a masked path |
| M4 | Check the error rows and the page for any token, note text or GUID | None is shown |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M4 done with the expected results
- [x] `roadmap.md` phase 7.3 ticked and set to `done`

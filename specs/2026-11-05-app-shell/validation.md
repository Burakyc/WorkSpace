# Validation — Phase 0.5 App shell and design tokens

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.5, plus the decisions in [requirements.md](requirements.md):

- [x] `tokens.css` defines colors, fonts and spacing as CSS variables; light and dark follow the OS; components use only tokens.
- [x] Sidebar + content layout with routes for Ana Sayfa, Hedefler, Pomodoro, Takvim, Notlar, İngilizce, Öğrenme, Mülakat, Ayarlar.
- [x] Below 900 px the sidebar collapses to icons and content is one column.
- [x] Each page except Ayarlar shows an empty state that says what to do next.
- [x] Ayarlar shows the data folder and changes it with the native folder picker; the API restarts with the new path; a failed restart returns to the old folder.
- [x] `app-config.json` is written atomically with `schemaVersion: 1`.
- [x] The sidebar is fully keyboard navigable with visible focus; a skip link leads to the content.
- [x] The API status is in the sidebar footer.
- [x] README and `tech-stack.md` are updated.

## Automated tests

Run with:

```bash
npm run check
```

### Renderer (Vitest + React Testing Library)

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Sidebar links | `src/app/AppLayout.test.tsx` | `navigation` "Ana menü" has 9 links with the Turkish labels, in table order |
| T2 | Active link | same | On `/goals`, the "Hedefler" link has `aria-current="page"` and no other link does |
| T3 | Navigation | same | Clicking "Takvim" shows the heading "Takvim" |
| T4 | Unknown path | same | `/nope` shows the Ana Sayfa heading |
| T5 | Skip link | same | The first focusable element is "İçeriğe geç" and points to `#content`; `main#content` exists |
| T6 | Empty state | `src/shared/ui/EmptyState.test.tsx` | Renders the title as `<h1>`, the description and the next step |
| T7 | Every page has its empty state | `src/app/AppLayout.test.tsx` | For each table entry except Ayarlar: the page shows its `<h1>` and the "next" text |
| T17 | Shows the folder | `src/modules/settings/SettingsPage.test.tsx` | The path from `settings.getDataDir()` is shown, with the "verileri taşımaz" note |
| T18 | Change | same | Clicking "Klasör seç…" calls `changeDataDir()`; the button shows "Değiştiriliyor…" and is disabled while it runs |
| T19 | Cancel | same | `changeDataDir()` resolves `null` → the path stays, no error |
| T20 | Error | same | `changeDataDir()` rejects → the message appears in `role="alert"`; the button is enabled again |
| — | Earlier tests | existing | Still pass (`App.test.tsx` updated for the shell) |

### Electron main (Vitest, node)

| ID | Test | File | Expected |
|---|---|---|---|
| T8 | New config | `electron/appConfig.test.ts` | `writeAppConfig` on a missing file writes `{ "schemaVersion": 1, "dataDir": … }` |
| T9 | Keeps other keys | same | Existing `{ "other": 1 }` keeps `other` |
| T10 | Atomic | same | No `.tmp` file is left; the result reads back with `readAppConfig` |
| T11 | Future version | same | `readAppConfig` on `{ "schemaVersion": 2 }` throws naming the file |
| T12 | Same folder | `electron/dataDirSwitch.test.ts` | No step runs; returns the current state |
| T13 | Success | same | Order: create folder → write config → stop old API → start new API; returns the new folder and API |
| T14 | Folder fails | same | Rejects with "Veri klasörü oluşturulamadı: <path>"; config not written; API not stopped |
| T15 | New API fails | same | Config restored to the previous content, old folder's API started; rejects with "…eski klasöre dönüldü." |
| T16 | Old API fails too | same | Rejects with an error marked fatal, so main shows the error box and quits |

Not automated: real colors and contrast, the 900 px breakpoint, the folder dialog, the window reload and the API restart. M1–M10 cover them.

## Manual test steps

Run `npm run dev` from the repo root unless a step says otherwise.

| ID | Step | Expected |
|---|---|---|
| M1 | Switch Windows between light and dark mode | The whole shell follows: background, sidebar, text, accent. |
| M2 | Click each sidebar item | Each page opens in one click and shows its empty state (Ayarlar shows the data folder). The active item is highlighted. |
| M3 | In both themes, check text and focus ring contrast with DevTools' color picker (Contrast ratio) | Body and muted text ≥ 4.5:1; focus ring ≥ 3:1. |
| M4 | Click into the window, press Tab repeatedly, then Enter on a link | First stop is "İçeriğe geç"; then every sidebar link in order with a visible ring; Enter opens the page. "İçeriğe geç" + Enter moves focus to the content. |
| M5 | Resize the window from wide to 800 px | Below 900 px the sidebar shows icons only (tooltip on hover), the API status shows only its dot; above 900 px labels return. No horizontal scroll. |
| M6 | Look at the sidebar footer | "API: bağlı" with a green dot. |
| M7 | Ayarlar → "Klasör seç…" → pick a new empty folder (e.g. `C:\Temp\devpath-m7`) | The window reloads on Ayarlar and shows the new path; the API log shows `Data folder: C:\Temp\devpath-m7`; the footer says "API: bağlı". `app-config.json` in `%APPDATA%\@devpath\desktop` has `schemaVersion: 1` and the new `dataDir`. |
| M8 | Ayarlar → "Klasör seç…" → Cancel | Nothing changes, no error. |
| M9 | Close and restart the app | It starts with the folder from M7. Then choose `%APPDATA%\DevPath\dev-data` again and delete `C:\Temp\devpath-m7`. |
| M10 | `npm run build -w apps/desktop`, `npm run start -w apps/desktop` | Production build: routing works (hash URLs), icons show, no CSP errors in the console. |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M10 done with the expected results
- [x] `roadmap.md` phase 0.5 ticked and set to `done`

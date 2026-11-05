# Plan — Phase 0.5 App shell and design tokens

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.5-app-shell
```

Every task ends with `npm run check`. A task is committed only when it passes. New packages are installed with exact versions (`npm install -E`).

## Tasks

### 1. Router and icons

**Commit:** `chore(desktop): add react-router and lucide-react`

- `npm install -E react-router lucide-react -w apps/desktop` (both named in `tech-stack.md`: routing between modules and SVG icons).
- Commit body gives the reason for each package.
- Check: `npm run check`.

### 2. Design tokens

**Commit:** `feat(desktop): add design tokens`

- `src/shared/ui/tokens.css` with every token listed in requirements.md, light and dark values (indigo accent).
- `src/index.css` imports the tokens and sets base styles: `body` background/text/font from tokens, `:focus-visible` ring, `.visually-hidden` helper, skip-link style. The placeholder styles go away in task 3.
- Check: `npm run check`; manual M1.

### 3. Sidebar layout and routes

**Commit:** `feat(desktop): add sidebar layout and routes`

- `src/app/navigation.tsx`: the route table from requirements.md (icons from `lucide-react`). For now every entry renders a plain `<h1>` with its label.
- `src/app/AppLayout.tsx` + `AppLayout.module.css`: skip link, `<nav aria-label="Ana menü">` with `NavLink`s (icon + label + `title`), `<main id="content" tabIndex={-1}>` with `<Outlet />`, `ApiStatus` in the sidebar footer.
- `src/App.tsx`: `HashRouter` → layout route with one child per table entry, plus `*` → `<Navigate to="/" replace />`.
- `ApiStatus`: status dot + text, styled with tokens.
- Tests: `src/app/AppLayout.test.tsx` (T1–T5); update `App.test.tsx` (the placeholder text is gone).
- Check: `npm run check`; manual M2, M4.

### 4. Collapse below 900 px

**Commit:** `feat(desktop): collapse the sidebar below 900 px`

- `AppLayout.module.css`: `@media (max-width: 899px)` → collapsed sidebar width, labels visually hidden, API status text visually hidden, content single column.
- Check: `npm run check`; manual M5.

### 5. Empty states

**Commit:** `feat(desktop): add empty states for every page`

- `src/shared/ui/EmptyState.tsx` + module CSS: `icon`, `title` (`<h1>`), `description`, `next`.
- Route table entries get their empty state texts:

  | Page | Description | Next |
  |---|---|---|
  | Ana Sayfa | Bugünün özeti, hatırlatmalar ve son değişiklikler burada görünecek. | Başlamak için soldan bir bölüm seç. |
  | Hedefler | Hedeflerin ve onlara bağlı projeler burada listelenecek. | Hedef ekleme bir sonraki adımda geliyor. |
  | Pomodoro | Bir hedef seçip odak oturumu başlatacağın yer. | Önce bir hedef oluşturman gerekecek. |
  | Takvim | Hangi gün ne yaptığını, pomodorolarını ve notlarını burada göreceksin. | Pomodoro oturumların burada otomatik birikecek. |
  | Notlar | Klasörler, sayfalar ve alt sayfalarla notların burada olacak. | Not düzenleyici yakında geliyor. |
  | İngilizce | Kendi eklediğin kelime ve ifade kartları burada olacak. | İçerik, prompt kopyalayıp yapay zekâdan aldığın JSON'u yapıştırarak eklenecek. |
  | Öğrenme | Konulara ve parçalara bölünmüş derslerin burada olacak. | Dersler JSON içe aktarma ile eklenecek. |
  | Mülakat | Mülakat soruların ve cevapların kart olarak burada olacak. | Sorular JSON içe aktarma ile eklenecek. |

- Tests: `src/shared/ui/EmptyState.test.tsx` (T6) and a loop over the route table in `AppLayout.test.tsx` (T7).
- Check: `npm run check`.

### 6. Write `app-config.json`

**Commit:** `feat(desktop): write app-config.json atomically`

- `electron/appConfig.ts`: `writeAppConfig(file, config)`: reads the existing object (if any), sets `dataDir` and `schemaVersion: 1`, keeps other keys, writes `<file>.tmp` then `renameSync`. `readAppConfig` rejects `schemaVersion` > 1 with a message naming the file.
- Tests in `electron/appConfig.test.ts`: T8–T11.
- Check: `npm run check`.

### 7. Switch the data folder and restart the API

**Commit:** `feat(desktop): switch the data folder and restart the api`

- `electron/dataDirSwitch.ts`: `switchDataDir(next, steps)` with injected `steps` (`current()`, `createFolder`, `readConfigFile`/`restoreConfigFile`, `writeConfig`, `stopApi`, `startApi`), returning the new state or throwing the Turkish errors from requirements.md. Tests: `electron/dataDirSwitch.test.ts` T12–T16.
- `electron/main.ts`: keep `api` and `dataDir` as the current state; `getApiConfig` returns the current API's config; IPC `devpath:get-data-dir` and `devpath:change-data-dir` (folder dialog → `switchDataDir` → reload window); both with the sender check. If even the old API cannot be restarted: error box and quit.
- `electron/preload.ts` and `src/shared/api/types.ts`: `settings.getDataDir()` and `settings.changeDataDir()` on the bridge.
- Check: `npm run check`; manual M7–M9.

### 8. Settings page

**Commit:** `feat(settings): show and change the data folder`

- `src/modules/settings/SettingsPage.tsx` + module CSS, wired into the route table in place of the Ayarlar placeholder. Texts as in requirements.md.
- `src/modules/settings/SettingsPage.test.tsx`: T17–T20 with a stubbed `window.devpath`.
- Check: `npm run check`; manual M7.

### 9. Docs

**Commit:** `docs: document the app shell and data folder setting`

- `README.md`: the data folder can be changed in Ayarlar; `app-config.json` is written by the app.
- `specs/tech-stack.md`: preload bridge gains `settings.getDataDir()` / `settings.changeDataDir()`; hash routing and the route table; tokens file path and naming; system font stack; `app-config.json` has `schemaVersion: 1`.

### 10. Close the phase

**Commit:** `docs(roadmap): mark phase 0.5 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 0.5 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.5-app-shell` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `chore(desktop): add react-router and lucide-react` |
| 2 | `feat(desktop): add design tokens` |
| 3 | `feat(desktop): add sidebar layout and routes` |
| 4 | `feat(desktop): collapse the sidebar below 900 px` |
| 5 | `feat(desktop): add empty states for every page` |
| 6 | `feat(desktop): write app-config.json atomically` |
| 7 | `feat(desktop): switch the data folder and restart the api` |
| 8 | `feat(settings): show and change the data folder` |
| 9 | `docs: document the app shell and data folder setting` |
| 10 | `docs(roadmap): mark phase 0.5 done` |

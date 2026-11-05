# Requirements — Phase 0.5 App shell and design tokens

**Roadmap phase:** 0.5 App shell and design tokens (Milestone 0 — Skeleton)
**Branch:** `feat/0.5-app-shell`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

A navigable, themed, empty app in Turkish. One token file defines colors, fonts and spacing for light and dark. A sidebar leads to every MVP module; each page says what will happen there. The Settings page shows the data folder and changes it, restarting the API with the new path.

## Scope

- `src/shared/ui/tokens.css` with all design tokens; global base styles use them.
- `react-router` (hash routing) and `lucide-react` icons, as named in `tech-stack.md`.
- Sidebar + content layout with routes for Ana Sayfa, Hedefler, Pomodoro, Takvim, Notlar, İngilizce, Öğrenme, Mülakat, Ayarlar.
- Responsive: below 900 px the sidebar shows icons only and content is one column.
- Empty state on every page except Ayarlar.
- Ayarlar: current data folder and a "Klasör seç…" button that switches it (native folder picker), with the API restarted on the new path.
- `app-config.json` gets its first writer (and a `schemaVersion`).
- Keyboard: skip link, sidebar reachable and usable with Tab/Enter, visible focus everywhere.
- The "API: bağlı" status moves to the sidebar footer.
- README and `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Old data when the folder changes | **Just switch.** The old folder stays as it is. The Settings page says data is not moved. |
| Choosing the folder | **Native folder picker only** (`dialog.showOpenDialog`, `openDirectory` + `createDirectory`). No text field, so no invalid paths. |
| Accent color | **Indigo**: `#4f46e5` (light), `#818cf8` (dark). |
| API status | **Sidebar footer**, on every page; icon only when the sidebar is collapsed. |
| Routing | `HashRouter`: the production page is a `file://` URL, and hash changes stay on the same page, so the 0.2 navigation guard keeps working. Paths are English (`/goals`, …); labels are Turkish. Unknown paths go to `/`. |
| Fonts | System font stack (`"Segoe UI Variable", "Segoe UI", system-ui, sans-serif`; monospace `"Cascadia Code", Consolas, monospace`). No bundled web fonts. |
| Placeholder pages | One route table drives the sidebar and the routes. Pages without a module yet render `<EmptyState>` from that table; a module replaces its entry when it is built. No empty per-module files. |
| After a successful switch | Main starts the new API on a new port with a new token, then reloads the window. The hash route keeps the user on Ayarlar, which then shows the new folder. No stale port or token anywhere. |
| Failed switch | Folder cannot be created → inline error, nothing changed. New API does not start → `app-config.json` is restored, the old API is started again, and the page shows an inline error. Only if the old API also fails: the startup error box, then quit. |
| Breakpoint syntax | `@media (width < 900px)` instead of `max-width: 899px` (decided after M5: with 125% display scaling the viewport can be 899.2 px wide, which `max-width: 899px` misses). |
| Folder dialog in tests | The native dialog is driven with Win32 messages in the manual checks; UI Automation does not see its controls. Nothing in the app depends on this. |

## User stories

1. **As the user**, I see a sidebar with every module and can open each one in one click.
2. **As the user**, the app follows my Windows light or dark theme, with readable contrast in both.
3. **As the user**, on a narrow window the sidebar shrinks to icons, so the content keeps its space.
4. **As the user**, every empty page tells me what it will be for and what to do next.
5. **As the user**, I can see where my data is stored and move the app to another folder with two clicks (button, pick folder).
6. **As the user**, I can use the whole shell with the keyboard: a skip link, Tab through the sidebar, Enter to open, and I always see where the focus is.
7. **As the user**, I always see whether the app is connected to its API.

## Business and technical rules

### Tokens and styles

- `tokens.css` is the only place colors, font stacks, font sizes, spacing, radii and the sidebar widths are defined, as CSS variables on `:root`.
- Light values are the default; dark values override them in `@media (prefers-color-scheme: dark)`. `color-scheme: light dark` stays set.
- Colors (both themes): `--color-bg`, `--color-surface`, `--color-surface-hover`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-text` (text on accent), `--color-accent-soft` (active item background), `--color-focus`, `--color-danger`, `--color-success`.
- Text colors have at least 4.5:1 contrast on `--color-bg` and `--color-surface`; the focus ring at least 3:1 (checked manually, M3).
- Components use CSS Modules and only `var(--…)` for colors, spacing and fonts.
- Focus: `:focus-visible` shows a 2 px `--color-focus` outline with offset on every interactive element. No `outline: none` without a replacement.

### Layout and navigation

- Route table (`src/app/navigation.tsx`): `path`, Turkish `label`, `lucide-react` icon, and either an `element` or an empty state.

  | Label | Path | Icon |
  |---|---|---|
  | Ana Sayfa | `/` | `House` |
  | Hedefler | `/goals` | `Target` |
  | Pomodoro | `/pomodoro` | `Timer` |
  | Takvim | `/calendar` | `CalendarDays` |
  | Notlar | `/notes` | `NotebookPen` |
  | İngilizce | `/english` | `Languages` |
  | Öğrenme | `/learning` | `GraduationCap` |
  | Mülakat | `/interview` | `MessagesSquare` |
  | Ayarlar | `/settings` | `Settings` |

- Layout: a skip link "İçeriğe geç" (first focusable element, visible on focus) → `<nav aria-label="Ana menü">` with one `NavLink` per entry → `<main id="content" tabIndex={-1}>` with the page.
- The active link has `aria-current="page"` (NavLink default) and the accent styling.
- Each page has one `<h1>`.
- **900 px:** at `width < 900px` the sidebar uses `--sidebar-width-collapsed`; labels are visually hidden but stay in the accessibility tree; each link has a `title` with its label for a mouse tooltip. The content area is a single column (`grid-template-columns: 1fr`). The window minimum width stays 800 px.

### Empty states

- `src/shared/ui/EmptyState.tsx`: icon, `<h1>` title, one sentence on what the page is for, one sentence on what to do next.
- Texts (Turkish), e.g. Hedefler: "Hedeflerin burada listelenecek." / "Hedef ekleme bir sonraki sürümde geliyor; o zamana kadar Ayarlar'dan veri klasörünü seçebilirsin." Final wording is in plan.md task 5.

### Settings and the data folder

- Preload adds `settings: { getDataDir(): Promise<string>; changeDataDir(): Promise<string | null> }`. Both IPC handlers use the same sender check as `getApiConfig`.
- `changeDataDir()` opens the folder dialog (parent = main window). Cancel → `null`, nothing changes. Same folder as now → returns it, nothing changes.
- Otherwise main: create the folder (failure → reject with "Veri klasörü oluşturulamadı: <path>"), write `app-config.json`, stop the API, start a new one with the new folder, then reload the window. On start failure: restore the previous `app-config.json` (or delete it if there was none), start the old API again and reject with "API yeni klasörle başlatılamadı; eski klasöre dönüldü." If the old API fails too: error box and quit.
- The switch logic is a function with injected steps (`electron/dataDirSwitch.ts`), so it can be unit tested without Electron.
- `app-config.json` writes are atomic (`<file>.tmp` + `renameSync`), keep unknown keys, and set `"schemaVersion": 1`. Reading a file with `schemaVersion` greater than 1 is an error naming the file.
- Settings page: heading "Ayarlar", section "Veri klasörü" showing the path in monospace, the note "Klasörü değiştirmek mevcut verileri taşımaz.", and the button "Klasör seç…" (disabled while a switch runs, label "Değiştiriliyor…"). Errors show in an element with `role="alert"`.

### API status

- `ApiStatus` moves into the sidebar footer: a colored dot (`--color-success` / `--color-danger` / muted while connecting) plus the text. When collapsed only the dot shows; the text stays for screen readers and in `title`.

## Out of scope

| Item | Where it goes |
|---|---|
| Real content on any page | Phases 1.1 onward |
| Moving or copying data between folders | Not planned (decided) |
| Typing a folder path | Not planned (decided) |
| Manual light/dark toggle | Not planned; the OS decides |
| Multi-column dashboard grid | Phase 6.1 |
| Keyboard shortcuts (`Ctrl+K`, …) | Phase 7.1 |
| Other settings (timer, reminders, GitHub, YouTube) | Phases 2.3, 6.2, 6.3, 7.2 |
| Writable-folder check beyond creating it | Not planned; add if a real case appears |
| App icon, installer | Phase 0.6 |

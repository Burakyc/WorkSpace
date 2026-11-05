# Requirements — Phase 0.2 Desktop skeleton

**Roadmap phase:** 0.2 Desktop skeleton (Milestone 0 — Skeleton)
**Branch:** `feat/0.2-desktop-skeleton`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

An Electron + React + TypeScript app in `apps/desktop` that opens a secure window with hot reload. It also adds one `npm run check` command that builds and tests the whole repo (API and desktop). Phase 0.3 connects this window to the API.

## Scope

- Root `package.json` with npm workspaces (`apps/desktop`), Node 24 pinned (`.nvmrc` and `engines`), and the `dev` and `check` scripts.
- `apps/desktop` built with **electron-vite**: Electron main (`electron/main.ts`), preload (`electron/preload.ts`) and React renderer (`src/`). This keeps the folder layout from tech-stack.md.
- TypeScript `strict` and `noUncheckedIndexedAccess` for main, preload and renderer.
- ESLint (flat config, `typescript-eslint`, React Hooks rules, `no-explicit-any` as an error) and Prettier.
- Vitest + React Testing Library (jsdom) with a first test that renders the app.
- Security baseline for the window: context isolation, no Node integration, sandbox, web security, blocked navigation and `window.open`, and a strict CSP.
- Single-instance lock: a second launch focuses the existing window.
- A Turkish placeholder page that follows the OS light/dark theme.
- README "Development" section extended with the desktop commands.
- `tech-stack.md` updated with electron-vite, Node 24 and the single-instance rule.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Build tool | electron-vite (one config and dev command for main, preload and renderer) |
| Node version | Pinned to 24 (`.nvmrc`, `engines: { "node": ">=24" }`) |
| Single instance | In this phase, with `app.requestSingleInstanceLock()` |
| Window content | Turkish placeholder page; light/dark follows the OS |

## User stories

1. **As the developer**, I run `npm install` and then `npm run dev` from the repo root, and a DevPath window opens. Edits to React components show up without restarting.
2. **As the developer**, I run `npm run check` from the repo root. It builds and tests the API and the desktop app, and fails if any step fails.
3. **As the user**, I see a Turkish page titled "DevPath Workspace" that matches my OS light or dark theme.
4. **As the user**, I can't end up with two app windows on my data: starting the app again brings the open window to the front.
5. **As the user**, I'm protected if content shown in the app ever tries to run code. The page has no access to Node, can't navigate away, can't open new windows, and runs under a strict CSP.

## Business and technical rules

- **Window security** (`BrowserWindow.webPreferences`): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, and a preload script. Nothing turns these off in development.
- **Preload** is built as CommonJS (required for sandboxed preloads). In this phase it exposes nothing; phase 0.3 adds `getApiConfig()`.
- **Navigation:** `will-navigate` is cancelled for any URL other than the app's own page, and `setWindowOpenHandler` always returns `{ action: "deny" }`. This applies to every `webContents` (`app.on("web-contents-created")`).
- **CSP** is built in one function, `buildCsp(mode)`, and injected as a `<meta http-equiv="Content-Security-Policy">` tag in `index.html` at build time.
  - Production: the policy from tech-stack.md: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com https://avatars.githubusercontent.com; connect-src http://127.0.0.1:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`.
  - Development: the same, plus what the Vite dev server needs for hot reload: `'unsafe-inline'` for scripts (React Refresh preamble) and `ws://localhost:*` / `http://localhost:*` in `connect-src`.
- **Single instance:** if `requestSingleInstanceLock()` returns `false`, the new process quits at once. The first instance restores (if minimized) and focuses its window on `second-instance`.
- **Quit:** closing the window quits the app on Windows (`window-all-closed` → `app.quit()`).
- **Placeholder page:** `<html lang="tr">`, document title "DevPath Workspace", heading "DevPath Workspace", text "Kurulum devam ediyor." CSS uses `color-scheme: light dark` with system colors only. Design tokens come in phase 0.5.
- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, no `any` (ESLint error). Function components with hooks, named exports.
- **`npm run check`** runs these in order and stops at the first failure: `dotnet build apps/api/DevPath.slnx`, `dotnet test apps/api/DevPath.slnx`, typecheck (`tsc --noEmit` for node and web configs), `eslint`, `vitest run`, `electron-vite build`.
- **Dependencies:** exact versions in `package.json` (no `^`), `package-lock.json` committed. Only the packages listed in plan.md.

## Out of scope

| Item | Where it goes |
|---|---|
| Starting and stopping the API from Electron, port and token | Phase 0.3 |
| `getApiConfig()` and the typed API client | Phase 0.3 |
| Data folder setting, `app-config.json` | Phase 0.4 |
| Design tokens, sidebar layout, routes, React Router | Phase 0.5 |
| Installer, electron-builder, app icon | Phase 0.6 |
| `safeStorage`, notifications, reminders, tray | Later phases (0.3, 2.1, 7.2) |
| End-to-end tests of the Electron app (e.g. Playwright) | Not planned; manual steps cover the window |
| CI pipeline | Not planned |

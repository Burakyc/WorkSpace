# Plan — Phase 0.2 Desktop skeleton

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/0.2-desktop-skeleton
```

Prerequisites: Node 24 (`node --version` prints `v24.x`), npm 11, .NET 10 SDK.

Every task ends with the checks that exist by then: from task 2, `npm run build -w apps/desktop` and `npm run typecheck -w apps/desktop`; from task 3, `npm run lint -w apps/desktop`; from task 4, `npm run test -w apps/desktop`; from task 9, `npm run check`. A task is committed only when its checks pass. All new packages go in with exact versions (`npm install -E`).

## Tasks

### 1. npm workspace root and Node pin

**Commit:** `chore: add npm workspace root and pin node 24`

- `.nvmrc` with `24`.
- Root `package.json`: `"private": true`, `"workspaces": ["apps/desktop"]`, `"engines": { "node": ">=24" }`, script `"dev": "npm run dev -w apps/desktop"`.
- `apps/desktop/package.json`: `"name": "@devpath/desktop"`, `"private": true`, `"version": "0.0.1"`, `"main": "out/main/index.js"`.
- Check: `npm install` exits 0 and creates `package-lock.json`. `git status` shows no `node_modules/`.

### 2. electron-vite with React and TypeScript

**Commit:** `chore(desktop): scaffold electron-vite with react and typescript`

- Dev dependencies: `electron`, `electron-vite`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/node`. Dependencies: `react`, `react-dom`.
- `electron.vite.config.ts`: main entry `electron/main.ts`, preload entry `electron/preload.ts` (CommonJS output), renderer root `src/` with `src/index.html`, React plugin.
- `tsconfig.json` (references), `tsconfig.node.json` (`electron/`, config files) and `tsconfig.web.json` (`src/`). Both have `strict` and `noUncheckedIndexedAccess`.
- `electron/main.ts`: create one `BrowserWindow` (1200×800, min 800×600), load `ELECTRON_RENDERER_URL` in dev or `out/renderer/index.html` in production; `window-all-closed` → `app.quit()`.
- `electron/preload.ts`: empty for now, with one comment pointing to phase 0.3.
- `src/main.tsx` + `src/App.tsx`: renders an `<h1>DevPath Workspace</h1>`.
- Scripts in `apps/desktop/package.json`: `dev` (`electron-vite dev`), `build` (`electron-vite build`), `start` (`electron-vite preview`), `typecheck` (`tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`).
- Check: `npm run dev` opens the window. Editing `App.tsx` updates it without a restart. `build` and `typecheck` pass.

### 3. ESLint and Prettier

**Commit:** `chore(desktop): add eslint and prettier`

- Dev dependencies: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`, `prettier`.
- `eslint.config.js` (flat): JS recommended + `typescript-eslint` recommended, React Hooks rules, `@typescript-eslint/no-explicit-any: "error"`, Prettier last; ignore `out/`.
- `.prettierrc.json` (`singleQuote`, `printWidth: 100`) and `.prettierignore` (`out/`, `package-lock.json`).
- Scripts: `lint` (`eslint .`), `format` (`prettier --write .`).
- Run `format` once; `lint` passes with 0 warnings.

### 4. Vitest and React Testing Library

**Commit:** `test(desktop): add vitest and react testing library`

- Dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
- `vitest.config.ts`: React plugin, `environment: "jsdom"`, setup file `src/test/setup.ts` that imports `@testing-library/jest-dom/vitest`.
- `src/App.test.tsx`: renders `<App />` and finds the heading "DevPath Workspace".
- Script: `test` (`vitest run`).
- Check: `test` passes; `typecheck` and `lint` include the test files and pass.

### 5. Window security and navigation guard

**Commit:** `feat(desktop): harden browser window security`

- `webPreferences`: `preload`, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- `electron/navigation.ts`: `isAllowedNavigation(targetUrl: string, appUrl: string): boolean`. True only when the target is the app's own page (same origin for the dev server; same file path for `file://`). Invalid URLs return false.
- In `main.ts`: `app.on("web-contents-created", ...)` sets `will-navigate` (cancel when `isAllowedNavigation` is false) and `setWindowOpenHandler(() => ({ action: "deny" }))`.
- `electron/navigation.test.ts` (T3–T5 in validation.md). The Vitest config runs `electron/**/*.test.ts` in the `node` environment.
- Check: all checks pass; manual steps M3–M5.

### 6. Content Security Policy

**Commit:** `feat(desktop): add content security policy`

- `electron/csp.ts`: `buildCsp(mode: "development" | "production"): string`, as in requirements.md.
- In `electron.vite.config.ts`, a small renderer plugin uses `transformIndexHtml` to add `<meta http-equiv="Content-Security-Policy" content="...">` with `buildCsp(mode)`.
- `electron/csp.test.ts` (T6–T8).
- Check: all checks pass; hot reload still works in dev (M2); manual steps M6–M7.

### 7. Single app instance

**Commit:** `feat(desktop): allow a single app instance`

- In `main.ts`: if `!app.requestSingleInstanceLock()` → `app.quit()` and stop. On `second-instance`: restore the window if it is minimized, then `focus()`.
- Check: all checks pass; manual step M8.

### 8. Turkish placeholder page

**Commit:** `feat(desktop): add turkish placeholder page`

- `src/index.html`: `<html lang="tr">`, `<title>DevPath Workspace</title>`.
- `App.tsx`: heading "DevPath Workspace" and the text "Kurulum devam ediyor."
- `src/index.css`: `:root { color-scheme: light dark; }`, system font, `Canvas`/`CanvasText` system colors, centered content.
- Update `App.test.tsx` to also check the text "Kurulum devam ediyor." (T2).
- Check: all checks pass; manual steps M9–M10.

### 9. Root `check` script

**Commit:** `chore: add root check script`

- Root `package.json` scripts:
  - `"check": "npm run check:api && npm run check:desktop"`
  - `"check:api": "dotnet build apps/api/DevPath.slnx && dotnet test apps/api/DevPath.slnx"`
  - `"check:desktop": "npm run typecheck -w apps/desktop && npm run lint -w apps/desktop && npm run test -w apps/desktop && npm run build -w apps/desktop"`
- Check: `npm run check` passes. Breaking a test on purpose makes it exit non-zero (M11); revert the break.

### 10. README development section

**Commit:** `docs: add desktop development commands to readme`

- Extend the "Development" section in `README.md`: prerequisites (Node 24, npm 11, .NET 10 SDK), `npm install`, `npm run dev`, `npm run check`.

### 11. Align tech-stack.md

**Commit:** `docs(specs): add electron-vite and node 24 to tech stack`

- `specs/tech-stack.md`: overview table gets "Build: electron-vite" and "Node 24 (pinned in `.nvmrc`)"; Electron rules get "single instance via `requestSingleInstanceLock`" and "CSP injected as a meta tag by `buildCsp(mode)`; development adds what Vite hot reload needs".

### 12. Close the phase

**Commit:** `docs(roadmap): mark phase 0.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 0.2 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Ask before merging `feat/0.2-desktop-skeleton` into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `chore: add npm workspace root and pin node 24` |
| 2 | `chore(desktop): scaffold electron-vite with react and typescript` |
| 3 | `chore(desktop): add eslint and prettier` |
| 4 | `test(desktop): add vitest and react testing library` |
| 5 | `feat(desktop): harden browser window security` |
| 6 | `feat(desktop): add content security policy` |
| 7 | `feat(desktop): allow a single app instance` |
| 8 | `feat(desktop): add turkish placeholder page` |
| 9 | `chore: add root check script` |
| 10 | `docs: add desktop development commands to readme` |
| 11 | `docs(specs): add electron-vite and node 24 to tech stack` |
| 12 | `docs(roadmap): mark phase 0.2 done` |

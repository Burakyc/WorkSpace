# Validation — Phase 0.2 Desktop skeleton

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 0.2, plus the decisions in [requirements.md](requirements.md):

- [ ] `apps/desktop` uses electron-vite with React + TypeScript; `strict` and `noUncheckedIndexedAccess` are on for main, preload and renderer.
- [ ] ESLint (`no-explicit-any` as an error) and Prettier are set up; `npm run lint -w apps/desktop` reports 0 problems.
- [ ] `BrowserWindow` uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- [ ] Navigation away from the app page and `window.open` are blocked.
- [ ] A CSP meta tag is present: strict in production, plus only the hot-reload additions in development.
- [ ] Root `package.json` has npm workspaces and pins Node 24 (`.nvmrc`, `engines`).
- [ ] `npm run dev` from the repo root opens the window, and React edits hot reload.
- [ ] A second launch focuses the existing window and does not open a new one.
- [ ] The window shows the Turkish placeholder page and follows the OS light/dark theme.
- [ ] At least one Vitest + React Testing Library test renders the app.
- [ ] `npm run check` runs `dotnet build`, `dotnet test`, `tsc --noEmit`, `eslint`, `vitest run` and `electron-vite build`, and fails when any of them fails.
- [ ] README and `tech-stack.md` are updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Render `<App />` | `src/App.test.tsx` | Heading "DevPath Workspace" is in the document |
| T2 | Placeholder text | same | "Kurulum devam ediyor." is in the document |
| T3 | Same-page navigation | `electron/navigation.test.ts` | `isAllowedNavigation` is true for the dev server URL with another path or hash, and for the same `file://` page |
| T4 | External navigation | same | False for `https://example.com`, `http://127.0.0.1:5180`, another `file://` path, `javascript:alert(1)` |
| T5 | Invalid URL | same | False for `""` and `not a url` |
| T6 | Production CSP | `electron/csp.test.ts` | Equals the policy in requirements.md; contains no `'unsafe-inline'` in `script-src`, no `ws:` and no `localhost` |
| T7 | Development CSP | same | Production directives plus `'unsafe-inline'` in `script-src` and `ws://localhost:*` / `http://localhost:*` in `connect-src`; nothing else added |
| T8 | Both modes | same | Contain `object-src 'none'` and `base-uri 'none'` (`frame-ancestors` dropped, see requirements.md) |
| — | API tests from phase 0.1 | `apps/api/DevPath.Api.Tests` | Still 18 passing |

Not automated: the Electron window itself (security flags at runtime, single instance, theme). There are no end-to-end tests in this phase; M1–M13 cover it.

## Manual test steps

Run from the repo root. Open DevTools with `Ctrl+Shift+I` and use the Console tab where a step says so.

| ID | Step | Expected |
|---|---|---|
| M1 | `npm install`, then `npm run dev` | A window titled "DevPath Workspace" opens; no errors in the terminal or DevTools console. |
| M2 | With M1 running, change the heading text in `src/App.tsx` and save | The window updates without restarting; no CSP errors in the console. Undo the change. |
| M3 | Console: `typeof require`, `typeof process` | Both `"undefined"`. |
| M4 | Console: `window.open('https://example.com')` | Returns `null`; no new window opens. |
| M5 | Console: `location.href = 'https://example.com'` | The app page stays; no navigation. |
| M6 | `npm run build -w apps/desktop`, then `npm run start -w apps/desktop`; in the console: `document.querySelector('meta[http-equiv="Content-Security-Policy"]').content` | The production policy, with no `localhost` or `'unsafe-inline'` in `script-src`. |
| M7 | With M6 running, console: `const s = document.createElement('script'); s.textContent = 'window.x = 1'; document.body.append(s); window.x` | `undefined`, and a CSP violation is reported in the console. |
| M8 | With M6 running, run `npm run start -w apps/desktop` again in a second terminal; also try it with the first window minimized | No second window. The first window comes to the front (restored if minimized). The second process exits. |
| M9 | Switch Windows to dark mode (Settings → Personalization → Colors), then back to light | The page background and text follow the theme. |
| M10 | Look at the page | Heading "DevPath Workspace" and the text "Kurulum devam ediyor." |
| M11 | Change the expected text in `src/App.test.tsx` so it fails, run `npm run check`, then undo | `check` stops at `vitest run` with a non-zero exit code. |
| M12 | After `npm install` and `npm run build`, run `git status` | No `node_modules/` or `out/` listed; `package-lock.json` is tracked. |
| M13 | Close the window | The app quits; no `electron.exe` left in Task Manager. |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M13 done with the expected results
- [ ] `roadmap.md` phase 0.2 ticked and set to `done`

# Requirements — Phase 7.4 MVP release

**Roadmap phase:** 7.4 MVP release (Milestone 7 — MVP polish and release)
**Branch:** `claude/milestone-7-3aa8fa` (Milestones 0–8.1 merged; `main` fast-forwards to it)
**Estimate:** 1 day

## Goal

Ship DevPath Workspace 0.1.0: the Windows installer built with `npm run package`, checked on a fresh install against the README scenarios and the smoke checklist, and tagged `v0.1.0`.

## Scope

- Version `0.1.0` everywhere it is shown (installer name, `/api/health`, developer panel, HTTP user agents).
- An automated contrast check of the design tokens (light and dark).
- The installer built, installed silently on this machine and checked by hand (driven through Chrome DevTools Protocol).
- Bugs found get their own `fix(...)` commits.
- Roadmap, specs and `Promtps.md` closed; `main` fast-forwarded; the tag only after the user's explicit yes. Nothing is pushed.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Fresh install | **Rename** the leftover `%APPDATA%\DevPath` (from the 0.6 test install, no personal data) to `%APPDATA%\DevPath.before-0.1.0`; nothing is deleted. The installed app then starts from nothing. |
| Version | **Bump to 0.1.0**: `apps/desktop/package.json`, `apps/api/Directory.Build.props`, the health test, and user agents read the version instead of a literal. |
| Offline start | **Simulated** by starting the installed app with `HTTPS_PROXY=http://127.0.0.1:9` (and `HTTP_PROXY`), so the API's GitHub / YouTube requests cannot leave the machine. |
| Timer accuracy | **A real 25-minute focus session** with the window minimized; the other checks run meanwhile. |

## Rules

- The scenario checks create test data in the installed app's data folder (`%APPDATA%\DevPath\data`): goals, a project, sessions (one backdated to last Tuesday through `POST /api/sessions`), notes and an interview import. When every check is done, the app is closed and only that test data is removed (the folder itself stays, empty, as after a first start), so the user starts with a clean app. Settings that were changed for a check are put back.
- "Preparing a post" is post-MVP and not checked.
- Startup time: from starting `DevPath.exe` to the window showing "API: bağlı", three starts, each under 3 seconds.
- Contrast: WCAG 2.1 AA — normal text ≥ 4.5:1 (text and muted text on background, surface and hover; accent text on accent; soft-accent text on soft accent; danger and success on surface), focus ring and borders of inputs ≥ 3:1 against the surface. Checked by a Vitest test that reads `tokens.css`.
- Keyboard: every sidebar item, the skip link and each page's main controls are reachable with Tab and show the focus ring; dialogs close with Escape.

## Out of scope

| Item | Where it goes |
|---|---|
| Code signing, auto-update, publishing a GitHub release | Not planned for the MVP |
| Pushing the branch or the tag | Only when the user asks |
| "Preparing a post" scenario | Post-MVP (11.x) |

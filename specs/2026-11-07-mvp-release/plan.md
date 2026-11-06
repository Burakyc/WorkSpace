# Plan — Phase 7.4 MVP release

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for the checklist.

## Before task 1

Work on `claude/milestone-7-3aa8fa`. Every code task ends with `npm run check` and is committed only when it passes.

## Tasks

### 1. Version 0.1.0

**Commit:** `chore: bump the version to 0.1.0`

- `apps/desktop/package.json`, `apps/api/Directory.Build.props`, `HealthEndpointTests` (T1); YouTube and GitHub user agents use `AppInfo.Version`.
- Check: `npm run check`.

### 2. Contrast check

**Commit:** `test(ui): check the contrast of the design tokens`

- `src/shared/ui/tokens.test.ts` (T2) reads `tokens.css` and checks the pairs in requirements.md for light and dark. A failing pair is fixed in `tokens.css` in a separate `fix(ui)` commit.
- Check: `npm run check`.

### 3. Build and install

No commit.

- `npm run package`; rename `%APPDATA%\DevPath`; install silently (`"DevPath Setup 0.1.0.exe" /S`).
- Run S1–S12 of validation.md on the installed app. Every bug found: a `fix(...)` commit with a test, `npm run check`, a new package and the failed steps again.
- Remove the test data afterwards (requirements.md).

### 4. Close the phase

**Commit:** `docs(roadmap): mark phase 7.4 done`

- Tick validation.md and the 7.4 boxes in `specs/roadmap.md` except "Tag `v0.1.0`" (ticked when the tag is made); set the MVP status; fill the **Result** line in `Promtps.md`.
- Fast-forward `main`. Ask the user before `git tag -a v0.1.0`. Never push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `chore: bump the version to 0.1.0` |
| 2 | `test(ui): check the contrast of the design tokens` |
| 4 | `docs(roadmap): mark phase 7.4 done` |

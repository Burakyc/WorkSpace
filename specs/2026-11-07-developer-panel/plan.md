# Plan — Phase 7.3 Developer panel

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Work on the Milestone 7 branch `claude/milestone-7-3aa8fa`.

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. API error buffer

**Commit:** `feat(devpanel): keep the last API errors in memory`

- `Infrastructure/Diagnostics/ErrorBuffer.cs`, `ErrorBufferLoggerProvider.cs`; registered in `Program.cs` (with `AddHttpContextAccessor`).
- `ErrorBufferTests.cs` (T1–T3).
- Check: `npm run check`.

### 2. Dev endpoint

**Commit:** `feat(devpanel): report errors and data file sizes`

- `Modules/System/DataFileSizes.cs`, `DevController.cs` (`GET /api/dev`).
- `DataFileSizesTests.cs` (T4), `DevEndpointTests.cs` (T5).
- Check: `npm run check`.

### 3. Renderer error log

**Commit:** `feat(devpanel): keep the last renderer errors in memory`

- `src/shared/errors/errorLog.ts` (`recordError`, `recentErrors`, `maskPath`, `installErrorListeners`); used in `main.tsx` and `client.ts`.
- `errorLog.test.ts` (T6–T7), `client.test.ts` (T8).
- Check: `npm run check`.

### 4. Panel and shortcut

**Commit:** `feat(devpanel): show the developer panel`

- Types and `getDevStatus()`; fake API route; `modules/devpanel/DevPanelPage.tsx` (+ CSS); `/dev` in `AppRoutes`; `devPanel` in `matchShortcut` (left out of the help) and the layout.
- `shortcuts.test.ts` (T9), `DevPanelPage.test.tsx` (T10–T12).
- Check: `npm run check`; manual M1–M4.

### 5. Docs

**Commit:** `docs: document the developer panel`

- `specs/tech-stack.md`: the buffers, the privacy rule, `GET /api/dev` and the panel.

### 6. Close the phase

**Commit:** `docs(roadmap): mark phase 7.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 7.3 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Do not merge into `main` and do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(devpanel): keep the last API errors in memory` |
| 2 | `feat(devpanel): report errors and data file sizes` |
| 3 | `feat(devpanel): keep the last renderer errors in memory` |
| 4 | `feat(devpanel): show the developer panel` |
| 5 | `docs: document the developer panel` |
| 6 | `docs(roadmap): mark phase 7.3 done` |

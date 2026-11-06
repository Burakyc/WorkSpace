# Plan — Phase 7.1 Keyboard shortcuts

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Work on the Milestone 7 branch `claude/milestone-7-3aa8fa` (its own worktree). No new branch per phase.

Every task ends with `npm run check`. A task is committed only when it passes. No new packages.

## Tasks

### 1. Shortcut matching

**Commit:** `feat(shortcuts): match keyboard shortcuts`

- `src/app/shortcuts.ts`: `ShortcutId`, `matchShortcut(event)`, `isTextField(target)`, the shortcut list for the help window.
- `src/app/shortcuts.test.ts` (T1–T4).
- Check: `npm run check`.

### 2. Help window

**Commit:** `feat(shortcuts): show the shortcuts help`

- `src/app/ShortcutsHelp.tsx` (+ CSS); the window key handler in `AppLayout` (capture phase) with `help`; the "Kısayollar" sidebar button.
- `src/app/AppLayout.test.tsx` (T5).
- Check: `npm run check`.

### 3. New note

**Commit:** `feat(notes): create a page with Ctrl+N`

- `AppLayout` navigates with the `newNote` request; `NotesPage` handles it (create in the open item, open it, rename mode).
- `NotesPage.test.tsx` (T6–T7).
- Check: `npm run check`.

### 4. Search

**Commit:** `feat(notes): focus the search with Ctrl+K`

- `search` request; `NoteSearch` focuses its input.
- `NotesPage.test.tsx` (T8).
- Check: `npm run check`.

### 5. Pomodoro

**Commit:** `feat(pomodoro): start and stop with Ctrl+Shift+P`

- Last selection in `localStorage` `devpath.pomodoro.last` (saved on start); `pomodoro` request handled in `PomodoroPage`.
- `PomodoroPage.test.tsx` (T9–T11).
- Check: `npm run check`; manual M1–M5.

### 6. Docs

**Commit:** `docs: document keyboard shortcuts`

- `specs/tech-stack.md`: the shortcuts, the text-field rule and the location-state requests.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 7.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 7.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Do not merge into `main` and do not push (Milestone 7 is merged with the other milestones before 7.4).

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(shortcuts): match keyboard shortcuts` |
| 2 | `feat(shortcuts): show the shortcuts help` |
| 3 | `feat(notes): create a page with Ctrl+N` |
| 4 | `feat(notes): focus the search with Ctrl+K` |
| 5 | `feat(pomodoro): start and stop with Ctrl+Shift+P` |
| 6 | `docs: document keyboard shortcuts` |
| 7 | `docs(roadmap): mark phase 7.1 done` |

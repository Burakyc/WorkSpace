# Requirements — Phase 7.1 Keyboard shortcuts

**Roadmap phase:** 7.1 Keyboard shortcuts (Milestone 7 — MVP polish and release)
**Branch:** `claude/milestone-7-3aa8fa` (Milestone 7 worktree; merged into `main` with the other milestones before 7.4)
**Estimate:** 1 day at 1–2 hours/day

## Goal

The most common actions work from the keyboard anywhere in the app: `Ctrl+N` creates a note, `Ctrl+Shift+P` starts or stops the pomodoro, `Ctrl+K` jumps to the notes search, and `?` shows a help window that lists them.

## Scope

- **Renderer only.** One key handler in the app layout (`src/app/shortcuts.ts`, used by `AppLayout`), a help window (`ShortcutsHelp.tsx`) and a "Kısayollar" button in the sidebar footer.
- Each shortcut opens its page with a one-time request in the router's location state; the page carries it out (Notlar creates the page, the search box takes focus, Pomodoro starts or stops).
- No API, preload or main process changes.
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| `Ctrl+Shift+P` while idle | **Start with the last used goal**, project and tags (saved in `localStorage` `devpath.pomodoro.last` on every start). With no last selection, or when its goal is no longer active, the Pomodoro page opens with focus on the goal picker. While a focus session or break runs or is paused it does exactly what "Durdur" / "Molayı bitir" does. |
| `Ctrl+N` | **Inside the open item.** On `/notes/:id` the new page becomes the last child of the open folder or page; anywhere else it is a top-level page. The new page opens (`/notes/<new id>`) with its title in rename mode. |
| `Ctrl+K` | **Focus the notes search.** Opens Notlar (keeps the open item when already there) and focuses "Notlarda ara". No command palette. |
| Help | **Window + sidebar button.** `?` (outside text fields) and a "Kısayollar" button in the sidebar footer open the same modal window. |
| Deviation: dialog in tests | jsdom has no `showModal()` / `close()`; `src/test/setup.ts` adds a small stand-in (sets `open`, `close` fires the `close` event). Committed with task 2. |
| Deviation: test wait | The `Ctrl+N` subpage test (task 3) ended before the new page opened and failed in the full run; it now waits for the new address. The fix went into the task 4 commit. |

## User stories

1. **As the user**, I press `Ctrl+N` while reading a note and get a new subpage with its title ready to type.
2. **As the user**, I press `Ctrl+Shift+P` on any page to start a pomodoro with my last goal, and again to stop it.
3. **As the user**, I press `Ctrl+K` and type my search right away.
4. **As the user**, I press `?` to see every shortcut.

## Business and technical rules

### Matching (`matchShortcut(event)` in `src/app/shortcuts.ts`)

| Keys | Id | Fires in text fields |
|---|---|---|
| `Ctrl+N` | `newNote` | yes |
| `Ctrl+Shift+P` | `pomodoro` | yes |
| `Ctrl+K` | `search` | yes |
| `?` | `help` | **no** |

- Letters are compared case-insensitively on `event.key` (`n`, `p`, `k`), so Caps Lock and layouts that keep Latin letters work. `Ctrl+N` and `Ctrl+K` need Shift and Alt up; `Ctrl+Shift+P` needs Alt up. `AltGr` (reported as `Ctrl+Alt`) never matches.
- `?` matches on `event.key === '?'` with Ctrl and Alt up (Shift is how `?` is typed).
- A "text field" is an `input`, `textarea`, `select` or any element inside `[contenteditable]` that is not `contenteditable="false"` (the BlockNote editor). Shortcuts without a modifier never fire there, so typing `?` in a note writes a `?`.
- Auto-repeat (`event.repeat`) never fires, so holding `Ctrl+N` creates one page.
- A matched key is `preventDefault`ed. The handler listens on `window` in the capture phase, so the editor never sees a matched shortcut.

### Requests to pages

- The layout navigates with `state: { shortcut: '<id>' }`. A page handles a request once per location key (a ref guards against React's double effects in development), then replaces the location without the state, so a reload or a later remount never repeats it.
- `newNote`: navigates to the current `/notes/...` path (or `/notes`). Notlar creates the page through the same action as "Yeni sayfa" (default title "Adsız sayfa"), navigates to it and puts its title in rename mode. A failed create shows the existing "İşlem yapılamadı" message.
- `search`: navigates to the current `/notes/...` path (or `/notes`); the search box focuses when it is shown (after the tree loads).
- `pomodoro`: navigates to `/pomodoro`; the page waits until goals and settings are loaded, then:
  - running or paused → the same as the stop button (a focus session saves its focused minutes, a break just ends);
  - idle → starts with the last selection when its goal is in the active list (the project only if it is still active and belongs to the goal; tags as they were), otherwise focuses the goal picker;
  - finished → nothing more (the save form is already shown).

### Help window

- `ShortcutsHelp`: a native `<dialog>` opened with `showModal()`, title "Klavye kısayolları", a list of the four shortcuts with `<kbd>` keys and Turkish descriptions, and a "Kapat" button. Escape closes it (native). Focus returns to where it was.
- Sidebar footer: a "Kısayollar" button (keyboard icon; icon only below 900 px with the label as `title` / `aria-label`).

## Out of scope

| Item | Where it goes |
|---|---|
| `Ctrl+Shift+D` developer panel | Phase 7.3 (added to the same table) |
| Command palette, custom key bindings | Not planned |
| Global (OS-wide) shortcuts while the app is in the background | Not planned |
| Shortcuts for other modules (goals, calendar) | Not planned for the MVP |

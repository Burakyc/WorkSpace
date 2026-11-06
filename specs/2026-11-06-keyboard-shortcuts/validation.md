# Validation — Phase 7.1 Keyboard shortcuts

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 7.1, plus the decisions in [requirements.md](requirements.md):

- [ ] `Ctrl+N` new note, `Ctrl+Shift+P` start/stop pomodoro, `Ctrl+K` search; shown in a shortcuts help (`?`).
- [ ] Shortcuts do not fire while typing in the editor unless they use a modifier.
- [ ] `Ctrl+N` creates the page inside the open item; `Ctrl+Shift+P` starts with the last used goal.
- [ ] Tests: shortcut handler (Vitest).
- [ ] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Modifier shortcuts | `src/app/shortcuts.test.ts` | `Ctrl+N`, `Ctrl+n`, `Ctrl+Shift+P`, `Ctrl+K` → their ids; `Ctrl+Shift+N`, `Ctrl+Alt+K`, `N` alone, `Ctrl+P` → `null` |
| T2 | Help key | same | `?` (with or without Shift) → `help`; `Ctrl+?` → `null` |
| T3 | Text fields | same | In `input`, `textarea`, `select` and inside a `contenteditable` div: `?` → `null`, `Ctrl+K` → `search`; `contenteditable="false"` is not a text field |
| T4 | Repeat | same | `event.repeat` → `null` |
| T5 | Help window | `src/app/AppLayout.test.tsx` | `?` on the page opens "Klavye kısayolları" with the four shortcuts; "Kapat" closes it; the "Kısayollar" button opens it; `?` typed in an input does not |
| T6 | New page at top | `src/modules/notes/NotesPage.test.tsx` | `Ctrl+N` on `/goals` → Notlar opens, a top-level "Adsız sayfa" is created and opened with its title input focused |
| T7 | New subpage | same | `Ctrl+N` on `/notes/<folder>` → the page is created inside the folder |
| T8 | Search focus | same | `Ctrl+K` on another page → Notlar opens and "Notlarda ara" has focus |
| T9 | Start with last goal | `src/modules/pomodoro/PomodoroPage.test.tsx` | After a start with goal + tags, stop, go elsewhere, `Ctrl+Shift+P` → a running focus timer with the same goal and tags |
| T10 | Stop | same | `Ctrl+Shift+P` while running → a stopped session is saved (as with "Durdur") and the timer is idle |
| T11 | No last goal | same | No stored selection (or its goal archived) → nothing starts and the goal picker has focus |

## Manual test steps

Run the app (`npm run dev`) with at least one goal and one note folder.

| ID | Step | Expected |
|---|---|---|
| M1 | Press `?` on Ana Sayfa; press Escape; click "Kısayollar" | The help window opens with four shortcuts and closes with Escape; the button opens it again |
| M2 | Open a folder in Notlar, press `Ctrl+N`, type a title, Enter | A new subpage inside the folder opens with its title in rename mode; the title is saved |
| M3 | Type `?` and `Ctrl+K` inside the note editor | `?` is written into the note; `Ctrl+K` focuses "Notlarda ara" instead of the editor |
| M4 | Start a pomodoro with a goal, stop it after 1+ minute, open Takvim, press `Ctrl+Shift+P`; press it again after a minute | Pomodoro opens and runs with the same goal; the second press saves the stopped session |
| M5 | From Ana Sayfa press `Ctrl+K` | Notlar opens with the cursor in the search box |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M5 done with the expected results
- [ ] `roadmap.md` phase 7.1 ticked and set to `done`

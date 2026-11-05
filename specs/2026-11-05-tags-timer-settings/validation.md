# Validation — Phase 2.3 Tags and timer settings

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 2.3, plus the decisions in [requirements.md](requirements.md):

- [x] Optional tags on a session, chosen at start and editable at save, with suggestions from previously used tags.
- [x] Tags are normalized (trim, lower case, leading `#` removed) and validated in the API.
- [x] Settings: focus, short-break and long-break durations (25 / 5 / 15) and long-break interval (4), saved in `settings.json`, edited on the Ayarlar page.
- [x] After a focus session, a short or long break can be started (or skipped); breaks count down, notify at the end and are not logged as sessions.
- [x] Tests: tag normalization and settings validation, plus the tests below.
- [x] `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Normalize | `Modules/Pomodoro/TagsTests.cs` | `" #DI "` → `di`; `##API` → `api`; `#İngilizce` → `ingilizce`; `"clean code"` → `clean-code` |
| T2 | Invalid | same | `""`, `"#"`, `"a/b"`, 31 characters → invalid |
| T3 | Lists | same | Duplicates after normalization dropped, order kept; 11 tags → error; invalid → error |
| T4 | Null | same | `null` → empty list |
| T5 | Saved tags | `Modules/Pomodoro/SessionServiceTests.cs` | `["#DI", "di", "EF Core"]` → stored `["di", "ef-core"]`; invalid → `ValidationException` with `tags` |
| T6 | Tag list | same | Most used first, ties alphabetically; no sessions → empty |
| T7 | `GET /api/sessions/tags` | `Modules/Pomodoro/SessionsEndpointTests.cs` | Returns the list |
| T8 | Defaults | `Modules/Settings/SettingsServiceTests.cs` | No file → 25 / 5 / 15 / 4 |
| T9 | Save | same | Valid values saved under `pomodoro` with `schemaVersion: 1`; read back equal; other sections kept |
| T10 | Validation | same | 0 and 121 focus, 0 and 61 breaks, 1 and 11 interval → errors per field; file unchanged |
| T11 | Endpoints | `Modules/Settings/SettingsEndpointTests.cs` | `GET` defaults; `PUT` `200`; invalid `400` with field errors |
| T12 | Client | `src/shared/api/client.test.ts` | `listTags`, `getSettings`, `savePomodoroSettings` paths and bodies |
| T13 | Title | `electron/sessionNotifier.test.ts` | `notify(title, body)` gets both; `isValidSchedule` refuses a long or missing title |
| T14 | Settings form | `src/modules/settings/PomodoroSettingsForm.test.tsx` | Loads values; change and "Kaydet" → PUT body; "Kaydedildi." |
| T15 | Settings errors | same | `400` → message under the field |
| T16 | Client tag rules | `src/modules/pomodoro/tags.test.ts` | Same cases as T1–T2 |
| T17 | Tag input | `src/modules/pomodoro/TagInput.test.tsx` | Enter/comma/space add; duplicates ignored; remove button; Backspace removes last; invalid message; suggestions exclude chosen tags |
| T18 | Tags at start | `src/modules/pomodoro/PomodoroPage.test.tsx` | Chosen tags are in the timer and locked while it runs; saved with the session |
| T19 | Tags at save | same | Removing a tag in the save form → saved without it |
| T20 | Focus length | same | Settings focus 50 → idle clock "50:00"; session lasts 50 min |
| T21 | Break offer | same | After saving: "Molaya başla (5 dk)" and "Molayı atla" |
| T22 | Short break | same | Break counts down from 05:00; "Mola" shown; after 5 min "Mola bitti." and "Tamam" → idle; nothing saved |
| T23 | Long break | same | After the 4th completed focus session: "Uzun molaya başla (15 dk)"; taking it resets the cycle |
| T24 | Stopped early | same | A stopped session does not count toward the long break |
| T25 | Break notification | `src/modules/pomodoro/PomodoroContext.test.tsx` | `scheduleEnd(endsAt, 'Mola bitti', 'Yeni odak oturumuna hazırsın.')` |
| T26 | Old stored timer | `src/modules/pomodoro/timer.test.ts` | A stored timer without `kind`/`tags` loads as focus with `[]` |

## Manual test steps

Run `npm run dev` with a goal. Where a step needs a timer to end, use the DevTools shortcut from phase 2.2: `const t = JSON.parse(localStorage.getItem('devpath.pomodoro')); t.startedAt = Date.now() + 3000 - t.durationMs; t.endsAt = Date.now() + 3000; localStorage.setItem('devpath.pomodoro', JSON.stringify(t)); location.reload()`.

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar → Pomodoro süreleri: odak 30, kısa mola 3, uzun mola 10, aralık 2 → Kaydet | "Kaydedildi."; `settings.json` has the values under `pomodoro` |
| M2 | Ayarlar: odak 0 → Kaydet | Message under "Odak (dk)"; nothing saved |
| M3 | Pomodoro: idle clock | "30:00" |
| M4 | Tags: type `#DI` Enter, `EF Core` Enter → Başlat; end it with the shortcut; in the save form remove `#ef-core` → Kaydet | `sessions.json` has `tags: ["di"]` |
| M5 | Start another session and type `d` in the tag field | `#di` is suggested |
| M6 | After saving: "Molaya başla (3 dk)" → end it with the shortcut | "Mola bitti." and a silent "Mola bitti" notification; `sessions.json` unchanged |
| M7 | Complete a second focus session (interval 2) | "Uzun molaya başla (10 dk)" is offered |
| M8 | Set the settings back to 25 / 5 / 15 / 4 | Saved |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M8 done with the expected results
- [x] `roadmap.md` phase 2.3 ticked and set to `done`

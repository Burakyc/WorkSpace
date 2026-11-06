# Validation — Phase 7.2 Daily reminders

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 7.2, plus the decisions in [requirements.md](requirements.md):

- [x] Settings: English reminder time and tech reminder time, each can be turned off.
- [x] Main process shows one calm OS notification at each time while the app runs, including when minimized.
- [x] Clicking the notification opens the related module (İngilizce / Öğrenme).
- [x] Tests: next-trigger calculation, including after the time has passed today.
- [x] Ana Sayfa shows the saved times; `tech-stack.md` is updated.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Defaults | `Modules/Settings/SettingsServiceTests.cs` | No file, or a `reminders` section of the wrong shape → 09:00 / 20:00, both on |
| T2 | Save | same | Saving keeps the pomodoro section; read back gives the saved values |
| T3 | Invalid | same | `24:00`, `9:00`, `ab:cd`, missing reminder or field → errors on `english` / `tech`; nothing saved |
| T4 | Endpoint | `Modules/Settings/SettingsEndpointTests.cs` | `PUT /api/settings/reminders` then `GET /api/settings` returns them; bad time → `400` |
| T5 | Next trigger | `electron/reminders.test.ts` | 08:00 with "09:00" → today 09:00; 10:00 → tomorrow 09:00; exactly 09:00 → tomorrow; 31 Dec 23:30 with "00:15" → 1 Jan |
| T6 | Parse | same | A valid API answer gives two reminders; wrong time, missing reminder or non-boolean → `null` |
| T7 | Scheduler | same | Only enabled reminders get a timer; firing notifies and schedules the next day; `update` clears old timers |
| T8 | Late fire | same | A timer that fires 10 minutes late does not notify but schedules the next day |
| T9 | Client | `src/shared/api/client.test.ts` | `saveReminderSettings` → `PUT /api/settings/reminders` with the body |
| T10 | Form | `src/modules/settings/ReminderSettingsForm.test.tsx` | Shows the saved values; turning one off and changing a time saves both and calls `reminders.refresh()`; "Kaydedildi." |
| T11 | Form errors | same | A `400` shows the message under the field |
| T12 | Home card | `src/modules/home/HomePage.test.tsx` | Saved 08:30 / 21:00 are listed with their status; a disabled reminder is not listed |
| T13 | Home card off | same | Both off → "Hatırlatmalar kapalı."; failed load → defaults |

## Manual test steps

Run the app (`npm run dev`).

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar → Hatırlatmalar: set İngilizce to 2 minutes from now, Kaydet | "Kaydedildi."; Ana Sayfa shows the new time |
| M2 | Minimize the window and wait for the time | One silent notification "İngilizce zamanı" |
| M3 | Click the notification | The window comes back on İngilizce |
| M4 | Turn İngilizce off, set Teknik to 2 minutes from now, Kaydet, wait | Only "Teknik çalışma zamanı"; clicking opens Öğrenme; Ana Sayfa lists only Teknik |
| M5 | Restart the app after a reminder time has passed today | No notification for it |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M5 done with the expected results
- [x] `roadmap.md` phase 7.2 ticked and set to `done`

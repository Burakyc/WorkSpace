# Validation — Phase 11.1 Style prompt

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 11.1, plus the decisions in [requirements.md](requirements.md):

- [x] The style prompt is edited on Gönderiler and saved in `style.json`.
- [x] An English and a Turkish example are shown and can be taken into the box.
- [x] Each changed save keeps the old text; the last 10 versions are listed and can be taken into the box.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Empty | `StyleServiceTests` | No file → empty text, null date, empty history |
| T2 | Versions | same | A changed save moves the old text to the front of the history with its date; trailing whitespace trimmed |
| T3 | Same text, empty text | same | The same text writes nothing and keeps the date; empty is allowed and adds no history entry when the old text was empty |
| T4 | Cap | same | After 12 changes the history has the 10 newest, newest first |
| T5 | Endpoint | `StyleEndpointTests` | GET and PUT round trip; over 5,000 characters → 400 on `text` |
| T6 | Examples | same | Both example files exist, are not empty and fit the limit |
| T7 | Load | `StylePromptSection.test.tsx` | Saved text and history are shown; an empty text shows the hint; a failed load shows the alert |
| T8 | Examples | same | Each button fills the box, moves focus and sends no request; "Kaydet" then saves |
| T9 | Save | same | Save sends the text, shows "Kaydedildi." and the new history; "Kaydet" is disabled without a change; a 400 shows the field error; a failed save keeps the text |
| T10 | History | same | "Kutuya al" fills the box and saves nothing |

## Manual test steps

In the dev app (`%APPDATA%\DevPath\dev-data`). Delete `style.json` at the end if it was created by the test.

| ID | Step | Expected |
|---|---|---|
| M1 | Open Gönderiler from the sidebar | Empty box, the hint, both examples, "Henüz eski sürüm yok." |
| M2 | "Türkçe örneği kutuya al", then "Kaydet" | The box holds the example; "Kaydedildi."; `style.json` has `schemaVersion: 1` and the text |
| M3 | Change the text, save | The old text is in "Geçmiş sürümler" with today's date |
| M4 | Old version's "Kutuya al" | The box holds it, "Kaydedilmemiş değişiklik var.", the file is unchanged |
| M5 | Reload the page | The saved text and history are there |
| M6 | Tab through the page | Every control reachable with a visible focus ring |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M6 done with the expected results
- [x] `roadmap.md` phase 11.1 ticked and set to `done`

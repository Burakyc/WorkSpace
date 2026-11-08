# Validation — Phase 9.1 Mode setting and copy-paste mode

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 9.1, plus the decisions in [requirements.md](requirements.md):

- [ ] Each of İngilizce, Öğrenme and Mülakat has an AI mode setting: copy-paste (default), file import, API.
- [ ] The mode is shown and can be changed in Ayarlar and in the module's panel; not-yet-built modes are disabled.
- [ ] Copy-paste mode is the 5.1 flow, in every place AI content is used.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Defaults | `SettingsServiceTests` | No file, no section, a missing key or an unknown value → `copyPaste` for all three |
| T2 | Save | same | Saving one module keeps the other sections and modules; writes `aiModes` |
| T3 | Endpoint | `SettingsEndpointTests` | `PUT …/ai-modes/english` with `copyPaste` → 200 with all modes; unknown module → 400 on `module`; `file`, `api` and `x` → 400 on `mode` |
| T4 | Copy-paste body | `AiContentPanel.test.tsx` | After the mode loads: the select with the current mode, "Promptu kopyala", the import box; a successful import calls `onImported` |
| T5 | Options | same | File and API options are disabled; failed settings load still shows the copy-paste body |
| T6 | Custom prompt | same | With `prompt`, "Promptu kopyala" copies that text, not the template |
| T7 | Module flow | `EnglishPage.test.tsx`, `InterviewPage.test.tsx`, `LearningPage.test.tsx` | The existing import-then-show flows pass through the panel |
| T8 | Ayarlar | `AiModesSection.test.tsx` | One select per module with its mode; a failed save goes back and shows "Kaydedilemedi." |

## Manual test steps

Never on the real `%APPDATA%\DevPath\data`. Use a temporary user-data folder with a temporary data folder and delete both at the end.

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar | "Yapay zekâ modları" shows İngilizce, Öğrenme and Mülakat, each "Kopyala-yapıştır"; "Dosyadan içe aktar (yakında)" and "API (yakında)" cannot be selected |
| M2 | Empty İngilizce page | The empty state, the mode select, the hint, "Promptu kopyala" and the import box |
| M3 | Paste valid vocab JSON → "İçe aktar" | Summary shown, the topic appears in the list; "İçerik ekle" toggles the panel with the select |
| M4 | Paste invalid JSON → "Kontrol et" | Line-by-line errors, nothing saved |
| M5 | Tab through the panel and the Ayarlar section | Every control reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M5 done with the expected results
- [ ] `roadmap.md` phase 9.1 ticked and set to `done`

# Validation — Phase 9.3 API mode

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 9.3, plus the decisions in [requirements.md](requirements.md):

- [ ] AI API keys (Claude, Gemini) are stored with `safeStorage`; the API process calls the provider and feeds the output through the same validator and merge.
- [ ] A clear cost/usage note and a confirmation come before each call; nothing is called automatically, and nothing is retried.
- [ ] Tests: provider clients with stub HTTP; invalid AI output is not saved.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Secrets | `secrets.test.ts`, `apiProcess.test.ts` | Both names allowed; both variables passed, empty when none, so an inherited value never reaches the API |
| T2 | Providers | `AiEndpointTests` | Both listed with prices; `hasKey` follows the variable; the key's value appears nowhere in the answer |
| T3 | Setting | `SettingsServiceTests`, `SettingsEndpointTests` | Default and unknown → `claude`; saving keeps other sections; unknown → 400 on `provider` |
| T4 | Claude request and answer | `ClaudeClientTests` | One POST to `/v1/messages` with the model, `max_tokens`, prompt and key header; text and usage read |
| T5 | Claude failures | same | 401, 429, 500, unreachable, unreadable, `max_tokens`, `refusal` → the Turkish errors; **exactly one request** even on 429 and 500; the key is in no log line and no error |
| T6 | Gemini request and answer | `GeminiClientTests` | One POST to `models/gemini-3.1-pro-preview:generateContent`, key in the header and not the URL; text read; thinking tokens count as output |
| T7 | Gemini failures | same | 401/403, 429, 500, unreachable, unreadable, `MAX_TOKENS`, `SAFETY`, a blocked prompt → the Turkish errors; exactly one request; the key is in no log line and no error |
| T8 | Valid answer saved | `AiServiceTests` | Answer goes through the merge: topic created, `report`, `usage` with the cost, `output` |
| T9 | Invalid not saved | same | Broken JSON and schema errors → `errors` with lines, `output` kept, **no topic file** |
| T10 | Existing topic | same | Merges: old items untouched, duplicates skipped |
| T11 | Endpoint | `AiEndpointTests` | Unknown provider, type, empty and oversized prompt → 400 on that field; no key → `error` and no request; the stub variable is ignored outside Development |
| T12 | Estimate | `aiCost.test.ts` | Upper bound from characters and prices; `tr-TR` dollar format |
| T13 | Note | `AiContentPanel.test.tsx` | API mode shows the template in the box, the model, prices and estimate; the estimate follows the prompt; **no run request on open** |
| T14 | Confirm | same | "Yapay zekâya gönder" sends nothing; "Vazgeç" closes; "Ücretli çağrıyı onayla" sends once with the edited prompt; buttons disabled while running |
| T15 | Results | same | Saved → report, usage, `onImported`; `errors` → line list and the raw answer; `error` shown; no key → notice, link and disabled send |
| T16 | Ayarlar | `AiApiSection.test.tsx` | Key is saved through `secrets.set`, then only "Anahtar kayıtlı." and "Anahtarı sil"; the provider select saves |

## Manual test steps

Never on the real `%APPDATA%\DevPath\data`, never a real key and never a paid call. Use a temporary user-data folder and data folder, a made-up key and a local stub server (`DEVPATH_AI_STUB_URL`) answering with hand-written sample content. The stub records every request.

| ID | Step | Expected |
|---|---|---|
| M1 | Ayarlar → "Yapay zekâ API'leri" | Both providers, no keys; "API" can be selected in the modes |
| M2 | Save a made-up Claude key | Window reloads; "Anahtar kayıtlı."; the value is not in `secrets.bin` as plain text, not in the data folder, not in the renderer |
| M3 | Set Öğrenme to API, open it, edit the prompt | Prompt box, note and estimate follow the edit; the stub has **no** requests |
| M4 | "Yapay zekâya gönder" → "Vazgeç" | Still no requests |
| M5 | Send → confirm (stub: valid lesson) | One request; the topic appears; the report and usage lines show |
| M6 | Same with the stub answering invalid JSON | One more request; errors and the raw answer show; no new topic |
| M7 | Stub answers 429 | "İstek sınırına ulaşıldı…"; exactly one request |
| M8 | Provider Gemini without a key | "API anahtarı kayıtlı değil."; send disabled |
| M9 | Save a made-up Gemini key, send (stub: valid vocab under İngilizce) | One `generateContent` request with the key in the header; topic appears |
| M10 | Delete a key | Back to the field; `hasKey` false after the reload |
| M11 | Tab through the API mode body and confirmation | Every control reachable with a visible focus ring |

### For the user (not run here)

| ID | Step | Expected |
|---|---|---|
| U1 | Enter your real Claude key in Ayarlar; send a small prompt under Öğrenme or İngilizce | A real answer is saved; the usage line matches the Anthropic console |
| U2 | Same with your Gemini key | Same, against Google's console |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M11 done with the expected results
- [ ] `roadmap.md` phase 9.3 ticked and set to `done`

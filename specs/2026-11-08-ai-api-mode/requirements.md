# Requirements — Phase 9.3 API mode

**Roadmap phase:** 9.3 API mode (AI connection modes)
**Branch:** `feat/9.3-ai-api-mode`, cut from the milestone branch `claude/milestone-9-145c99`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

In the "API" mode a module's panel sends the prompt to an AI provider from the API process, after a clear cost note and a confirmation, and feeds the answer through the same validator and merge as every other import. Nothing is called automatically, and invalid output is never saved.

## Scope

- **Electron:** two new secret names, passed to the API as environment variables.
- **API:** new folder `Modules/Ai/`: provider list with prices, `ClaudeClient` (official SDK), `GeminiClient` (`HttpClient`), `AiService`, `GET /api/ai/providers`, `POST /api/ai/run`. `settings.json` → `aiProvider`. `api` joins `AiModes.Available`.
- **Renderer:** the API mode body in `AiContentPanel`; Ayarlar → "Yapay zekâ API'leri" (provider and keys).
- **New package:** `Anthropic` 13.6.0 in `DevPath.Api` (the official C# SDK; the user confirmed package and version).
- `tech-stack.md`, `roadmap.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Providers and models | **Both Claude and Gemini**: Claude Opus 5.5 (`claude-opus-5-5`, $4 / $20 per 1M tokens) and Gemini 3.1 Pro (`gemini-3.1-pro-preview`, $2 / $12 up to 200k prompt tokens). The list is one C# table, so a model change is one line. `gemini-3.1-pro-preview` is the only Gemini 3.1 Pro id on Google's model page, and it is a preview. |
| Which provider is used | One setting for the app (`aiProvider`, default `claude`), shown and changeable in Ayarlar and in the API mode body. The mode remains per module. |
| Connection | **Claude: `Anthropic` NuGet 13.6.0** (user's choice). **Gemini: `HttpClient`** like GitHub and YouTube; no new package was confirmed for it, and it is one POST. |
| Keys | **Entered by the user in the app**: `anthropicApiKey`, `geminiApiKey` in `safeStorage`. Passed to the API as `DEVPATH_ANTHROPIC_API_KEY` and `DEVPATH_GEMINI_API_KEY`. |
| Testing | **Never a paid call.** Tests use stub handlers; manual validation uses a local stub server that answers with sample content written by hand. A real call is a step for the user. |
| Prompt | **An editable box** with the template (or the `prompt` prop). The user fills the `Topic:` and `Level:` lines. |
| Cost note | **Estimate and confirmation.** Always visible: model, prices and an estimated upper bound. "Yapay zekâya gönder" opens an inline confirmation; "Ücretli çağrıyı onayla" calls. Afterwards the real tokens and cost are shown. The estimate is local and makes no call. |

### Deviations found while implementing

| Topic | What happened |
|---|---|
| Commits | Tasks 1–6 of `plan.md` landed in one commit (`feat(ai): add the API mode with a cost note`), checked once with `npm run check`, instead of one commit per task. History is not rewritten to split them. |
| Test race, same commit | `InboxServiceTests` (9.2) wrote `x.json` into the shared temp parent, which `JsonFileStoreTests` asserts is absent. The file is now `inbox-outside.json`. It should have been a separate `fix(...)` commit. |
| Claude key header | SDK 13.x sends an API key as `Authorization: Bearer` (documented on `ClientOptions.ApiKey`), not `x-api-key`. Tests assert what the SDK sends. Whether Anthropic accepts it can only be confirmed with a real key (U1). |
| Prompt box reset | A changed `prompt` prop remounts `ApiRunBody` (`key={prompt}`) instead of an effect, which the lint rules refuse. |

## User stories

1. **As the user**, I enter my Claude or Gemini key once in Ayarlar; it is never shown again.
2. **As the user**, I set Öğrenme to "API", fill in the topic in the prompt box, read the cost note, confirm, and the lesson appears.
3. **As the user**, if the AI's answer is invalid, nothing is saved; I see the errors and the raw answer and decide what to do. Trying again is another confirmed call.

## Business and technical rules

### Providers — `GET /api/ai/providers`

- Answer: `[{ id, label, model, inputPerMillion, outputPerMillion, maxOutputTokens, hasKey }]`. `hasKey` is the only thing it says about a key.
- `maxOutputTokens` is 16,000 for both.

### Run — `POST /api/ai/run` with `{ provider, type, prompt }`

- Unknown `provider` → `400` on `provider`; unknown `type` → `400` on `type`; prompt empty or over 200,000 characters → `400` on `prompt`.
- Answer (a normal `200`, like an import): `{ error, errors, report, usage, output }`.
- No key: `error` "API anahtarı kayıtlı değil. Ayarlar'dan ekle.", no call.
- **Exactly one call per request.** The SDK's retries are off (`MaxRetries = 0`) and nothing is retried, because a retry could be billed without a note. Timeout 5 minutes.
- Failures become a Turkish `error`, never the provider's text, so a key can't leak: 401/403 "API anahtarı geçersiz."; 429 "İstek sınırına ulaşıldı. Biraz sonra tekrar dene."; other status "Yapay zekâ isteği başarısız oldu (<status>)."; unreachable or timeout "Yapay zekâya ulaşılamadı."; unreadable answer "Yapay zekâ yanıtı okunamadı."
- A cut-off answer (`max_tokens` / `MAX_TOKENS`): `error` "Cevap çıktı sınırında kesildi; prompt'u küçült." A refusal (`refusal`, `SAFETY`, a blocked prompt): `error` "Yapay zekâ bu isteği yanıtlamadı." Neither is imported; `usage` and `output` are still returned.
- Otherwise the text goes through `ImportService.ImportAsync`: errors in `errors` (nothing saved), or `report`. A Markdown fence is handled by the validator as in every import.
- `usage`: `{ inputTokens, outputTokens, costUsd }`, computed from the provider's numbers and the table. Gemini's thinking tokens count as output (Google bills them as output).
- `output` is the raw answer text, up to 2 MB, so the user can see what was refused. It isn't stored.
- Nothing is logged except the failure kind; the named clients redact every header. Keys are only in request headers.
- `DEVPATH_AI_STUB_URL` replaces both base URLs **in Development only**, so the real app can be validated against a local stub. It is ignored in any other environment.

### Provider setting

- `settings.json` → `aiProvider`, in `GET /api/settings`, saved with `PUT /api/settings/ai-provider` (`{ provider }`). Unknown → `400` on `provider`. A missing or unknown value reads as `claude`.

### Renderer — API mode body (`ApiRunBody`)

- The "Sağlayıcı" select, the "Prompt" box and the cost note, in that order.
- Cost note: "Claude Opus 5.5 · 1M giriş tokeni $4,00 · 1M çıkış tokeni $20,00. Bu çağrı için tahmini üst sınır: $0,33. Sen onaylamadan hiçbir çağrı yapılmaz." The estimate is `ceil(prompt characters ÷ 3) × input price + maxOutputTokens × output price`, updated as the prompt changes.
- No key for the provider: "API anahtarı kayıtlı değil." with a link to Ayarlar; "Yapay zekâya gönder" is disabled. It is also disabled for an empty prompt.
- "Yapay zekâya gönder" → an inline confirmation (`role="alertdialog"`): the estimate again, "Ücretli çağrıyı onayla" and "Vazgeç". Focus moves to the confirm button.
- While running: "Yapay zekâ yanıtlıyor…", and the buttons are disabled.
- Result: the report line (shared with the other modes) or the `error` or the line-by-line `errors`; the usage line "1.234 giriş, 2.345 çıkış tokeni · $0,05"; "Yapay zekânın cevabı" in a `<details>` with a read-only box when the answer was not saved. The prompt stays in the box.
- `onImported` is called after a save.

### Renderer — Ayarlar → "Yapay zekâ API'leri"

- The "Sağlayıcı" select and, per provider, the key field like GitHub's: a password input and "Anahtarı kaydet"; once saved only "Anahtar kayıtlı." and "Anahtarı sil". Saving or deleting restarts the API and reloads the window, as with the GitHub token.
- Note: "Anahtarlar bu bilgisayarda şifreli saklanır ve bir daha gösterilmez. Çağrılar senin hesabına ücretlendirilir."

### Modules

`AiContentPanel` gets the body with `module`, `type`, `prompt` and `onImported`, so 10.x and 11.x use API mode with no extra code. The mode select's "API (yakında)" becomes "API". Ayarlar → modes needs no folder or key field for it.

## Out of scope

| Item | Where it goes |
|---|---|
| A usage or spend history | Not planned; the provider's console has it |
| Streaming the answer | Not planned; a 16,000-token answer fits one request |
| Other providers or a model picker | One line in the table when needed |
| Server-side refusal fallback | Left out: it re-runs the request on another model inside one call, against the rule that each paid call is confirmed. A refusal is reported instead |
| Repairing invalid output automatically | Not planned: another call is another confirmed cost |

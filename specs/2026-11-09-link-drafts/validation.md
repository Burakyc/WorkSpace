# Validation — Phase 11.3 Drafts from a YouTube video or link

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 11.3, plus the decisions in [requirements.md](requirements.md):

- [x] Pasting a YouTube link or any URL fills the link-analysis fields (`schemas/link-analysis.schema.json`), and they can be corrected.
- [x] A draft comes from those fields, the required note and the style prompt, in any AI mode.
- [x] Non-https, local and private addresses are refused, also through redirects and DNS.
- [x] A failed read never stops the flow: the fields can be filled by hand.
- [x] The "Preparing a post" scenario works end to end.

## Automated tests

Run with:

```bash
npm run check
```

Tests never reach the network: page and YouTube answers come from `StubHttpHandler`.

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Schema | `LinkAnalysisSchemaTests` | The sample passes; a missing note, two items, `http://`, an unknown `source` and an unknown property each give an error |
| T2 | Not an import | same | `ContentType.Find("link-analysis")` is null and `/api/import` refuses it; both examples in the template pass their schemas |
| T3 | Addresses | `LinkAddressTests` | Public `https` passes; `http`, a port, a user name, `localhost`, `*.local`, `*.internal`, a dotless name, private, loopback, link-local, CGNAT, mapped, `2130706433` and `127.1` are refused; `ResolvePublicAsync` refuses when one resolved address is private or none resolve |
| T4 | Meta tags | `HtmlMetaTests` | The fallback order; both attribute orders and quote styles; entities decoded; whitespace collapsed; nothing past `</head>`; junk gives nulls |
| T5 | YouTube ids | `YouTubeLinkTests` | Each URL form gives the id; other hosts and malformed ids give null |
| T6 | Page read | `LinkReaderTests` | Fields read and cut to limits; not HTML; an error status; over 2 MB; a redirect is followed, a redirect to a private address or `http` is refused and never requested, a fourth redirect fails |
| T7 | YouTube read | same, `LinkEndpointTests` | Canonical URL; oEmbed title and channel with the page's description; a failed page keeps oEmbed's fields with no error; a failed oEmbed uses the page's title; both failed → `error`; a bad address → 400 on `url` with no request |
| T8 | Context | `LinkAnalysisServiceTests` | JSON that passes the schema with `source` from the URL; long title cut for `topic`; missing note and title, long fields and a private URL give field errors |
| T9 | Prompt | `buildDraftPrompt.test.ts` | Takes the template; the link template has no placeholder left |
| T10 | Section | `LinkDraftSection.test.tsx` | Nothing is read before "Oku"; a read fills the fields; a failed read shows the message and fields; "Promptu hazırla" needs title and note; the panel shows the prompt; a changed field or style hides it; field errors; an import calls back |

## Manual test steps

In the dev app (`%APPDATA%\DevPath\dev-data`). Reading a public page is free. Never a real paid AI call: API mode runs against a local stub (`DEVPATH_AI_STUB_URL`). Delete only what the test created.

| ID | Step | Expected |
|---|---|---|
| M1 | Paste a public YouTube link, "Oku" | Title and channel filled, description when YouTube serves it; the canonical link |
| M2 | Paste a public article URL, "Oku" | Title and description from the page |
| M3 | Try `http://example.com`, `https://127.0.0.1/`, `https://localhost/`, `https://192.168.1.1/` | Refused with the field error, no request |
| M4 | Try a public name that resolves to loopback (`https://localtest.me/`) | The read fails with the message; the fields can be filled by hand |
| M5 | Clear the note | "Promptu hazırla" is disabled |
| M6 | Scenario: fill the note, "Promptu hazırla", open "Hazırlanan prompt" | The fields and the note are in the prompt; nothing was sent |
| M7 | Copy-paste mode: paste valid JSON, "İçe aktar" | A draft with title, body, hashtags, source link and image suggestion; "Kopyala" copies the text |
| M8 | Paste invalid JSON | Line-by-line errors, nothing saved |
| M9 | API mode against the stub | Cost note and confirmation; a draft from a valid answer, errors and no draft from an invalid one |
| M10 | Change a field after building | The prompt is hidden until built again |
| M11 | Tab through the section | Every control reachable with a visible focus ring |
| U1 | **For the user, not run here:** the scenario with a real key in API mode | A draft from the real provider, at the provider's cost |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M11 done with the expected results
- [x] `roadmap.md` phase 11.3 ticked and set to `done`

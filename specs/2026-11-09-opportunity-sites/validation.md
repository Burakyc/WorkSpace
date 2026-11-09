# Validation — Phase 12.1 Opportunity sites

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 12.1, plus the decisions in [requirements.md](requirements.md):

- [ ] Ayarlar lists the followed sites, starting with youthall.com, anbean.com.tr, coderspace.io and patika.dev; the user can add and remove sites.
- [ ] The Ana Sayfa card lists the sites; clicking one opens it in the browser with `openExternal`.
- [ ] Links only: the module makes no HTTP request and stores nothing but `{ id, name, url }`.
- [ ] Only https sites can be added; a bare domain becomes `https://`.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | URL rules | `OpportunitySiteUrlTests` | `patika.dev` → `https://patika.dev/`; `https://www.youthall.com/tr/jobs` kept; id drops `www.` and is lower case; empty, `http://`, `ftp://`, `javascript:alert(1)`, no dot, user info, a port and over 2,000 characters are refused with their messages |
| T2 | Defaults | `OpportunityServiceTests` | No file or no section → the four defaults in order and no file is written; a broken entry is skipped |
| T3 | Add | same | Add saves defaults + the new site; empty name allowed, over 60 refused; the same host (also with `www.`) refused; the 31st site refused |
| T4 | Remove | same | Removing a default saves the other three; removing all saves `[]` and later reads stay empty; unknown id → false; other `settings.json` sections are untouched |
| T5 | Endpoints | `OpportunityEndpointTests` | GET, POST (`201`), DELETE (`204`, unknown `404`) round trip; a bad URL → `400` on `url`; no token → `401` |
| T6 | Client | `client.test.ts` | The three methods call the right path and method with the token header |
| T7 | Settings list | `OpportunitySitesForm.test.tsx` | Sites shown by name or host; empty list text; failed load alert; "Kaldır" removes and refreshes; failed remove alert |
| T8 | Settings add | same | Add sends name and URL, clears the form and shows the site; a 400 shows the field error and keeps the input |
| T9 | Card list | `OpportunitiesCard.test.tsx` | Sites shown; empty state links to Ayarlar; failed load shows the error inside the card |
| T10 | Card open | same | Clicking a site calls `openExternal` with its URL |

## Manual test steps

In the dev app (`%APPDATA%\DevPath\dev-data`). At the end, remove the `opportunities` section from `settings.json` if the test created it.

| ID | Step | Expected |
|---|---|---|
| M1 | Open Ana Sayfa with no `opportunities` section | Card shows Youthall, Anbean, Coderspace, Patika.dev; `settings.json` unchanged |
| M2 | Click "Coderspace" | `https://coderspace.io/` opens in the default browser |
| M3 | Ayarlar → add `kariyer.net` with no name | Listed as `kariyer.net` with `https://kariyer.net/`; `settings.json` has all five sites |
| M4 | Add `http://example.com`, then `patika.dev` again | "Sadece https adresleri eklenebilir.", then "Bu site zaten ekli." |
| M5 | Remove "Anbean", go to Ana Sayfa | Anbean is gone from the card |
| M6 | Search `Modules/Opportunities/` and the new renderer files for `HttpClient`, `fetch(` and `IHttpClientFactory` | No match: nothing reads the sites |
| M7 | Tab through the Ayarlar section and the card | Every control reachable with a visible focus ring |

## Sign-off

- [ ] All acceptance criteria checked
- [ ] `npm run check` passes
- [ ] M1–M7 done with the expected results
- [ ] `roadmap.md` phase 12.1 ticked and set to `done`

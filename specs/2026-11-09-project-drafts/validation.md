# Validation — Phase 11.2 Drafts from a project

The phase is done only when every acceptance criterion below is checked, `npm run check` passes, and every manual step gives the expected result.

## Acceptance criteria

From `roadmap.md` phase 11.2, plus the decisions in [requirements.md](requirements.md):

- [x] Picking a project builds a prompt from the project, its sessions and notes and the style prompt.
- [x] A draft has title, body, hashtags, source link and image suggestion, and is saved in `posts.json`.
- [x] Invalid AI output is never saved, in any AI mode.
- [x] "Kopyala" copies the text. There is no post button and no LinkedIn API call.
- [x] Drafts can be edited and deleted.

## Automated tests

Run with:

```bash
npm run check
```

| ID | Test | File | Expected |
|---|---|---|---|
| T1 | Template | `PromptTemplateTests` | The example in `prompts/post.md` passes its schema |
| T2 | Validation | `ImportValidatorTests` | A missing `body`, an `http://` link, a hashtag with a space and an unknown property give line-by-line errors |
| T3 | Import | `PostDraftImportTests` | Items land in `posts.json` with ids and dates and without `#`; the same title is skipped; no topic file is written; invalid text saves nothing |
| T4 | Modes | `SettingsServiceTests`, `AiServiceTests`, `InboxServiceTests` | `posts` has a mode and an inbox; an API run with `post` saves a draft and an invalid answer saves nothing; an inbox file imports as a draft |
| T5 | Service | `PostDraftServiceTests` | Newest first; an edit keeps `topic` and `createdAt` and sets `updatedAt`; every limit gives a field error; empty link → null; delete; unknown id |
| T6 | Endpoints | `PostDraftEndpointTests` | Import, list, PUT, DELETE round trip; 404s; 400 on a field |
| T7 | Context | `PostContextServiceTests` | All lines and blocks; lines without data left out; stopped session's note used but not counted; other projects' sessions excluded; 50 notes and 5,000 characters caps; bad `projectId` and `noteIds` |
| T8 | Copy text | `draftText.test.ts` | Body, hashtags and link with blank lines; missing parts left out; hashtag input is split and loses `#` |
| T9 | Card | `DraftList.test.tsx` | Shows the fields; "Kopyala" writes the text; "Aç" calls `openExternal`; no post button |
| T10 | Edit, delete | same | The form saves and the list reloads; a field error is shown; "Sil" asks first, "Vazgeç" keeps it |
| T11 | Prompt | `buildDraftPrompt.test.ts` | Placeholders filled in one pass; empty style → "(none)" |
| T12 | Section | `ProjectDraftSection.test.tsx` | No project shows the hint; picking one sends project and pages, shows the panel with the built prompt; the 11th page is disabled; a failed load shows the alert; an import calls back |

## Manual test steps

In the dev app (`%APPDATA%\DevPath\dev-data`). Delete only what the test created: the goal, project, sessions, note page and `posts.json`. Never a real paid call: API mode runs against a local stub through `DEVPATH_AI_STUB_URL`.

| ID | Step | Expected |
|---|---|---|
| M1 | A goal, a project with a link, two sessions with notes, a note page; open Gönderiler | The project in the select, the page in "Not sayfaları" |
| M2 | Pick the project, tick the page, open "Hazırlanan prompt" | The project, numbers, session notes, page text and style prompt are there |
| M3 | Copy-paste mode: "Promptu kopyala", paste invalid JSON, "İçe aktar" | The clipboard holds the prompt; line-by-line errors; no `posts.json` |
| M4 | Paste valid JSON, "İçe aktar" | "1 taslak eklendi", the draft appears in "Taslaklar"; `posts.json` has `schemaVersion: 1` |
| M5 | "Kopyala" | The clipboard holds body, hashtags and link |
| M6 | "Düzenle", change the body, save; reload | The change is kept |
| M7 | "Sil", "Vazgeç", then "Sil", "Evet, sil" | Kept, then gone |
| M8 | API mode against the stub, with valid and then invalid output | Cost note and confirmation first; a draft from the valid answer; errors and no draft from the invalid one |
| M9 | File mode with one valid `.json` in a temp inbox | Listed, imported as a draft, moved to `done/` |
| M10 | Search the page for a post button | None; Gönderiler has only "Kopyala" |
| U1 | **For the user, not run here:** the same flow with a real key in API mode | A draft from the real provider, at the provider's cost |

## Sign-off

- [x] All acceptance criteria checked
- [x] `npm run check` passes
- [x] M1–M10 done with the expected results
- [x] `roadmap.md` phase 11.2 ticked and set to `done`

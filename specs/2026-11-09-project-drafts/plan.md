# Plan — Phase 11.2 Drafts from a project

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/11.2-project-drafts` from `claude/milestone-11-fc0882`.

Every task ends with `npm run check` (after `npx prettier --write src` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. The post content type

**Commit:** `feat(posts): import post drafts into posts.json`

- `schemas/post.schema.json`, `prompts/post.md`; `post` in `ContentType.All`; `ImportService` adds its items to `posts.json` (`PostDraft`, `PostDraftImport`); the validator's other `pattern` message; `posts` in `AiModes.Modules`.
- `types.ts` (`ContentType`, `AiModule`, `PostDraft`), `prompts.ts`, `aiModes.ts`, `formatImportReport.ts`, the fakes (additive).
- Tests T1–T4.

### 2. Saved drafts in the API

**Commit:** `feat(posts): list, edit and delete drafts`

- `PostDraftService`, routes in `PostsController`; repository in `AddPosts()`.
- Tests T5–T6.

### 3. A project's source text

**Commit:** `feat(posts): build a project's source text`

- `PostContextService`, `POST /api/posts/project-context`.
- Test T7.

### 4. Drafts on the page

**Commit:** `feat(posts): copy, edit and delete drafts on the page`

- `client.ts` (`listDrafts`, `saveDraft`, `deleteDraft`), `draftText.ts`, `DraftList`, `DraftCard`, `DraftForm`, the fake.
- Tests T8–T10.

### 5. Draft from a project

**Commit:** `feat(posts): draft a post from a project`

- `client.ts` (`getProjectContext`), `buildDraftPrompt.ts`, `ProjectDraftSection`, `NotePagePicker`; `PostsPage` shows the sections and reloads the drafts after an import.
- Tests T11–T12.

### 6. Docs

**Commit:** `docs: document the project drafts`

- `specs/tech-stack.md`: the import table row, the page, the API, `posts.json`, the new AI module row.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 11.2 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 11.2 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-11-fc0882` to the phase branch. Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(posts): import post drafts into posts.json` |
| 2 | `feat(posts): list, edit and delete drafts` |
| 3 | `feat(posts): build a project's source text` |
| 4 | `feat(posts): copy, edit and delete drafts on the page` |
| 5 | `feat(posts): draft a post from a project` |
| 6 | `docs: document the project drafts` |
| 7 | `docs(roadmap): mark phase 11.2 done` |

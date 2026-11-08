# Plan — Phase 11.3 Drafts from a YouTube video or link

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/11.3-link-drafts` from `claude/milestone-11-fc0882`.

Every task ends with `npm run check` (after `npx prettier --write src` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Schema and prompt

**Commit:** `feat(posts): add the link-analysis schema and prompt`

- `schemas/link-analysis.schema.json`, `prompts/link-analysis.md`; `ContentType.LinkAnalysis`, outside `All`.
- Tests T1–T2.

### 2. Which addresses may be read

**Commit:** `feat(posts): refuse local and private link addresses`

- `LinkAddress`: `Parse`, `IsPublic`, `ResolvePublicAsync`.
- Test T3.

### 3. Read a link

**Commit:** `feat(posts): read a link's title, author and description`

- `HtmlMeta`, `YouTubeLink`, `LinkReader`; named client `link` with the connect guard; `POST /api/posts/link/read`.
- Tests T4–T7.

### 4. A link's source text

**Commit:** `feat(posts): build a link's source text`

- `LinkAnalysisService`, `POST /api/posts/link/context`.
- Test T8.

### 5. Draft from a link

**Commit:** `feat(posts): draft a post from a link`

- `client.ts`, `types.ts`; `buildDraftPrompt` takes the template; `LinkDraftSection`, on `PostsPage` above the project section; the fake.
- Tests T9–T10.

### 6. Docs

**Commit:** `docs: document the link drafts`

- `specs/tech-stack.md`: external data, the read rules under API and security rules, the frontend bullet, the import table row.

### 7. Close the phase

**Commit:** `docs(roadmap): mark phase 11.3 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 11.3 boxes in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-11-fc0882` to the phase branch. Do not merge into `main`. Do not push. Stop after this phase; do not start the "Later" items.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(posts): add the link-analysis schema and prompt` |
| 2 | `feat(posts): refuse local and private link addresses` |
| 3 | `feat(posts): read a link's title, author and description` |
| 4 | `feat(posts): build a link's source text` |
| 5 | `feat(posts): draft a post from a link` |
| 6 | `docs: document the link drafts` |
| 7 | `docs(roadmap): mark phase 11.3 done` |

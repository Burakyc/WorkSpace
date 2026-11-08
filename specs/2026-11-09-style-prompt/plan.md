# Plan — Phase 11.1 Style prompt

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

Branch `feat/11.1-style-prompt` from `claude/milestone-11-fc0882`.

Every task ends with `npm run check` (after `npx prettier --write src` in `apps/desktop`). A task is committed only when it passes. No new packages.

## Tasks

### 1. Store the style prompt

**Commit:** `feat(posts): store the style prompt with its history`

- `Modules/Posts/PostsModule.cs`, `StyleService.cs`, `PostsController.cs`; `AddPosts()` in `Program.cs`.
- `StyleServiceTests`, `StyleEndpointTests` (T1–T5).

### 2. Style section on a new page

**Commit:** `feat(posts): edit the style prompt on the Gönderiler page`

- `prompts/style-example-en.md`, `style-example-tr.md`, test that both fit the limit (T6).
- `types.ts`, `client.ts` (`getStylePrompt`, `saveStylePrompt`).
- `src/modules/posts/`: `PostsPage`, `StylePromptSection`, `StyleExamples`, `StyleHistory`, CSS module, `styleExamples.ts`, `testing/fakePostsApi.ts`.
- `navigation.tsx`: `/posts`; `AppLayout.test.tsx` follows the order.
- `StylePromptSection.test.tsx` (T7–T10).

### 3. Docs

**Commit:** `docs: document the style prompt`

- `specs/tech-stack.md`: a frontend bullet for the page, the API and `style.json`.

### 4. Close the phase

**Commit:** `docs(roadmap): mark phase 11.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 11.1 box in `specs/roadmap.md`, set `done`, tick validation.md, fill in the **Result** line.
- Fast-forward `claude/milestone-11-fc0882` to the phase branch. Do not merge into `main`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(posts): store the style prompt with its history` |
| 2 | `feat(posts): edit the style prompt on the Gönderiler page` |
| 3 | `docs: document the style prompt` |
| 4 | `docs(roadmap): mark phase 11.1 done` |

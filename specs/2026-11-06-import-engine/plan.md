# Plan — Phase 5.1 Import engine and validator

See [requirements.md](requirements.md) for scope and rules, and [validation.md](validation.md) for how each task is checked.

## Before task 1

```bash
git switch -c feat/5.1-import-engine
```

Every task ends with `npm run check`. A task is committed only when it passes. One new package: **JsonSchema.Net 9.6.0** (API), confirmed during planning; it is the validator `tech-stack.md` names.

## Tasks

### 1. Schemas and content types

**Commit:** `feat(content): add the import schemas`

- `schemas/vocab.schema.json`, `lesson.schema.json`, `interview.schema.json` (draft 2020-12, envelope + items, `additionalProperties: false`, max lengths).
- `DevPath.Api.csproj`: `JsonSchema.Net` 9.6.0; the schemas as embedded resources (`DevPath.Schemas.<file>`).
- `Modules/Content/ContentType.cs` (name, module folder, schema, merge key field; `ContentType.Find(name)`).
- Docker: `docker-compose.yml` builds from the repo root with `apps/api/Dockerfile`; Dockerfile `COPY` paths include `schemas/`; root `.dockerignore`.
- `ContentTypeTests.cs` (T1).
- Check: `npm run check`; `docker compose build` succeeds.

### 2. Validator with line numbers

**Commit:** `feat(content): validate imports with line numbers`

- `Modules/Content/JsonLines.cs` (JSON pointer → line), `Modules/Content/ContentKey.cs` (`Key`, `Slug`), `Modules/Content/ImportValidator.cs` (records `ImportError`, `ValidatedImport`; Turkish `ErrorMessages`).
- `JsonLinesTests.cs` (T2), `ContentKeyTests.cs` (T3), `ImportValidatorTests.cs` (T4–T6).
- Check: `npm run check`.

### 3. Merge into topics

**Commit:** `feat(content): merge imports into topics`

- `Modules/Content/ImportService.cs` (record `ImportReport`), `Modules/Content/ContentModule.cs` (`AddContent()`, `TopicSchema`, `TopicPath`).
- `ImportServiceTests.cs` (T7–T8).
- Check: `npm run check`.

### 4. Endpoints

**Commit:** `feat(content): add the import endpoints`

- `Modules/Content/ImportController.cs` (`POST /api/import/validate`, `POST /api/import`, 8 MB limit), `ImportInput`; `AddContent()` in `Program.cs`.
- `ImportEndpointTests.cs` (T9).
- Check: `npm run check`.

### 5. Prompt templates

**Commit:** `feat(content): add the prompt templates`

- `prompts/vocab.md`, `prompts/lesson.md`, `prompts/interview.md` (English; `Topic:` / `Level:` lines, rules, one example in a ```` ```json ```` block).
- `PromptTemplateTests.cs` (T10): each template's example passes its schema.
- Check: `npm run check`.

### 6. Renderer client

**Commit:** `feat(content): add the import requests`

- Types `ContentType`, `ImportError`, `ImportReport`, `ImportResult`; `validateImport(type, text)`, `importContent(type, text)`.
- `client.test.ts` (T11).
- Check: `npm run check`.

### 7. Import panel on the module pages

**Commit:** `feat(content): import content from the module pages`

- `modules/content/prompts.ts` (`?raw` imports), `CopyPromptButton.tsx`, `ImportPanel.tsx`, `formatImportError.ts`, `ContentEmptyPage.tsx`, CSS; `modules/content/testing/fakeContentApi.ts`; the three entries in `navigation.tsx` get `element`.
- `formatImportError.test.ts` (T12), `ImportPanel.test.tsx` (T13–T15), `CopyPromptButton.test.tsx` (T16).
- Check: `npm run check`; manual M1–M7.

### 8. Docs

**Commit:** `docs: document the import engine`

- `specs/tech-stack.md`: JsonSchema.Net version, validation steps, merge and endpoints, the topic file, Docker build context; `README.md` Docker note if the command changes.

### 9. Close the phase

**Commit:** `docs(roadmap): mark phase 5.1 done`

- Run every check in validation.md (automated and manual).
- Only if all pass: tick the 5.1 boxes in `specs/roadmap.md` and set its status to `done`; tick validation.md.
- Fill in the **Result** line of the implementation prompt's entry in `Promtps.md`.
- Fast-forward the milestone branch to `feat/5.1-import-engine`. Do not push.

## Commit summary

| # | Commit |
|---|---|
| 1 | `feat(content): add the import schemas` |
| 2 | `feat(content): validate imports with line numbers` |
| 3 | `feat(content): merge imports into topics` |
| 4 | `feat(content): add the import endpoints` |
| 5 | `feat(content): add the prompt templates` |
| 6 | `feat(content): add the import requests` |
| 7 | `feat(content): import content from the module pages` |
| 8 | `docs: document the import engine` |
| 9 | `docs(roadmap): mark phase 5.1 done` |

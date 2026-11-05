# Requirements — Phase 1.1 Goals

**Roadmap phase:** 1.1 Goals (Milestone 1 — Goals and projects)
**Branch:** `feat/1.1-goals`
**Estimate:** 2–3 days at 1–2 hours/day

## Goal

The first real module. The user creates, edits, archives and restores goals on the Hedefler page; the API stores them in `goals.json` through the phase 0.4 storage. Every later module (projects, pomodoro, calendar) hangs off a goal.

## Scope

- **API** (`Modules/Goals/`): `Goal` entity, input validation, `GoalService`, `GoalsController` with list, create, update, archive and restore.
- **Shared API infrastructure**: validation errors as RFC 7807 `ValidationProblemDetails` (`400`) through one exception filter.
- **Renderer**: the API client learns JSON requests, the goal endpoints and validation errors; the Hedefler page lists goals with an inline create/edit form, archive/restore and an "Arşivlenenleri göster" toggle.
- Optional `targetPomodoros` per goal (progress itself comes in phase 1.2).
- `tech-stack.md` updated.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Form | **Inline panel**: "Yeni hedef" opens the form at the top of the list; "Düzenle" turns that card into the same form. Creating a goal takes two clicks (button, then "Kaydet" after typing). |
| Archive | **Archive and restore**: "Arşivle" hides a goal; with "Arşivlenenleri göster" on, archived goals appear with an "Arşivlendi" label and "Geri al". There is no delete, so sessions (phase 2.2) never lose their goal. |
| Order | **Newest first**; when archived goals are shown, they come after the active ones (each group newest first). |
| Validation messages | Turkish, produced by the API (they are shown to the user as they are). The form also uses `required`, `maxLength`, `min` and `max` so most mistakes never reach the API. |
| Service registration | `IRepository<Goal>` is registered with its `JsonRepository<Goal>` (the documented test seam); `GoalService` is registered as a concrete class (one implementation). `TimeProvider.System` gives `createdAt`, so tests can fix the time. |
| Client caching | One `getApiClient()` per page load caches the client built from `getApiConfig()`. The window reloads after a data-folder switch (phase 0.5), so the cache is never stale. |
| List loading | The page always asks for `includeArchived=true` and filters on the client, so it can tell "no goals at all" (empty state) from "all archived" ("Aktif hedef yok.") with one request. While loading it shows only the heading and "Yükleniyor…", so no button appears and then disappears (decided during task 6). |
| Module wiring file | `Modules/Goals/GoalsModule.cs` (`AddGoals()`, file name, schema) instead of `GoalsStorage.cs`: it registers the service too. |
| Shared buttons | `src/shared/ui/buttons.module.css` (`primary`, `secondary`); the Settings page uses it too. `EmptyState` takes optional children for its action button. |

## User stories

1. **As the user**, I add a goal ("Learn ASP.NET Core") with an optional description and an optional pomodoro target, in two clicks.
2. **As the user**, I fix a goal's title, description or target later.
3. **As the user**, I archive goals I no longer work on so the list stays short, and I can show and restore them.
4. **As the user**, when I make a mistake (empty title, too long text, target out of range), I see a Turkish message next to the field and nothing is saved.
5. **As the user**, with no goals yet, the page tells me to create my first goal and offers the button.

## Business and technical rules

### Goal

| Field | Type | Rule |
|---|---|---|
| `id` | string (GUID) | Set by the API |
| `title` | string | Required after trimming; at most 120 characters |
| `description` | string? | Trimmed; empty becomes `null`; at most 1000 characters |
| `targetPomodoros` | int? | `null` or 1–10000 |
| `archived` | bool | `false` on create |
| `createdAt` | ISO 8601 UTC | Set by the API on create; never changes |

- Stored in `goals.json` as `{ "schemaVersion": 1, "items": [ … ] }` (`DocumentSchema(1, [])`).
- Validation messages (key = camelCase field name):
  - `title`: "Başlık gerekli." / "Başlık en fazla 120 karakter olabilir."
  - `description`: "Açıklama en fazla 1000 karakter olabilir."
  - `targetPomodoros`: "Hedef pomodoro sayısı 1 ile 10000 arasında olmalı."

### API

| Method and path | Body | Result |
|---|---|---|
| `GET /api/goals?includeArchived=false` | — | `200` list: active goals newest first; with `includeArchived=true` archived ones follow, newest first |
| `POST /api/goals` | `{ title, description?, targetPomodoros? }` | `201` with the goal and `Location`; `400` validation problem |
| `PUT /api/goals/{id}` | same as create | `200` with the goal; `400`; `404` |
| `POST /api/goals/{id}/archive` | — | `200` with the goal; `404`. Idempotent |
| `POST /api/goals/{id}/restore` | — | `200` with the goal; `404`. Idempotent |

- Controllers stay thin: bind, call one `GoalService` method, map `null` to `404`. Validation failures throw `ValidationException(errors)`; a global filter turns it into `ValidationProblem` (`400`, `application/problem+json`, `errors: { field: [message] }`).
- Unknown JSON properties are ignored by the default binder; only the three input fields are used. `id`, `archived` and `createdAt` can never be set by a client.

### Renderer

- `src/shared/api/client.ts`: one private `request<T>(method, path, body?)` used by every method; `ApiError` gets `errors?: Record<string, string[]>` from a `400` validation problem. New methods: `listGoals(includeArchived)`, `createGoal(input)`, `updateGoal(id, input)`, `archiveGoal(id)`, `restoreGoal(id)`.
- `src/shared/api/getApiClient.ts`: cached client for the page load.
- `src/modules/goals/`: `GoalsPage`, `GoalCard`, `GoalForm` (one component per file, CSS Modules, tokens only). The route table entry for Hedefler gets `element: <GoalsPage />`.
- Page layout: `<h1>Hedefler</h1>`, "Yeni hedef" button, "Arşivlenenleri göster" checkbox, then the form (when open) and the cards.
- Card: title, description (as text), "Hedef: N pomodoro" or "Hedef yok", "Düzenle", "Arşivle" (or "Arşivlendi" label + "Geri al").
- Form fields with labels: "Başlık", "Açıklama", "Hedef pomodoro (isteğe bağlı)"; buttons "Kaydet" (disabled while saving) and "Vazgeç". API errors show under each field (`aria-describedby`, `aria-invalid`); a general failure shows in `role="alert"`.
- After a create, update, archive or restore, the list reloads from the API.
- With no goals: the existing empty state text plus the "Yeni hedef" button. With goals that are all archived and the toggle off: "Aktif hedef yok."
- All user text is rendered as text (no HTML).

## Out of scope

| Item | Where it goes |
|---|---|
| Projects under goals, progress | Phase 1.2 |
| Deleting goals | Not planned (decided) |
| Reordering goals by hand | Not planned |
| Searching or filtering goals | Not planned for the MVP |
| Goal colors or icons | Not planned |

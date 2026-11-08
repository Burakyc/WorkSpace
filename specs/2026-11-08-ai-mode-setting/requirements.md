# Requirements — Phase 9.1 Mode setting and copy-paste mode

**Roadmap phase:** 9.1 Mode setting and copy-paste mode (AI connection modes)
**Branch:** `feat/9.1-ai-mode-setting`, cut from the milestone branch `claude/milestone-9-145c99`
**Estimate:** 1 day at 1–2 hours/day

## Goal

Each module that uses AI content remembers how it gets that content: copy-paste (default), file import or API. This phase adds the setting and routes everything through one panel. Only copy-paste works now and it is the 5.1 flow unchanged; phases 9.2 and 9.3 open the other two options.

The panel is the one place that "runs a prompt through the chosen mode", so the AI teacher (10.x) and the post assistant (11.x) can use it without knowing the modes.

## Scope

- **API:** `aiModes` section in `settings.json`, in `GET /api/settings`; `PUT /api/settings/ai-modes/{module}`.
- **Renderer:** new folder `modules/ai/`: the module and mode lists, `useAiMode`, `AiModeSelect`, `AiContentPanel`. Ayarlar gets an "Yapay zekâ modları" section. `TopicListPage` uses `AiContentPanel`.
- `tech-stack.md`, `roadmap.md` updated.

No new packages. No schema version change: a new section with defaults, as with `reminders`.

## Decisions (from the planning questions)

| Topic | Decision |
|---|---|
| Where the mode is chosen | **Both**: Ayarlar lists every module; each module's "İçerik ekle" panel has the same select at its top, so changing it takes two clicks. Both write the same setting. |
| Which modules | **İngilizce, Öğrenme, Mülakat.** The module list is one list in the API and one in the renderer; 10.x and 11.x add their own line. |
| Modes not built yet | **Listed but disabled** ("Dosyadan içe aktar (yakında)", "API (yakında)"). 9.2 and 9.3 each enable theirs. The API refuses them too until then. |

## User stories

1. **As the user**, I open a module's "İçerik ekle" and it works as before: copy the prompt, paste the JSON, see the cards.
2. **As the user**, I see which mode each module uses in Ayarlar and in the module itself, and I can change it from either place.

## Business and technical rules

### Setting

- `settings.json` → `aiModes: { english, learning, interview }`, each `copyPaste` | `file` | `api`. Keys are module names, not content types, because a later module may produce an existing type (10.1 saves `lesson` content).
- `GET /api/settings` always returns all three. A missing file, section, key, or an unknown value reads as `copyPaste`.
- `PUT /api/settings/ai-modes/{module}` with `{ mode }` saves one module under one `JsonFileStore.UpdateAsync` and answers with all modes.
  - Unknown module → `400` on `module`: "Bilinmeyen modül."
  - Missing, unknown or not yet available mode → `400` on `mode`: "Bu mod kullanılamıyor."
  - In this phase only `copyPaste` is available (`AiModes.Available`).

### Renderer

- `AiContentPanel({ module, type, prompt?, onImported? })` loads the module's mode, shows `AiModeSelect` and the mode's body. Nothing below the select renders until the mode is known, so a saved mode never flashes another mode's body. If the settings cannot be read, it falls back to `copyPaste`, so content can still be added.
- Copy-paste body: the hint "Promptu kopyala, yapay zekâya yapıştır ve aldığın JSON'u aşağıya ekle.", `CopyPromptButton` and `ImportPanel`, unchanged in behaviour.
- `prompt` is optional text replacing the type's template (`CopyPromptButton` gets the same optional prop). The content modules do not pass it; 10.x does, for topic-specific prompts.
- `AiModeSelect`: a `<select>` labelled "Yapay zekâ modu" (in Ayarlar labelled with the module name). A change saves at once; the select is disabled while saving. A failed save goes back to the old value and shows "Kaydedilemedi." with `role="alert"`.
- Ayarlar → "Yapay zekâ modları": one select per module; the note "Yapay zekâ içeriğini her modülün nasıl aldığını seçer. Şimdilik yalnızca kopyala-yapıştır kullanılabilir."
- Topic list empty state: the "next" text becomes "İlk içeriğini aşağıdan ekle."; the copy button moves into the panel (same page position, under the empty state).

## Out of scope

| Item | Where it goes |
|---|---|
| File import mode | 9.2 |
| API mode, cost note | 9.3 |
| A mode row for the AI teacher or post assistant | 10.x, 11.x add their own |
| Changing the content prompts | Not needed |

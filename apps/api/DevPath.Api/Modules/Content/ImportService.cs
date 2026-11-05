using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Modules.Content;

/// <summary>What an import did. <see cref="Topic"/> is the stored name; <see cref="LevelKept"/> is true when the file's level differed and was ignored.</summary>
public sealed record ImportReport(string Type, string Topic, string Slug, bool Created, int Added, int Skipped, bool LevelKept);

/// <summary>Either errors (nothing saved) or a report.</summary>
public sealed record ImportResult(IReadOnlyList<ImportError> Errors, ImportReport? Report);

/// <summary>Validates imports and merges them into topic files. Existing items are never changed.</summary>
public sealed class ImportService(JsonFileStore store, TimeProvider time)
{
    public IReadOnlyList<ImportError> Validate(string? type, string? text) =>
        ImportValidator.Validate(Require(type), text).Errors;

    public async Task<ImportResult> ImportAsync(string? type, string? text, CancellationToken cancellationToken)
    {
        var contentType = Require(type);
        var (document, errors) = ImportValidator.Validate(contentType, text);
        if (document is null)
        {
            return new ImportResult(errors, null);
        }

        var topic = document["topic"]!.GetValue<string>().Trim();
        var slug = ContentKey.Slug(topic);
        var level = document["level"]!.GetValue<string>();
        var now = time.GetUtcNow();
        ImportReport? report = null;

        await store.UpdateAsync(ContentModule.TopicPath(contentType, slug), ContentModule.TopicSchema, current =>
        {
            var created = current is null;
            var stored = current ?? new JsonObject
            {
                ["type"] = contentType.Name,
                ["topic"] = topic,
                ["slug"] = slug,
                ["level"] = level,
                ["tags"] = new JsonArray(),
                ["createdAt"] = now,
                ["updatedAt"] = now,
                ["items"] = new JsonArray(),
            };

            var items = stored["items"]!.AsArray();
            var keys = items.Select(item => ContentKey.Key(item![contentType.KeyField]!.GetValue<string>())).ToHashSet();
            int added = 0, skipped = 0;
            foreach (var item in document["items"]!.AsArray())
            {
                if (keys.Add(ContentKey.Key(item![contentType.KeyField]!.GetValue<string>())))
                {
                    items.Add(NewItem(item.AsObject(), now));
                    added++;
                }
                else
                {
                    skipped++;
                }
            }

            // Stored tags are already normalized; the union is not capped at 10.
            var oldTags = stored["tags"]!.AsArray().Select(tag => tag!.GetValue<string>()).ToList();
            var tags = oldTags.Concat(TagsOf(document)).Distinct().ToList();
            report = new ImportReport(
                contentType.Name, stored["topic"]!.GetValue<string>(), slug, created, added, skipped,
                LevelKept: !created && stored["level"]!.GetValue<string>() != level);

            if (!created && added == 0 && tags.Count == oldTags.Count)
            {
                return null;
            }

            stored["tags"] = new JsonArray([.. tags.Select(tag => JsonValue.Create(tag))]);
            stored["updatedAt"] = now;
            return stored;
        }, cancellationToken);

        return new ImportResult([], report);
    }

    /// <summary>A copy of the imported item with a new id and addedAt first, and normalized tags.</summary>
    private static JsonObject NewItem(JsonObject imported, DateTimeOffset now)
    {
        var item = new JsonObject { ["id"] = Guid.NewGuid().ToString(), ["addedAt"] = now };
        foreach (var (name, value) in imported)
        {
            item[name] = name == "tags"
                ? new JsonArray([.. TagsOf(imported).Select(tag => JsonValue.Create(tag))])
                : value?.DeepClone();
        }

        return item;
    }

    /// <summary>Normalized tags of a validated document or item (the validator already rejected invalid ones).</summary>
    private static IReadOnlyList<string> TagsOf(JsonObject node) =>
        Tags.NormalizeAll(node["tags"]?.AsArray().Select(tag => tag?.GetValue<string>()), out _);

    private static ContentType Require(string? type) =>
        ContentType.Find(type) ?? throw new ValidationException(new Dictionary<string, string[]>
        {
            ["type"] = ["Tür vocab, lesson veya interview olmalı."],
        });
}

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Home;

/// <summary>One X summary from feed.json; strings are trimmed.</summary>
public sealed record FeedItem(string Title, string Summary, string? Url, string? Source, DateTimeOffset? PublishedAt);

/// <summary>The outcome of <see cref="FeedValidator.Validate"/>: errors, or the file's content when there are none.</summary>
public sealed record FeedValidation(IReadOnlyList<string> Errors, DateTimeOffset? GeneratedAt, IReadOnlyList<FeedItem> Items);

/// <summary>
/// The rules of schemas/feed.schema.json, written by hand so no schema package is needed.
/// Keep both in step: FeedSchemaFileTests checks the required fields and the version.
/// </summary>
public static partial class FeedValidator
{
    public const int SchemaVersion = 1;
    public const int MaxItems = 200;
    public const int MaxErrors = 20;
    public static readonly string[] RootRequired = ["schemaVersion", "generatedAt", "items"];
    public static readonly string[] ItemRequired = ["title", "summary"];

    private static readonly HashSet<string> ItemProperties = ["title", "summary", "url", "source", "publishedAt"];

    public static FeedValidation Validate(JsonNode? root)
    {
        var errors = new List<string>();
        if (root is not JsonObject document)
        {
            return Fail(["$: Dosya bir JSON nesnesi olmalı."]);
        }

        foreach (var (name, _) in document)
        {
            if (!RootRequired.Contains(name))
            {
                errors.Add($"{name}: Bilinmeyen alan.");
            }
        }

        if (document["schemaVersion"] is not JsonValue version ||
            version.GetValueKind() != JsonValueKind.Number ||
            !version.TryGetValue<int>(out var number) ||
            number != SchemaVersion)
        {
            errors.Add($"schemaVersion: {SchemaVersion} olmalı.");
        }

        var generatedAt = ReadDate(document, "generatedAt", "generatedAt", required: true, errors);

        var items = new List<FeedItem>();
        if (document["items"] is not JsonArray array)
        {
            errors.Add("items: Bir liste olmalı.");
        }
        else
        {
            if (array.Count > MaxItems)
            {
                errors.Add($"items: En fazla {MaxItems} öğe olabilir.");
            }

            for (var i = 0; i < array.Count; i++)
            {
                var item = ReadItem(array[i], $"items[{i}]", errors);
                if (item is not null)
                {
                    items.Add(item);
                }
            }
        }

        return errors.Count > 0 ? Fail(errors) : new FeedValidation([], generatedAt, items);
    }

    private static FeedItem? ReadItem(JsonNode? node, string path, List<string> errors)
    {
        if (node is not JsonObject item)
        {
            errors.Add($"{path}: Bir nesne olmalı.");
            return null;
        }

        foreach (var (name, _) in item)
        {
            if (!ItemProperties.Contains(name))
            {
                errors.Add($"{path}.{name}: Bilinmeyen alan.");
            }
        }

        var title = ReadText(item, "title", path, 200, required: true, "Başlık", errors);
        var summary = ReadText(item, "summary", path, 2000, required: true, "Özet", errors);
        var source = ReadText(item, "source", path, 100, required: false, "Kaynak", errors);
        var url = ReadText(item, "url", path, 2000, required: false, "Bağlantı", errors);
        if (url is not null &&
            (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps))
        {
            errors.Add($"{path}.url: https:// ile başlayan bir adres olmalı.");
        }

        var publishedAt = ReadDate(item, "publishedAt", $"{path}.publishedAt", required: false, errors);
        return title is null || summary is null ? null : new FeedItem(title, summary, url, source, publishedAt);
    }

    /// <summary>The trimmed text, or null when it is absent or broken (a broken value adds an error).</summary>
    private static string? ReadText(
        JsonObject item, string name, string path, int maxLength, bool required, string label, List<string> errors)
    {
        var field = $"{path}.{name}";
        if (!item.TryGetPropertyValue(name, out var node))
        {
            if (required)
            {
                errors.Add($"{field}: {label} gerekli.");
            }
            return null;
        }

        if (node is not JsonValue value || value.GetValueKind() != JsonValueKind.String)
        {
            errors.Add($"{field}: Metin olmalı.");
            return null;
        }

        var text = value.GetValue<string>();
        if (text.Trim().Length == 0)
        {
            errors.Add($"{field}: {label} boş olamaz.");
            return null;
        }

        if (text.Length > maxLength)
        {
            errors.Add($"{field}: {label} en fazla {maxLength} karakter olabilir.");
            return null;
        }

        return text.Trim();
    }

    private static DateTimeOffset? ReadDate(JsonObject document, string name, string field, bool required, List<string> errors)
    {
        if (!document.TryGetPropertyValue(name, out var node) && !required)
        {
            return null;
        }

        if (node is JsonValue value &&
            value.GetValueKind() == JsonValueKind.String &&
            DateTimePattern().IsMatch(value.GetValue<string>()) &&
            DateTimeOffset.TryParse(value.GetValue<string>(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            return date;
        }

        errors.Add($"{field}: Tarih-saat olmalı (ör. 2026-11-06T07:00:00Z).");
        return null;
    }

    private static FeedValidation Fail(List<string> errors) => new(errors.Take(MaxErrors).ToList(), null, []);

    // RFC 3339 date-time (JSON Schema "date-time"): seconds and an offset are required.
    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$")]
    private static partial Regex DateTimePattern();
}

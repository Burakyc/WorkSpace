using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevPath.Api.Modules.Pomodoro;
using Json.Schema;

namespace DevPath.Api.Modules.Content;

/// <summary>One problem in an import: the JSON pointer of the value, the 1-based line where it starts (when known) and a Turkish message.</summary>
public sealed record ImportError(string Path, int? Line, string Message);

/// <summary>The parsed document when <see cref="Errors"/> is empty; otherwise null.</summary>
public sealed record ValidatedImport(JsonObject? Document, IReadOnlyList<ImportError> Errors);

/// <summary>Checks pasted or uploaded text against a content type's schema and lists every problem with its line.</summary>
public static partial class ImportValidator
{
    public const int MaxBytes = 2 * 1024 * 1024;

    private static readonly JsonDocumentOptions ParseOptions = new() { AllowDuplicateProperties = false };

    private static readonly EvaluationOptions SchemaOptions = new() { OutputFormat = OutputFormat.List };

    // One ```json (or ```) line before the JSON and one ``` line after it, as AI chats often add.
    [GeneratedRegex(@"\A\s*(```[A-Za-z]*[ \t]*)\r?\n")]
    private static partial Regex OpeningFence();

    [GeneratedRegex(@"\n([ \t]*```)\s*\z")]
    private static partial Regex ClosingFence();

    public static ValidatedImport Validate(ContentType type, string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return Fail(null, "JSON metni boş.");
        }

        var bytes = Encoding.UTF8.GetBytes(BlankFence(text));
        if (bytes.Length > MaxBytes)
        {
            return Fail(null, "Dosya 2 MB'tan büyük olamaz.");
        }

        JsonDocument parsed;
        try
        {
            parsed = JsonDocument.Parse(bytes, ParseOptions);
        }
        catch (JsonException ex)
        {
            var duplicate = ex.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase);
            return Fail(
                ex.LineNumber is { } line ? (int)line + 1 : null,
                duplicate ? "Aynı alan iki kez yazılmış." : "Geçerli JSON değil. Bu satırı kontrol et.");
        }

        using (parsed)
        {
            var lines = JsonLines.Map(bytes);
            if (parsed.RootElement.ValueKind != JsonValueKind.Object)
            {
                return Fail(lines[""], "JSON bir nesne olmalı.");
            }

            var document = JsonNode.Parse(bytes)!.AsObject();
            var results = type.Schema.Evaluate(parsed.RootElement, SchemaOptions);
            var errors = results.IsValid ? RuleErrors(document) : SchemaErrors(type, results, document);
            if (errors.Count == 0)
            {
                return new ValidatedImport(document, []);
            }

            return new ValidatedImport(null, [.. errors
                .Select(error => new ImportError(error.Path, lines.GetValueOrDefault(error.Path), error.Message))
                .OrderBy(error => error.Line ?? 0)
                .ThenBy(error => error.Path, StringComparer.Ordinal)]);
        }
    }

    /// <summary>The <c>type</c> of a JSON object (a surrounding fence is ignored), or null when there is none to read.</summary>
    public static string? ReadType(string text)
    {
        try
        {
            return JsonNode.Parse(BlankFence(text)) is JsonObject root
                && root["type"] is JsonValue value
                && value.TryGetValue<string>(out var type) ? type : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static ValidatedImport Fail(int? line, string message) => new(null, [new ImportError("", line, message)]);

    /// <summary>Replaces a surrounding code fence with spaces, keeping every line break, so line numbers stay right.</summary>
    private static string BlankFence(string text)
    {
        var opening = OpeningFence().Match(text);
        var closing = ClosingFence().Match(text);
        if (!opening.Success || !closing.Success || closing.Index < opening.Index + opening.Length)
        {
            return text;
        }

        var chars = text.ToCharArray();
        foreach (var group in new[] { opening.Groups[1], closing.Groups[1] })
        {
            Array.Fill(chars, ' ', group.Index, group.Length);
        }

        return new string(chars);
    }

    private static List<(string Path, string Message)> SchemaErrors(ContentType type, EvaluationResults results, JsonObject document)
    {
        var errors = new List<(string, string)>();
        foreach (var detail in results.Details ?? [])
        {
            foreach (var (keyword, fallback) in detail.Errors ?? [])
            {
                var path = detail.InstanceLocation.ToString();
                if (Describe(keyword, fallback, path, RuleFor(type.Definition, path), Find(document, path)) is { } message)
                {
                    errors.Add((path, message));
                }
            }
        }

        return errors;
    }

    /// <summary>A Turkish message for one failed keyword, or null for the summaries of applicators whose children are listed.</summary>
    private static string? Describe(string keyword, string fallback, string path, JsonNode? rule, JsonNode? value) =>
        keyword switch
        {
            // The schemas use the false schema only through additionalProperties: false.
            "" => $"Bilinmeyen alan: {Unescape(path[(path.LastIndexOf('/') + 1)..])}",
            "properties" or "items" or "additionalProperties" => null,
            "required" => $"Eksik alan: {string.Join(", ", Missing(rule, value))}",
            "type" => rule?["type"]?.GetValue<string>() switch
            {
                "string" => "Metin olmalı.",
                "array" => "Liste olmalı.",
                "object" => "Nesne olmalı.",
                _ => fallback,
            },
            "const" => $"Değer {rule?["const"]?.ToJsonString()} olmalı.",
            "enum" => $"Şunlardan biri olmalı: {string.Join(", ", rule?["enum"]?.AsArray().Select(v => v?.ToString()) ?? [])}.",
            "minLength" => Limit(rule, keyword) == 1 ? "Boş olamaz." : $"En az {Limit(rule, keyword)} karakter olmalı.",
            "maxLength" => $"En fazla {Limit(rule, keyword)} karakter olabilir.",
            "pattern" => rule?["pattern"]?.GetValue<string>() == @"\S" ? "Yalnızca boşluktan oluşamaz." : "Biçimi geçersiz.",
            "minItems" => $"En az {Limit(rule, keyword)} öğe olmalı.",
            "maxItems" => $"En fazla {Limit(rule, keyword)} öğe olabilir.",
            _ => fallback,
        };

    private static int? Limit(JsonNode? rule, string keyword) => rule?[keyword]?.GetValue<int>();

    private static IEnumerable<string> Missing(JsonNode? rule, JsonNode? value) =>
        (rule?["required"]?.AsArray() ?? [])
            .Select(name => name!.GetValue<string>())
            .Where(name => value is not JsonObject obj || !obj.ContainsKey(name));

    /// <summary>Rules the schema cannot express: tags must be valid once normalized, and the topic must give a slug.</summary>
    private static List<(string Path, string Message)> RuleErrors(JsonObject document)
    {
        var errors = new List<(string, string)>();
        AddTagErrors(errors, document["tags"], "/tags");
        var items = document["items"]!.AsArray();
        for (var i = 0; i < items.Count; i++)
        {
            AddTagErrors(errors, items[i]!["tags"], $"/items/{i}/tags");
        }

        if (ContentKey.Slug(document["topic"]!.GetValue<string>()).Length == 0)
        {
            errors.Add(("/topic", "Konu adı en az bir harf veya rakam içermeli."));
        }

        return errors;
    }

    private static void AddTagErrors(List<(string, string)> errors, JsonNode? tags, string path)
    {
        if (tags is not JsonArray array)
        {
            return;
        }

        for (var i = 0; i < array.Count; i++)
        {
            if (!Tags.IsValid(Tags.Normalize(array[i]!.GetValue<string>())))
            {
                errors.Add(($"{path}/{i}", Tags.InvalidMessage));
            }
        }
    }

    /// <summary>
    /// The schema rule for the value at an instance pointer: <c>properties</c> for object members, <c>items</c> for
    /// array elements. Enough for these schemas, which have no <c>$ref</c> or combinators.
    /// </summary>
    private static JsonNode? RuleFor(JsonNode? rule, string pointer)
    {
        foreach (var segment in pointer.Split('/').Skip(1).Select(Unescape))
        {
            rule = rule?["properties"]?[segment] ?? (int.TryParse(segment, out _) ? rule?["items"] : null);
        }

        return rule;
    }

    /// <summary>The node at a JSON pointer, or null when it does not exist.</summary>
    private static JsonNode? Find(JsonNode? node, string pointer)
    {
        foreach (var segment in pointer.Split('/').Skip(1).Select(Unescape))
        {
            node = node switch
            {
                JsonObject obj => obj[segment],
                JsonArray array when int.TryParse(segment, out var index) && index >= 0 && index < array.Count => array[index],
                _ => null,
            };
        }

        return node;
    }

    private static string Unescape(string segment) => segment.Replace("~1", "/").Replace("~0", "~");
}

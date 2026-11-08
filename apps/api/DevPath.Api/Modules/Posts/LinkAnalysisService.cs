using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Modules.Posts;

public sealed record LinkContextInput(string? Url, string? Title, string? Author, string? Description, string? Note);

/// <summary>Turns the fields of a link into the source of its draft prompt: a link-analysis document checked against its schema. Nothing is stored.</summary>
public static class LinkAnalysisService
{
    private const int MaxTopic = 120;

    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public static DraftContext Build(LinkContextInput input)
    {
        var address = LinkAddress.Parse(input.Url);
        var title = input.Title?.Trim() ?? "";
        var topic = title.Length > MaxTopic ? title[..MaxTopic].TrimEnd() : title;

        var item = new JsonObject
        {
            ["url"] = address?.AbsoluteUri ?? "",
            ["source"] = address is not null && YouTubeLink.VideoId(address) is not null ? LinkReader.SourceYouTube : LinkReader.SourcePage,
            ["title"] = title,
            ["note"] = input.Note?.Trim() ?? "",
        };
        AddOptional(item, "author", input.Author);
        AddOptional(item, "description", input.Description);
        var document = new JsonObject
        {
            ["schemaVersion"] = 1,
            ["type"] = ContentType.LinkAnalysis.Name,
            ["topic"] = topic,
            ["items"] = new JsonArray(item),
        };

        var text = document.ToJsonString(Indented).ReplaceLineEndings("\n");
        var errors = FieldErrors(ImportValidator.Validate(ContentType.LinkAnalysis, text).Errors, address is null);
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        return new DraftContext(topic, text);
    }

    private static void AddOptional(JsonObject item, string name, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            item[name] = value.Trim();
        }
    }

    /// <summary>Schema errors by form field: <c>/items/0/title</c> → <c>title</c>. The topic comes from the title, so it counts as one too.</summary>
    private static Dictionary<string, string[]> FieldErrors(IReadOnlyList<ImportError> errors, bool badAddress)
    {
        var fields = errors
            .GroupBy(error => error.Path.Split('/').Last() switch { "topic" => "title", var name => name })
            .ToDictionary(group => group.Key, group => group.Select(error => error.Message).ToArray());
        if (badAddress)
        {
            fields["url"] = [LinkAddress.Error];
        }

        return fields;
    }
}

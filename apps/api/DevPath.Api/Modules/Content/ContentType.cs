using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Validation;
using Json.Schema;

namespace DevPath.Api.Modules.Content;

/// <summary>
/// One importable content type: its <c>type</c> value, the module folder under content/, the item field that
/// identifies an item when merging, and its JSON Schema (schemas/&lt;name&gt;.schema.json, embedded), built and as raw
/// JSON (<see cref="Definition"/>, read for the limits named in error messages), and the marks a user can set on an item.
/// </summary>
public sealed record ContentType(
    string Name, string Folder, string KeyField, IReadOnlyList<string> Marks, JsonSchema Schema, JsonNode Definition)
{
    /// <summary>A draft, not a topic: its items go to posts.json (see <see cref="ImportService"/>), and Folder and Marks are unused.</summary>
    public const string Post = "post";

    public static readonly IReadOnlyList<ContentType> All =
    [
        Load("vocab", "english", "term", ["known", "repeat"]),
        Load("lesson", "learning", "title", ["done"]),
        Load("interview", "interview", "question", ["practised"]),
        Load(Post, "posts", "title", []),
    ];

    public static ContentType? Find(string? name) => All.FirstOrDefault(type => type.Name == name);

    /// <summary>The type with this name; an unknown name is a validation error on <c>type</c>.</summary>
    public static ContentType Require(string? name) =>
        Find(name) ?? throw new ValidationException(new Dictionary<string, string[]>
        {
            ["type"] = ["Tür vocab, lesson, interview veya post olmalı."],
        });

    private static ContentType Load(string name, string folder, string keyField, IReadOnlyList<string> marks)
    {
        var resource = $"DevPath.Schemas.{name}.schema.json";
        using var stream = typeof(ContentType).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded schema '{resource}' is missing.");
        using var reader = new StreamReader(stream);
        var text = reader.ReadToEnd();
        return new ContentType(name, folder, keyField, marks, JsonSchema.FromText(text), JsonNode.Parse(text)!);
    }
}

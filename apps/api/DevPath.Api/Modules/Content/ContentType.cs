using Json.Schema;

namespace DevPath.Api.Modules.Content;

/// <summary>
/// One importable content type: its <c>type</c> value, the module folder under content/, the item field that
/// identifies an item when merging, and its JSON Schema (schemas/&lt;name&gt;.schema.json, embedded).
/// </summary>
public sealed record ContentType(string Name, string Folder, string KeyField, JsonSchema Schema)
{
    public static readonly IReadOnlyList<ContentType> All =
    [
        Load("vocab", "english", "term"),
        Load("lesson", "learning", "title"),
        Load("interview", "interview", "question"),
    ];

    public static ContentType? Find(string? name) => All.FirstOrDefault(type => type.Name == name);

    private static ContentType Load(string name, string folder, string keyField)
    {
        var resource = $"DevPath.Schemas.{name}.schema.json";
        using var stream = typeof(ContentType).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Embedded schema '{resource}' is missing.");
        using var reader = new StreamReader(stream);
        return new ContentType(name, folder, keyField, JsonSchema.FromText(reader.ReadToEnd()));
    }
}

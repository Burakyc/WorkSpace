using System.Text.Json;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ContentTypeTests
{
    [Theory]
    [InlineData("vocab", "english", "term")]
    [InlineData("lesson", "learning", "title")]
    [InlineData("interview", "interview", "question")]
    public void Each_type_has_its_folder_key_and_schema(string name, string folder, string keyField)
    {
        var type = ContentType.Find(name);

        Assert.NotNull(type);
        Assert.Equal(folder, type.Folder);
        Assert.Equal(keyField, type.KeyField);
        using var empty = JsonDocument.Parse("{}");
        Assert.False(type.Schema.Evaluate(empty.RootElement).IsValid);
    }

    [Theory]
    [InlineData("x")]
    [InlineData("Vocab")]
    [InlineData(null)]
    public void Unknown_types_are_not_found(string? name) => Assert.Null(ContentType.Find(name));
}

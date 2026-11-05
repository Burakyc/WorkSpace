using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Tests.Infrastructure.Storage;

public class DocumentSchemaTests
{
    private const string FilePath = "goals.json";

    private static readonly Migration AddItems = new(0, document =>
    {
        document["items"] = new JsonArray();
        return document;
    });

    private static readonly Migration CountItems = new(1, document =>
    {
        document["count"] = document["items"]!.AsArray().Count;
        return document;
    });

    [Fact]
    public void Missing_version_counts_as_zero_and_is_migrated()
    {
        var schema = new DocumentSchema(1, [AddItems]);

        var (document, changed) = schema.Migrate(new JsonObject { ["title"] = "x" }, FilePath);

        Assert.True(changed);
        Assert.True(JsonNode.DeepEquals(
            JsonNode.Parse("""{ "schemaVersion": 1, "title": "x", "items": [] }"""), document));
        Assert.Equal("schemaVersion", document.First().Key);
    }

    [Fact]
    public void Steps_run_in_order()
    {
        var schema = new DocumentSchema(2, [CountItems, AddItems]);

        var (document, _) = schema.Migrate(new JsonObject(), FilePath);

        Assert.Equal(2, document["schemaVersion"]!.GetValue<int>());
        Assert.Equal(0, document["count"]!.GetValue<int>());
    }

    [Fact]
    public void Current_version_is_returned_unchanged()
    {
        var schema = new DocumentSchema(2, [AddItems, CountItems]);
        var stored = JsonNode.Parse("""{ "schemaVersion": 2, "items": [1] }""")!.AsObject();

        var (document, changed) = schema.Migrate(stored, FilePath);

        Assert.False(changed);
        Assert.Same(stored, document);
    }

    [Fact]
    public void Future_version_is_refused()
    {
        var schema = new DocumentSchema(2, [AddItems, CountItems]);

        var ex = Assert.Throws<UnsupportedSchemaVersionException>(
            () => schema.Migrate(new JsonObject { ["schemaVersion"] = 3 }, FilePath));

        Assert.Equal((FilePath, 3, 2), (ex.FilePath, ex.Version, ex.SupportedVersion));
        Assert.Contains(FilePath, ex.Message);
    }

    [Fact]
    public void Missing_step_is_an_error()
    {
        var schema = new DocumentSchema(2, [AddItems]);

        var ex = Assert.Throws<InvalidOperationException>(
            () => schema.Migrate(new JsonObject { ["schemaVersion"] = 1 }, FilePath));

        Assert.Contains("schemaVersion 1", ex.Message);
    }

    [Theory]
    [InlineData("""{ "schemaVersion": "1" }""")]
    [InlineData("""{ "schemaVersion": 1.5 }""")]
    [InlineData("""{ "schemaVersion": -1 }""")]
    [InlineData("""{ "schemaVersion": null }""")]
    public void Invalid_version_is_an_error(string json)
    {
        var schema = new DocumentSchema(1, [AddItems]);

        var ex = Assert.Throws<InvalidDataException>(
            () => schema.Migrate(JsonNode.Parse(json)!.AsObject(), FilePath));

        Assert.Contains(FilePath, ex.Message);
    }
}

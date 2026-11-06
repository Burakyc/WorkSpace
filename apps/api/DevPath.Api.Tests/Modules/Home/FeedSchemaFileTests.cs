using System.Text.Json.Nodes;
using DevPath.Api.Modules.Home;

namespace DevPath.Api.Tests.Modules.Home;

/// <summary>The agent writes feed.json from schemas/feed.schema.json; the API checks it with FeedValidator. They must agree.</summary>
public class FeedSchemaFileTests
{
    private static JsonNode LoadSchema()
    {
        for (var folder = new DirectoryInfo(AppContext.BaseDirectory); folder is not null; folder = folder.Parent)
        {
            var file = Path.Combine(folder.FullName, "schemas", "feed.schema.json");
            if (File.Exists(file))
            {
                return JsonNode.Parse(File.ReadAllText(file))!;
            }
        }

        throw new FileNotFoundException("schemas/feed.schema.json not found above the test folder.");
    }

    private static string[] Names(JsonNode? array) => array!.AsArray().Select(n => n!.GetValue<string>()).ToArray();

    [Fact]
    public void Schema_file_matches_the_validator()
    {
        var schema = LoadSchema();

        Assert.Equal(FeedValidator.SchemaVersion, schema["properties"]!["schemaVersion"]!["const"]!.GetValue<int>());
        Assert.Equal(FeedValidator.RootRequired, Names(schema["required"]));
        Assert.Equal(FeedValidator.MaxItems, schema["properties"]!["items"]!["maxItems"]!.GetValue<int>());
        Assert.Equal(FeedValidator.ItemRequired, Names(schema["$defs"]!["item"]!["required"]));
        Assert.False(schema["additionalProperties"]!.GetValue<bool>());
        Assert.False(schema["$defs"]!["item"]!["additionalProperties"]!.GetValue<bool>());
    }
}

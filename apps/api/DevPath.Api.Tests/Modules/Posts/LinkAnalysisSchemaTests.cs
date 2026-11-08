using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed partial class LinkAnalysisSchemaTests
{
    [GeneratedRegex("```json\\r?\\n(.*?)```", RegexOptions.Singleline)]
    private static partial Regex JsonBlock();

    private static string Sample(Action<JsonObject>? change = null)
    {
        var item = new JsonObject
        {
            ["url"] = "https://example.com/a",
            ["source"] = "page",
            ["title"] = "A",
            ["note"] = "My view",
        };
        change?.Invoke(item);
        return new JsonObject
        {
            ["schemaVersion"] = 1,
            ["type"] = "link-analysis",
            ["topic"] = "A",
            ["items"] = new JsonArray(item),
        }.ToJsonString();
    }

    [Fact]
    public void The_sample_passes() =>
        Assert.Empty(ImportValidator.Validate(ContentType.LinkAnalysis, Sample()).Errors);

    [Fact]
    public void Each_rule_gives_an_error()
    {
        Action<JsonObject>[] changes =
        [
            item => item.Remove("note"),
            item => item["note"] = " ",
            item => item["url"] = "http://example.com/a",
            item => item["source"] = "podcast",
            item => item["likes"] = 1,
            item => item["title"] = new string('a', 301),
        ];

        foreach (var change in changes)
        {
            Assert.NotEmpty(ImportValidator.Validate(ContentType.LinkAnalysis, Sample(change)).Errors);
        }

        var two = JsonNode.Parse(Sample())!;
        two["items"]!.AsArray().Add(two["items"]![0]!.DeepClone());
        Assert.NotEmpty(ImportValidator.Validate(ContentType.LinkAnalysis, two.ToJsonString()).Errors);
    }

    [Fact]
    public async Task It_is_not_an_import_type()
    {
        Assert.Null(ContentType.Find("link-analysis"));

        await using var factory = new ApiFactory();
        var response = await factory.CreateClient().PostAsJsonAsync("/api/import", new { type = "link-analysis", text = Sample() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public void Both_examples_in_the_template_pass_their_schemas()
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !Directory.Exists(Path.Combine(folder.FullName, "prompts")))
        {
            folder = folder.Parent;
        }

        var template = File.ReadAllText(Path.Combine(folder!.FullName, "prompts", "link-analysis.md"));
        var blocks = JsonBlock().Matches(template);

        Assert.StartsWith("Topic: {{topic}}", template, StringComparison.Ordinal);
        Assert.Equal(2, blocks.Count);
        Assert.Empty(ImportValidator.Validate(ContentType.LinkAnalysis, blocks[0].Groups[1].Value).Errors);
        Assert.Empty(ImportValidator.Validate(ContentType.Find("post")!, blocks[1].Groups[1].Value).Errors);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;
using DevPath.Api.Modules.Posts;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class LinkAnalysisServiceTests
{
    private static LinkContextInput Valid() => new("https://example.com/a", " Title ", "Author", "Description", " My view ");

    [Fact]
    public void Builds_a_document_that_passes_its_schema()
    {
        var context = LinkAnalysisService.Build(Valid());

        Assert.Equal("Title", context.Topic);
        Assert.Empty(ImportValidator.Validate(ContentType.LinkAnalysis, context.Text).Errors);
        Assert.DoesNotContain("\r", context.Text, StringComparison.Ordinal);
        var item = JsonNode.Parse(context.Text)!["items"]![0]!;
        Assert.Equal("page", item["source"]!.GetValue<string>());
        Assert.Equal("Title", item["title"]!.GetValue<string>());
        Assert.Equal("My view", item["note"]!.GetValue<string>());
    }

    [Fact]
    public void Keeps_turkish_letters_readable_for_the_ai()
    {
        var context = LinkAnalysisService.Build(Valid() with { Note = "Çok güzel anlatmış" });

        Assert.Contains("Çok güzel anlatmış", context.Text, StringComparison.Ordinal);
    }

    [Fact]
    public void The_source_comes_from_the_address()
    {
        var context = LinkAnalysisService.Build(Valid() with { Url = "https://www.youtube.com/watch?v=abc123DEF_4" });

        Assert.Equal("youtube", JsonNode.Parse(context.Text)!["items"]![0]!["source"]!.GetValue<string>());
    }

    [Fact]
    public void Empty_optional_fields_are_left_out()
    {
        var context = LinkAnalysisService.Build(Valid() with { Author = " ", Description = null });

        var item = JsonNode.Parse(context.Text)!["items"]![0]!.AsObject();
        Assert.False(item.ContainsKey("author"));
        Assert.False(item.ContainsKey("description"));
    }

    [Fact]
    public void A_long_title_is_cut_for_the_topic()
    {
        var context = LinkAnalysisService.Build(Valid() with { Title = new string('a', 200) });

        Assert.Equal(120, context.Topic.Length);
        Assert.Equal(200, JsonNode.Parse(context.Text)!["items"]![0]!["title"]!.GetValue<string>().Length);
    }

    public static TheoryData<LinkContextInput, string> Invalid => new()
    {
        { Valid() with { Note = " " }, "note" },
        { Valid() with { Note = null }, "note" },
        { Valid() with { Note = new string('a', 2_001) }, "note" },
        { Valid() with { Title = "" }, "title" },
        { Valid() with { Title = new string('a', 301) }, "title" },
        { Valid() with { Author = new string('a', 201) }, "author" },
        { Valid() with { Description = new string('a', 5_001) }, "description" },
        { Valid() with { Url = "http://example.com/" }, "url" },
        { Valid() with { Url = "https://127.0.0.1/" }, "url" },
        { Valid() with { Url = "https://localhost/" }, "url" },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public void Each_problem_is_a_field_error(LinkContextInput input, string field)
    {
        var error = Assert.Throws<ValidationException>(() => LinkAnalysisService.Build(input));

        Assert.Contains(field, error.Errors.Keys);
    }

    [Fact]
    public async Task The_endpoint_answers_the_context_or_a_field_error()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var good = await client.PostAsJsonAsync("/api/posts/link/context", new { url = "https://example.com/a", title = "T", note = "N" });
        var context = JsonDocument.Parse(await good.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("T", context.GetProperty("topic").GetString());
        Assert.Contains("\"link-analysis\"", context.GetProperty("text").GetString(), StringComparison.Ordinal);

        var bad = await client.PostAsJsonAsync("/api/posts/link/context", new { url = "https://example.com/a", title = "T" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.True(JsonDocument.Parse(await bad.Content.ReadAsStringAsync()).RootElement.GetProperty("errors").TryGetProperty("note", out _));
    }
}

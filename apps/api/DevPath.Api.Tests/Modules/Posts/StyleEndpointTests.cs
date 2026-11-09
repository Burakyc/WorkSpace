using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Modules.Posts;

namespace DevPath.Api.Tests.Modules.Posts;

public class StyleEndpointTests
{
    [Fact]
    public async Task Saves_and_reads_the_style_prompt()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var empty = JsonDocument.Parse(await client.GetStringAsync("/api/posts/style")).RootElement;
        Assert.Equal("", empty.GetProperty("text").GetString());
        Assert.Equal(JsonValueKind.Null, empty.GetProperty("updatedAt").ValueKind);

        (await client.PutAsJsonAsync("/api/posts/style", new { text = "one" })).EnsureSuccessStatusCode();
        var saved = await client.PutAsJsonAsync("/api/posts/style", new { text = "two" });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var after = JsonDocument.Parse(await client.GetStringAsync("/api/posts/style")).RootElement;
        Assert.Equal("two", after.GetProperty("text").GetString());
        Assert.Equal("one", after.GetProperty("history")[0].GetProperty("text").GetString());
        Assert.NotEqual(JsonValueKind.Null, after.GetProperty("history")[0].GetProperty("savedAt").ValueKind);
    }

    [Theory]
    [InlineData("style-example-en.md")]
    [InlineData("style-example-tr.md")]
    public void Each_example_fits_the_limit(string name)
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !Directory.Exists(Path.Combine(folder.FullName, "prompts")))
        {
            folder = folder.Parent;
        }

        var text = File.ReadAllText(Path.Combine(folder!.FullName, "prompts", name));

        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.True(text.TrimEnd().Length <= StyleService.MaxLength);
    }

    [Fact]
    public async Task A_too_long_text_returns_a_text_error()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PutAsJsonAsync("/api/posts/style", new { text = new string('a', 5_001) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.Equal("Stil promptu en fazla 5.000 karakter olabilir.", errors.GetProperty("text")[0].GetString());
    }
}

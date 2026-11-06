using System.Net;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Home;

public class HomeEndpointTests
{
    [Fact]
    public async Task Feed_returns_status_items_and_errors_in_camel_case()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var missing = JsonDocument.Parse(await client.GetStringAsync("/api/home/feed")).RootElement;
        Assert.Equal("missing", missing.GetProperty("status").GetString());

        await File.WriteAllTextAsync(Path.Combine(factory.DataDir, "feed.json"), """
            { "schemaVersion": 1, "generatedAt": "2026-11-06T07:00:00Z",
              "items": [{ "title": "T", "summary": "S", "url": "https://x.com/1", "source": "dotnet" }] }
            """);
        var ok = JsonDocument.Parse(await client.GetStringAsync("/api/home/feed")).RootElement;

        Assert.Equal("ok", ok.GetProperty("status").GetString());
        var item = ok.GetProperty("items")[0];
        Assert.Equal("T", item.GetProperty("title").GetString());
        Assert.Equal("https://x.com/1", item.GetProperty("url").GetString());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("publishedAt").ValueKind);
        Assert.Equal(0, ok.GetProperty("errors").GetArrayLength());
    }

    [Fact]
    public async Task Visit_answers_the_changes_and_refuses_an_unknown_zone()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/home/visit?timeZone=Europe/Istanbul", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var changes = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(JsonValueKind.Null, changes.GetProperty("since").ValueKind);
        Assert.Equal(0, changes.GetProperty("streakDays").GetInt32());
        Assert.True(changes.TryGetProperty("newVideos", out _));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/home/visit?timeZone=Mars", null)).StatusCode);
    }
}

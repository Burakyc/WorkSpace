using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ContentEndpointTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task Lists_gets_and_marks()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/import", new { type = "vocab", text = ImportSamples.Vocab(terms: ["a", "b"]) });

        var list = await Json(await client.GetAsync("/api/content/vocab"));
        var slug = list[0].GetProperty("slug").GetString()!;
        var topic = await Json(await client.GetAsync($"/api/content/vocab/{slug}"));
        var id = topic.GetProperty("items")[0].GetProperty("id").GetString()!;
        var marked = await client.PutAsJsonAsync($"/api/content/vocab/{slug}/items/{id}/mark", new { mark = "repeat" });

        Assert.Equal(2, list[0].GetProperty("itemCount").GetInt32());
        Assert.Equal("Phrasal verbs for meetings", topic.GetProperty("topic").GetString());
        Assert.Equal(HttpStatusCode.OK, marked.StatusCode);
        Assert.Equal("repeat", (await Json(marked)).GetProperty("mark").GetString());
        var after = await Json(await client.GetAsync("/api/content/vocab"));
        Assert.Equal(1, after[0].GetProperty("marks").GetProperty("repeat").GetInt32());
    }

    [Fact]
    public async Task Unknown_topics_items_marks_and_types_are_refused()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/import", new { type = "vocab", text = ImportSamples.Vocab() });
        const string slug = "phrasal-verbs-for-meetings";

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/content/vocab/missing")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/content/vocab/{slug}/items/x/mark", new { mark = "known" })).StatusCode);
        var badMark = await client.PutAsJsonAsync($"/api/content/vocab/{slug}/items/x/mark", new { mark = "done" });
        Assert.Equal(HttpStatusCode.BadRequest, badMark.StatusCode);
        Assert.True((await Json(badMark)).GetProperty("errors").TryGetProperty("mark", out _));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/content/x")).StatusCode);
        Assert.Equal(0, (await Json(await client.GetAsync("/api/content/interview"))).GetArrayLength());
    }
}

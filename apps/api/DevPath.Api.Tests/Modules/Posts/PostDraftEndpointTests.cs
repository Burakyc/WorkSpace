using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Tests.Modules.Content;

namespace DevPath.Api.Tests.Modules.Posts;

public class PostDraftEndpointTests
{
    [Fact]
    public async Task An_imported_draft_can_be_listed_edited_and_deleted()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        Assert.Equal(0, JsonDocument.Parse(await client.GetStringAsync("/api/posts/drafts")).RootElement.GetArrayLength());

        var import = await client.PostAsJsonAsync("/api/import", new { type = "post", text = ImportSamples.Post() });
        var report = JsonDocument.Parse(await import.Content.ReadAsStringAsync()).RootElement.GetProperty("report");
        Assert.Equal(1, report.GetProperty("added").GetInt32());

        var draft = JsonDocument.Parse(await client.GetStringAsync("/api/posts/drafts")).RootElement[0];
        var id = draft.GetProperty("id").GetString();
        Assert.Equal("aspnetcore", draft.GetProperty("hashtags")[0].GetString());

        var edited = await client.PutAsJsonAsync($"/api/posts/drafts/{id}", new { title = "T", body = "B", hashtags = new[] { "x" }, sourceLink = (string?)null, imageSuggestion = (string?)null });
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var saved = JsonDocument.Parse(await edited.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("T", saved.GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, saved.GetProperty("sourceLink").ValueKind);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/posts/drafts/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/posts/drafts/{id}")).StatusCode);
    }

    [Fact]
    public async Task A_bad_edit_is_a_validation_problem_and_an_unknown_id_is_not_found()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var bad = await client.PutAsJsonAsync("/api/posts/drafts/x", new { title = "", body = "B" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.True(JsonDocument.Parse(await bad.Content.ReadAsStringAsync()).RootElement.GetProperty("errors").TryGetProperty("title", out _));

        var unknown = await client.PutAsJsonAsync("/api/posts/drafts/x", new { title = "T", body = "B" });
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }
}

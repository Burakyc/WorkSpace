using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Notes;

public class NotesEndpointTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task Creates_lists_renames_moves_shifts_and_deletes()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var folderResponse = await client.PostAsJsonAsync("/api/notes", new { parentId = (string?)null, kind = "folder", title = "ASP.NET" });
        Assert.Equal(HttpStatusCode.Created, folderResponse.StatusCode);
        var folderId = (await Json(folderResponse)).GetProperty("id").GetString()!;
        var page = await Json(await client.PostAsJsonAsync("/api/notes", new { parentId = (string?)null, kind = "page", title = "DI" }));
        var pageId = page.GetProperty("id").GetString()!;
        Assert.Equal("page", page.GetProperty("kind").GetString());
        await client.PostAsJsonAsync("/api/notes", new { parentId = folderId, kind = "page", title = "Middleware" });

        var renamed = await Json(await client.PutAsJsonAsync($"/api/notes/{pageId}", new { title = "Dependency injection" }));
        Assert.Equal("Dependency injection", renamed.GetProperty("title").GetString());

        var moved = await Json(await client.PostAsJsonAsync($"/api/notes/{pageId}/move", new { parentId = folderId }));
        Assert.Equal(folderId, moved.GetProperty("parentId").GetString());
        Assert.Equal(1, moved.GetProperty("order").GetInt32());

        var shifted = await Json(await client.PostAsJsonAsync($"/api/notes/{pageId}/shift", new { offset = -1 }));
        Assert.Equal(0, shifted.GetProperty("order").GetInt32());

        var list = await Json(await client.GetAsync("/api/notes"));
        Assert.Equal(["ASP.NET", "Dependency injection", "Middleware"], list.EnumerateArray().Select(n => n.GetProperty("title").GetString()));

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/notes/{folderId}")).StatusCode);
        Assert.Equal(0, (await Json(await client.GetAsync("/api/notes"))).GetArrayLength());
    }

    [Fact]
    public async Task Bad_input_and_unknown_ids_are_rejected()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var bad = await client.PostAsJsonAsync("/api/notes", new { kind = "page", title = " " });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.True((await Json(bad)).GetProperty("errors").TryGetProperty("title", out _));

        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync("/api/notes/missing", new { title = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/notes/missing/move", new { parentId = (string?)null })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/notes/missing/shift", new { offset = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/notes/missing")).StatusCode);
    }

    [Fact]
    public async Task Saves_and_reads_page_content()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var pageId = (await Json(await client.PostAsJsonAsync("/api/notes", new { kind = "page", title = "DI" }))).GetProperty("id").GetString();
        var folderId = (await Json(await client.PostAsJsonAsync("/api/notes", new { kind = "folder", title = "F" }))).GetProperty("id").GetString();

        var saved = await client.PutAsJsonAsync($"/api/notes/{pageId}/content", new { blocks = new[] { new { id = "a", type = "paragraph" } } });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var content = await Json(await client.GetAsync($"/api/notes/{pageId}/content"));
        Assert.Equal("paragraph", content.GetProperty("blocks")[0].GetProperty("type").GetString());

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/notes/missing/content")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/notes/{folderId}/content")).StatusCode);
    }

    [Fact]
    public async Task Searches_pages()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var folderId = (await Json(await client.PostAsJsonAsync("/api/notes", new { kind = "folder", title = "ASP.NET" }))).GetProperty("id").GetString();
        var pageId = (await Json(await client.PostAsJsonAsync("/api/notes", new { parentId = folderId, kind = "page", title = "DI" }))).GetProperty("id").GetString();
        await client.PutAsJsonAsync($"/api/notes/{pageId}/content", new
        {
            blocks = new[] { new { type = "paragraph", content = new[] { new { type = "text", text = "Ömür boyu servis" } } } },
        });

        var results = await Json(await client.GetAsync("/api/notes/search?q=omur"));

        var result = results[0];
        Assert.Equal(pageId, result.GetProperty("id").GetString());
        Assert.Equal("ASP.NET", result.GetProperty("path")[0].GetString());
        Assert.Equal("Ömür boyu servis", result.GetProperty("snippet").GetString());
        Assert.Equal(0, result.GetProperty("highlights")[0].GetProperty("start").GetInt32());
        Assert.Equal(4, result.GetProperty("highlights")[0].GetProperty("length").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/notes/search?q=a")).StatusCode);
    }
}

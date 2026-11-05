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
}

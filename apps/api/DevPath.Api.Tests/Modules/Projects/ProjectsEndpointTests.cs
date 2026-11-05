using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Projects;

/// <summary>Each test gets its own factory, so it starts with an empty data folder.</summary>
public class ProjectsEndpointTests
{
    [Fact]
    public async Task Create_returns_201_with_location_and_camel_case_body()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var goalId = await CreateGoal(client);

        var response = await client.PostAsJsonAsync("/api/projects", new { goalId, title = "Todo API", url = "https://github.com/x" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.Equal($"/api/projects/{body.GetProperty("id").GetString()}", response.Headers.Location?.OriginalString);
        Assert.Equal(goalId, body.GetProperty("goalId").GetString());
        Assert.Equal("https://github.com/x", body.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Unknown_goal_is_a_validation_problem()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/projects", new { goalId = "missing", title = "Todo API" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Hedef bulunamadı.", (await Json(response)).GetProperty("errors").GetProperty("goalId")[0].GetString());
    }

    [Fact]
    public async Task Update_archive_and_restore_return_200_or_404()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await CreateProject(client, await CreateGoal(client));

        var updated = await client.PutAsJsonAsync($"/api/projects/{id}", new { title = "New" });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        Assert.Equal("New", (await Json(updated)).GetProperty("title").GetString());

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/projects/{id}/archive", null)).StatusCode);
        Assert.Equal("[]", await client.GetStringAsync("/api/projects"));
        Assert.Equal(1, JsonDocument.Parse(await client.GetStringAsync("/api/projects?includeArchived=true")).RootElement.GetArrayLength());
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/projects/{id}/restore", null)).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync("/api/projects/missing", new { title = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/projects/missing/archive", null)).StatusCode);
    }

    [Fact]
    public async Task Goal_id_in_an_update_body_is_ignored()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var goalId = await CreateGoal(client);
        var otherGoalId = await CreateGoal(client);
        var id = await CreateProject(client, goalId);

        var updated = await client.PutAsJsonAsync($"/api/projects/{id}", new { goalId = otherGoalId, title = "Moved?" });

        Assert.Equal(goalId, (await Json(updated)).GetProperty("goalId").GetString());
    }

    private static async Task<string> CreateGoal(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/goals", new { title = "Learn ASP.NET Core" });
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    private static async Task<string> CreateProject(HttpClient client, string goalId)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new { goalId, title = "Todo API" });
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}

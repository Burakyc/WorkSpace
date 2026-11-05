using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Infrastructure.Security;

namespace DevPath.Api.Tests.Modules.Goals;

/// <summary>Each test gets its own factory, so it starts with an empty data folder.</summary>
public class GoalsEndpointTests
{
    [Fact]
    public async Task List_is_empty_on_a_new_data_folder()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/goals");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("[]", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Create_returns_201_with_location_and_camel_case_body()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/goals", new { title = "Learn DI", targetPomodoros = 20 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        var id = body.GetProperty("id").GetString();
        Assert.Equal($"/api/goals/{id}", response.Headers.Location?.OriginalString);
        Assert.Equal("Learn DI", body.GetProperty("title").GetString());
        Assert.Equal(20, body.GetProperty("targetPomodoros").GetInt32());
        Assert.False(body.GetProperty("archived").GetBoolean());
    }

    [Fact]
    public async Task Create_with_invalid_input_returns_a_validation_problem()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/goals", new { title = " " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var errors = (await Json(response)).GetProperty("errors");
        Assert.Equal("Başlık gerekli.", errors.GetProperty("title")[0].GetString());
    }

    [Fact]
    public async Task Update_changes_a_goal_or_returns_404()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await CreateGoal(client, "Old");

        var updated = await client.PutAsJsonAsync($"/api/goals/{id}", new { title = "New" });
        var missing = await client.PutAsJsonAsync("/api/goals/missing", new { title = "New" });

        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        Assert.Equal("New", (await Json(updated)).GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Archive_hides_and_restore_shows_a_goal()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await CreateGoal(client, "G");

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/goals/{id}/archive", null)).StatusCode);
        Assert.Equal("[]", await client.GetStringAsync("/api/goals"));
        var withArchived = JsonDocument.Parse(await client.GetStringAsync("/api/goals?includeArchived=true")).RootElement;
        Assert.True(withArchived[0].GetProperty("archived").GetBoolean());

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/goals/{id}/restore", null)).StatusCode);
        Assert.Equal(id, JsonDocument.Parse(await client.GetStringAsync("/api/goals")).RootElement[0].GetProperty("id").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/goals/missing/archive", null)).StatusCode);
    }

    [Fact]
    public async Task Goals_need_the_token()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(ApiTokenMiddleware.HeaderName);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/goals")).StatusCode);
    }

    private static async Task<string> CreateGoal(HttpClient client, string title)
    {
        var response = await client.PostAsJsonAsync("/api/goals", new { title });
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}

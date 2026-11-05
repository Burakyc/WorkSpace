using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Pomodoro;

/// <summary>Each test gets its own factory, so it starts with an empty data folder.</summary>
public class SessionsEndpointTests
{
    private static object SessionBody(string goalId, bool completed = true) => new
    {
        goalId,
        startedAt = DateTimeOffset.UtcNow.AddMinutes(-25),
        endedAt = DateTimeOffset.UtcNow,
        durationMinutes = 25,
        completed,
        note = "DI scopes",
    };

    [Fact]
    public async Task Create_returns_201_with_location_and_camel_case_body()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var goalId = await CreateGoal(client);

        var response = await client.PostAsJsonAsync("/api/sessions", SessionBody(goalId));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.Equal($"/api/sessions/{body.GetProperty("id").GetString()}", response.Headers.Location?.OriginalString);
        Assert.Equal(goalId, body.GetProperty("goalId").GetString());
        Assert.Equal(0, body.GetProperty("tags").GetArrayLength());
        Assert.Equal(25, body.GetProperty("durationMinutes").GetInt32());
    }

    [Fact]
    public async Task Unknown_goal_is_a_validation_problem()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/sessions", SessionBody("missing"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Hedef bulunamadı.", (await Json(response)).GetProperty("errors").GetProperty("goalId")[0].GetString());
    }

    [Fact]
    public async Task Completed_sessions_show_in_the_progress()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var goalId = await CreateGoal(client);

        await client.PostAsJsonAsync("/api/sessions", SessionBody(goalId));
        await client.PostAsJsonAsync("/api/sessions", SessionBody(goalId, completed: false));

        var progress = JsonDocument.Parse(await client.GetStringAsync("/api/goals/progress")).RootElement[0];
        Assert.Equal(1, progress.GetProperty("completedSessions").GetInt32());
        Assert.Equal(5, progress.GetProperty("percent").GetInt32());
    }

    private static async Task<string> CreateGoal(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/goals", new { title = "Learn ASP.NET Core", targetPomodoros = 20 });
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}

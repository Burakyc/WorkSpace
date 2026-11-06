using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.System;

public class DevEndpointTests
{
    [Fact]
    public async Task Get_returns_errors_and_file_sizes()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await client.PutAsJsonAsync("/api/settings/pomodoro", new { focusMinutes = 50, shortBreakMinutes = 10, longBreakMinutes = 20, longBreakInterval = 3 });

        var root = JsonDocument.Parse(await client.GetStringAsync("/api/dev")).RootElement;

        Assert.Equal(JsonValueKind.Array, root.GetProperty("errors").ValueKind);
        var settings = root.GetProperty("files").EnumerateArray().Single(f => f.GetProperty("name").GetString() == "settings.json");
        Assert.False(settings.GetProperty("folder").GetBoolean());
        var bytes = settings.GetProperty("bytes").GetInt64();
        Assert.Equal(new FileInfo(Path.Combine(factory.DataDir, "settings.json")).Length, bytes);
        Assert.True(root.GetProperty("totalBytes").GetInt64() >= bytes);
    }

    [Fact]
    public async Task Needs_the_token()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove("X-DevPath-Token");

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/dev")).StatusCode);
    }
}

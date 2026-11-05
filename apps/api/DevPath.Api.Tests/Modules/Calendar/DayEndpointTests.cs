using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Calendar;

public class DayEndpointTests
{
    [Fact]
    public async Task Returns_an_empty_day_and_saves_its_log()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var empty = JsonDocument.Parse(await client.GetStringAsync("/api/days/2026-11-05?timeZone=UTC")).RootElement;
        Assert.Equal("2026-11-05", empty.GetProperty("date").GetString());
        Assert.Equal(0, empty.GetProperty("completedSessions").GetInt32());
        Assert.Equal(0, empty.GetProperty("sessions").GetArrayLength());
        Assert.Equal(0, empty.GetProperty("goals").GetArrayLength());
        Assert.Equal("", empty.GetProperty("log").GetString());

        var saved = await client.PutAsJsonAsync("/api/days/2026-11-05/log", new { text = "Read the DI chapter." });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal("Read the DI chapter.", JsonDocument.Parse(await saved.Content.ReadAsStringAsync()).RootElement.GetProperty("text").GetString());

        var after = JsonDocument.Parse(await client.GetStringAsync("/api/days/2026-11-05?timeZone=Europe%2FIstanbul")).RootElement;
        Assert.Equal("Read the DI chapter.", after.GetProperty("log").GetString());
    }

    [Theory]
    [InlineData("/api/days/2026-02-30?timeZone=UTC", "date")]
    [InlineData("/api/days/2026-11-05", "timeZone")]
    public async Task Bad_input_returns_a_validation_problem(string url, string field)
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors").TryGetProperty(field, out _));
    }

    [Fact]
    public async Task A_too_long_log_returns_a_text_error()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PutAsJsonAsync("/api/days/2026-11-05/log", new { text = new string('a', 10_001) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.Equal("Günlük en fazla 10.000 karakter olabilir.", errors.GetProperty("text")[0].GetString());
    }
}

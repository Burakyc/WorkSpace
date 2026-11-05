using System.Net;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Calendar;

public class CalendarEndpointTests
{
    [Fact]
    public async Task Returns_the_visible_grid_with_zero_counts_on_a_new_folder()
    {
        await using var factory = new ApiFactory();

        var body = JsonDocument.Parse(await factory.CreateClient().GetStringAsync("/api/calendar?month=2026-11&timeZone=Europe%2FIstanbul")).RootElement;

        Assert.Equal("2026-11", body.GetProperty("month").GetString());
        Assert.Equal("Europe/Istanbul", body.GetProperty("timeZone").GetString());
        var days = body.GetProperty("days");
        Assert.Equal(42, days.GetArrayLength());
        Assert.Equal("2026-10-26", days[0].GetProperty("date").GetString());
        Assert.Equal("2026-12-06", days[41].GetProperty("date").GetString());
        Assert.All(days.EnumerateArray(), day => Assert.Equal(0, day.GetProperty("completedSessions").GetInt32()));
        Assert.Equal(0, days[0].GetProperty("totalMinutes").GetInt32());
    }

    [Theory]
    [InlineData("/api/calendar?month=2026-13&timeZone=UTC", "month")]
    [InlineData("/api/calendar?month=2026-11", "timeZone")]
    public async Task Bad_input_returns_a_validation_problem(string url, string field)
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.True(errors.TryGetProperty(field, out _));
    }
}

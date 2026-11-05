using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Settings;

public class SettingsEndpointTests
{
    [Fact]
    public async Task Get_returns_defaults_and_put_saves()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var defaults = JsonDocument.Parse(await client.GetStringAsync("/api/settings")).RootElement.GetProperty("pomodoro");
        Assert.Equal(25, defaults.GetProperty("focusMinutes").GetInt32());
        Assert.Equal(4, defaults.GetProperty("longBreakInterval").GetInt32());

        var saved = await client.PutAsJsonAsync("/api/settings/pomodoro", new { focusMinutes = 50, shortBreakMinutes = 10, longBreakMinutes = 20, longBreakInterval = 3 });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var after = JsonDocument.Parse(await client.GetStringAsync("/api/settings")).RootElement.GetProperty("pomodoro");
        Assert.Equal(50, after.GetProperty("focusMinutes").GetInt32());
    }

    [Fact]
    public async Task Invalid_values_return_field_errors()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PutAsJsonAsync("/api/settings/pomodoro", new { focusMinutes = 0, shortBreakMinutes = 5, longBreakMinutes = 15, longBreakInterval = 4 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.Equal("Odak süresi 1 ile 120 dakika arasında olmalı.", errors.GetProperty("focusMinutes")[0].GetString());
    }
}

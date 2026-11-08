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

    [Fact]
    public async Task Put_ai_mode_saves_and_refuses_what_is_not_available()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var saved = await client.PutAsJsonAsync("/api/settings/ai-modes/english", new { mode = "copyPaste" });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var modes = JsonDocument.Parse(await saved.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("copyPaste", modes.GetProperty("interview").GetString());

        var module = await client.PutAsJsonAsync("/api/settings/ai-modes/calendar", new { mode = "copyPaste" });
        Assert.Equal(HttpStatusCode.BadRequest, module.StatusCode);
        Assert.Contains("module", await module.Content.ReadAsStringAsync());

        foreach (var mode in new[] { "x", "file", "api" })
        {
            var bad = await client.PutAsJsonAsync("/api/settings/ai-modes/english", new { mode });
            Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
            var errors = JsonDocument.Parse(await bad.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
            Assert.Equal("Bu mod kullanılamıyor.", errors.GetProperty("mode")[0].GetString());
        }
    }

    [Fact]
    public async Task Put_reminders_saves_and_get_returns_them()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var defaults = JsonDocument.Parse(await client.GetStringAsync("/api/settings")).RootElement.GetProperty("reminders");
        Assert.Equal("09:00", defaults.GetProperty("english").GetProperty("time").GetString());

        var saved = await client.PutAsJsonAsync("/api/settings/reminders", new
        {
            english = new { time = "08:30", enabled = false },
            tech = new { time = "21:00", enabled = true },
        });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var after = JsonDocument.Parse(await client.GetStringAsync("/api/settings")).RootElement.GetProperty("reminders");
        Assert.False(after.GetProperty("english").GetProperty("enabled").GetBoolean());
        Assert.Equal("21:00", after.GetProperty("tech").GetProperty("time").GetString());

        var bad = await client.PutAsJsonAsync("/api/settings/reminders", new
        {
            english = new { time = "24:00", enabled = true },
            tech = new { time = "21:00", enabled = true },
        });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        var errors = JsonDocument.Parse(await bad.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.True(errors.TryGetProperty("english", out _));
    }
}

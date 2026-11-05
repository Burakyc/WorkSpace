using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Settings;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Settings;

public sealed class SettingsServiceTests : IDisposable
{
    private readonly TempFolder _folder = new();
    private readonly SettingsService _settings;

    public SettingsServiceTests()
    {
        _settings = new SettingsService(new JsonFileStore(new DataDirectory(_folder.Path)));
    }

    public void Dispose() => _folder.Dispose();

    private string SettingsFile => _folder.File(SettingsService.FileName);

    [Fact]
    public async Task Defaults_without_a_file()
    {
        var settings = await _settings.GetAsync(CancellationToken.None);

        Assert.Equal(new PomodoroSettings(25, 5, 15, 4), settings.Pomodoro);
        Assert.False(File.Exists(SettingsFile));
    }

    [Fact]
    public async Task Saves_the_pomodoro_section_and_keeps_others()
    {
        await File.WriteAllTextAsync(SettingsFile, """{ "schemaVersion": 1, "reminders": { "english": "09:00" } }""");

        var saved = await _settings.SavePomodoroAsync(new PomodoroSettingsInput(50, 10, 20, 3), CancellationToken.None);

        Assert.Equal(new PomodoroSettings(50, 10, 20, 3), saved);
        Assert.Equal(saved, (await _settings.GetAsync(CancellationToken.None)).Pomodoro);
        var file = JsonNode.Parse(await File.ReadAllTextAsync(SettingsFile))!;
        Assert.Equal(1, file["schemaVersion"]!.GetValue<int>());
        Assert.Equal(50, file["pomodoro"]!["focusMinutes"]!.GetValue<int>());
        Assert.Equal("09:00", file["reminders"]!["english"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(0, 5, 15, 4, "focusMinutes")]
    [InlineData(121, 5, 15, 4, "focusMinutes")]
    [InlineData(25, 0, 15, 4, "shortBreakMinutes")]
    [InlineData(25, 61, 15, 4, "shortBreakMinutes")]
    [InlineData(25, 5, 0, 4, "longBreakMinutes")]
    [InlineData(25, 5, 61, 4, "longBreakMinutes")]
    [InlineData(25, 5, 15, 1, "longBreakInterval")]
    [InlineData(25, 5, 15, 11, "longBreakInterval")]
    public async Task Rejects_values_out_of_range(int focus, int shortBreak, int longBreak, int interval, string field)
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _settings.SavePomodoroAsync(new PomodoroSettingsInput(focus, shortBreak, longBreak, interval), CancellationToken.None));

        Assert.Equal([field], ex.Errors.Keys);
        Assert.False(File.Exists(SettingsFile));
    }

    [Fact]
    public async Task Missing_values_are_errors()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _settings.SavePomodoroAsync(new PomodoroSettingsInput(null, null, null, null), CancellationToken.None));

        Assert.Equal(4, ex.Errors.Count);
    }
}

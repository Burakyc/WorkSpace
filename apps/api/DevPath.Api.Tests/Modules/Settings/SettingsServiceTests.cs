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

    [Theory]
    [InlineData(null)]
    [InlineData("""{ "schemaVersion": 1 }""")]
    [InlineData("""{ "schemaVersion": 1, "aiModes": "api" }""")]
    [InlineData("""{ "schemaVersion": 1, "aiModes": { "english": "x", "learning": 7 } }""")]
    public async Task Ai_modes_default_to_copy_paste(string? file)
    {
        if (file is not null) await File.WriteAllTextAsync(SettingsFile, file);

        var settings = await _settings.GetAsync(CancellationToken.None);

        Assert.Equal(["english", "interview", "learning", "posts"], settings.AiModes.Keys.Order());
        Assert.All(settings.AiModes.Values, mode => Assert.Equal(AiModes.CopyPaste, mode));
    }

    [Fact]
    public async Task Saving_an_ai_mode_keeps_the_other_sections()
    {
        await _settings.SavePomodoroAsync(new PomodoroSettingsInput(50, 10, 20, 3), CancellationToken.None);

        var modes = await _settings.SaveAiModeAsync("english", AiModes.CopyPaste, CancellationToken.None);

        Assert.Equal(AiModes.Modules.Count, modes.Count);
        var read = await _settings.GetAsync(CancellationToken.None);
        Assert.Equal(50, read.Pomodoro.FocusMinutes);
        var saved = JsonNode.Parse(await File.ReadAllTextAsync(SettingsFile))!;
        Assert.Equal(AiModes.CopyPaste, saved["aiModes"]!["english"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("""{ "schemaVersion": 1, "aiInbox": 3 }""")]
    [InlineData("""{ "schemaVersion": 1, "aiInbox": { "english": 7, "learning": "" } }""")]
    public async Task Inbox_folders_default_to_none(string? file)
    {
        if (file is not null) await File.WriteAllTextAsync(SettingsFile, file);

        var settings = await _settings.GetAsync(CancellationToken.None);

        Assert.Equal(AiModes.Modules.Count, settings.AiInbox.Count);
        Assert.All(settings.AiInbox.Values, Assert.Null);
    }

    [Fact]
    public async Task Saves_and_clears_an_inbox_folder_and_keeps_the_rest()
    {
        using var inbox = new TempFolder();
        await _settings.SaveAiModeAsync("interview", AiModes.CopyPaste, CancellationToken.None);

        var saved = await _settings.SaveAiInboxAsync("english", inbox.Path + Path.DirectorySeparatorChar, CancellationToken.None);

        Assert.Equal(inbox.Path, saved["english"]);
        Assert.Null(saved["learning"]);
        Assert.Equal(inbox.Path, (await _settings.GetAsync(CancellationToken.None)).AiInbox["english"]);
        Assert.Equal(AiModes.CopyPaste, (await _settings.GetAsync(CancellationToken.None)).AiModes["interview"]);

        var cleared = await _settings.SaveAiInboxAsync("english", " ", CancellationToken.None);

        Assert.Null(cleared["english"]);
    }

    [Theory]
    [InlineData("relative\\folder")]
    [InlineData("C:\\devpath-no-such-folder-at-all")]
    public async Task A_missing_inbox_folder_is_refused(string folder)
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => _settings.SaveAiInboxAsync("english", folder, CancellationToken.None));

        Assert.Equal("Klasör bulunamadı.", error.Errors["folder"][0]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("""{ "schemaVersion": 1, "aiProvider": "openai" }""")]
    [InlineData("""{ "schemaVersion": 1, "aiProvider": 3 }""")]
    public async Task The_ai_provider_defaults_to_claude(string? file)
    {
        if (file is not null) await File.WriteAllTextAsync(SettingsFile, file);

        Assert.Equal("claude", (await _settings.GetAsync(CancellationToken.None)).AiProvider);
    }

    [Fact]
    public async Task Saves_the_ai_provider_and_keeps_the_rest()
    {
        await _settings.SavePomodoroAsync(new PomodoroSettingsInput(50, 10, 20, 3), CancellationToken.None);

        await _settings.SaveAiProviderAsync("gemini", CancellationToken.None);

        var read = await _settings.GetAsync(CancellationToken.None);
        Assert.Equal("gemini", read.AiProvider);
        Assert.Equal(50, read.Pomodoro.FocusMinutes);
    }

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

    private static readonly ReminderSettings DefaultReminders = new(new Reminder("09:00", true), new Reminder("20:00", true));

    [Theory]
    [InlineData(null)]
    [InlineData("""{ "schemaVersion": 1, "reminders": { "english": "09:00" } }""")]
    [InlineData("""{ "schemaVersion": 1, "reminders": { "english": { "time": "25:00", "enabled": true }, "tech": { "time": 7 } } }""")]
    public async Task Reminders_default_without_a_valid_section(string? file)
    {
        if (file is not null) await File.WriteAllTextAsync(SettingsFile, file);

        var settings = await _settings.GetAsync(CancellationToken.None);

        Assert.Equal(DefaultReminders, settings.Reminders);
    }

    [Fact]
    public async Task Saves_the_reminders_and_keeps_the_pomodoro_section()
    {
        await _settings.SavePomodoroAsync(new PomodoroSettingsInput(50, 10, 20, 3), CancellationToken.None);

        var saved = await _settings.SaveRemindersAsync(
            new ReminderSettingsInput(new ReminderInput("08:30", false), new ReminderInput("21:05", true)), CancellationToken.None);

        var expected = new ReminderSettings(new Reminder("08:30", false), new Reminder("21:05", true));
        Assert.Equal(expected, saved);
        var read = await _settings.GetAsync(CancellationToken.None);
        Assert.Equal(expected, read.Reminders);
        Assert.Equal(50, read.Pomodoro.FocusMinutes);
    }

    [Theory]
    [InlineData("24:00", "english")]
    [InlineData("9:00", "english")]
    [InlineData("ab:cd", "english")]
    [InlineData("", "english")]
    [InlineData(null, "english")]
    public async Task Rejects_invalid_reminder_times(string? time, string field)
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() => _settings.SaveRemindersAsync(
            new ReminderSettingsInput(new ReminderInput(time, true), new ReminderInput("20:00", true)), CancellationToken.None));

        Assert.Equal([field], ex.Errors.Keys);
        Assert.False(File.Exists(SettingsFile));
    }

    [Fact]
    public async Task Rejects_missing_reminders_and_fields()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() => _settings.SaveRemindersAsync(
            new ReminderSettingsInput(new ReminderInput("09:00", null), null), CancellationToken.None));

        Assert.Equal(["english", "tech"], ex.Errors.Keys.Order());
        Assert.Equal("Saat SS:DD biçiminde olmalı (00:00–23:59).", ex.Errors["tech"][0]);
    }
}

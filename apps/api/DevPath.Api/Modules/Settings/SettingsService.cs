using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Settings;

/// <summary>
/// settings.json is one document with a section per area ({ "schemaVersion": 1, "pomodoro": { … } }),
/// so it is read and written through <see cref="JsonFileStore"/> directly, not a repository.
/// </summary>
public sealed class SettingsService(JsonFileStore store)
{
    public const string FileName = "settings.json";
    private const string PomodoroSection = "pomodoro";
    private const string RemindersSection = "reminders";
    private const string TimeMessage = "Saat SS:DD biçiminde olmalı (00:00–23:59).";

    public static readonly DocumentSchema Schema = new(1, []);

    /// <summary>The saved settings; a missing file, section or unreadable section gives the defaults.</summary>
    public async Task<AppSettings> GetAsync(CancellationToken cancellationToken)
    {
        var document = await store.ReadAsync(FileName, Schema, cancellationToken);
        return new AppSettings(ReadPomodoro(document), ReadReminders(document));
    }

    public async Task<PomodoroSettings> SavePomodoroAsync(PomodoroSettingsInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        Check(errors, "focusMinutes", input.FocusMinutes, 1, 120, "Odak süresi 1 ile 120 dakika arasında olmalı.");
        Check(errors, "shortBreakMinutes", input.ShortBreakMinutes, 1, 60, "Kısa mola 1 ile 60 dakika arasında olmalı.");
        Check(errors, "longBreakMinutes", input.LongBreakMinutes, 1, 60, "Uzun mola 1 ile 60 dakika arasında olmalı.");
        Check(errors, "longBreakInterval", input.LongBreakInterval, 2, 10, "Uzun mola aralığı 2 ile 10 arasında olmalı.");
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var settings = new PomodoroSettings(
            input.FocusMinutes!.Value,
            input.ShortBreakMinutes!.Value,
            input.LongBreakMinutes!.Value,
            input.LongBreakInterval!.Value);
        await store.UpdateAsync(FileName, Schema, document =>
        {
            document ??= new JsonObject();
            document[PomodoroSection] = JsonSerializer.SerializeToNode(settings, StorageJson.Options);
            return document;
        }, cancellationToken);
        return settings;
    }

    public async Task<ReminderSettings> SaveRemindersAsync(ReminderSettingsInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        var english = ToReminder(errors, "english", input.English);
        var tech = ToReminder(errors, "tech", input.Tech);
        if (english is null || tech is null)
        {
            throw new ValidationException(errors);
        }

        var settings = new ReminderSettings(english, tech);
        await store.UpdateAsync(FileName, Schema, document =>
        {
            document ??= new JsonObject();
            document[RemindersSection] = JsonSerializer.SerializeToNode(settings, StorageJson.Options);
            return document;
        }, cancellationToken);
        return settings;
    }

    private static Reminder? ToReminder(Dictionary<string, string[]> errors, string field, ReminderInput? input)
    {
        if (input is { Enabled: { } enabled } && ReminderSettings.IsValidTime(input.Time))
        {
            return new Reminder(input.Time!, enabled);
        }
        errors[field] = [TimeMessage];
        return null;
    }

    /// <summary>Each reminder on its own: a missing or broken one gives its default.</summary>
    private static ReminderSettings ReadReminders(JsonObject? document)
    {
        var section = document?[RemindersSection] as JsonObject;
        return new ReminderSettings(
            ReadReminder(section?["english"], ReminderSettings.Default.English),
            ReadReminder(section?["tech"], ReminderSettings.Default.Tech));
    }

    private static Reminder ReadReminder(JsonNode? node, Reminder fallback)
    {
        try
        {
            var reminder = node is JsonObject ? node.Deserialize<Reminder>(StorageJson.Options) : null;
            return reminder is not null && ReminderSettings.IsValidTime(reminder.Time) ? reminder : fallback;
        }
        catch (JsonException)
        {
            return fallback;
        }
    }

    private static PomodoroSettings ReadPomodoro(JsonObject? document)
    {
        try
        {
            return document?[PomodoroSection]?.Deserialize<PomodoroSettings>(StorageJson.Options) ?? PomodoroSettings.Default;
        }
        catch (JsonException)
        {
            return PomodoroSettings.Default;
        }
    }

    private static void Check(Dictionary<string, string[]> errors, string field, int? value, int min, int max, string message)
    {
        if (value is not { } v || v < min || v > max)
        {
            errors[field] = [message];
        }
    }
}

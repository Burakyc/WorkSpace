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

    public static readonly DocumentSchema Schema = new(1, []);

    /// <summary>The saved settings; a missing file, section or unreadable section gives the defaults.</summary>
    public async Task<AppSettings> GetAsync(CancellationToken cancellationToken)
    {
        var document = await store.ReadAsync(FileName, Schema, cancellationToken);
        return new AppSettings(ReadPomodoro(document));
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

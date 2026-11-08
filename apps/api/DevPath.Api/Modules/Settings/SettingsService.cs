using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Ai;

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
    private const string AiModesSection = "aiModes";
    private const string AiInboxSection = "aiInbox";
    private const string AiProviderSection = "aiProvider";
    private const string TimeMessage = "Saat SS:DD biçiminde olmalı (00:00–23:59).";

    public static readonly DocumentSchema Schema = new(1, []);

    /// <summary>The saved settings; a missing file, section or unreadable section gives the defaults.</summary>
    public async Task<AppSettings> GetAsync(CancellationToken cancellationToken)
    {
        var document = await store.ReadAsync(FileName, Schema, cancellationToken);
        return new AppSettings(ReadPomodoro(document), ReadReminders(document), ReadAiModes(document), ReadAiInbox(document), ReadAiProvider(document));
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

    /// <summary>Saves one module's mode and answers with every module's mode.</summary>
    public async Task<IReadOnlyDictionary<string, string>> SaveAiModeAsync(string module, string? mode, CancellationToken cancellationToken)
    {
        RequireModule(module);
        if (mode is null || !AiModes.Available.Contains(mode))
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["mode"] = ["Bu mod kullanılamıyor."] });
        }

        var document = await SaveModuleValueAsync(AiModesSection, module, mode, cancellationToken);
        return ReadAiModes(document);
    }

    /// <summary>Saves one module's inbox folder (null or empty clears it) and answers with every module's folder.</summary>
    public async Task<IReadOnlyDictionary<string, string?>> SaveAiInboxAsync(string module, string? folder, CancellationToken cancellationToken)
    {
        RequireModule(module);
        string? full = null;
        if (!string.IsNullOrWhiteSpace(folder))
        {
            if (!Path.IsPathFullyQualified(folder) || !Directory.Exists(folder))
            {
                throw new ValidationException(new Dictionary<string, string[]> { ["folder"] = ["Klasör bulunamadı."] });
            }
            full = Path.TrimEndingDirectorySeparator(Path.GetFullPath(folder));
        }

        var document = await SaveModuleValueAsync(AiInboxSection, module, full, cancellationToken);
        return ReadAiInbox(document);
    }

    /// <summary>Saves the provider of the API mode.</summary>
    public async Task<string> SaveAiProviderAsync(string? provider, CancellationToken cancellationToken)
    {
        if (AiProviders.Find(provider) is null)
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["provider"] = ["Bilinmeyen sağlayıcı."] });
        }

        await store.UpdateAsync(FileName, Schema, document =>
        {
            document ??= new JsonObject();
            document[AiProviderSection] = provider;
            return document;
        }, cancellationToken);
        return provider!;
    }

    private static string ReadAiProvider(JsonObject? document) =>
        document?[AiProviderSection] is JsonValue value && value.TryGetValue<string>(out var provider) && AiProviders.Find(provider) is not null
            ? provider
            : AiProviders.Claude;

    private static void RequireModule(string module)
    {
        if (!AiModes.Modules.Contains(module))
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["module"] = ["Bilinmeyen modül."] });
        }
    }

    /// <summary>Sets one module's value in a section under one update and gives the saved document.</summary>
    private async Task<JsonObject> SaveModuleValueAsync(string sectionName, string module, string? value, CancellationToken cancellationToken)
    {
        JsonObject saved = new();
        await store.UpdateAsync(FileName, Schema, document =>
        {
            document ??= new JsonObject();
            if (document[sectionName] is not JsonObject section)
            {
                section = new JsonObject();
                document[sectionName] = section;
            }
            section[module] = value;
            saved = document;
            return document;
        }, cancellationToken);
        return saved;
    }

    private static IReadOnlyDictionary<string, string?> ReadAiInbox(JsonObject? document)
    {
        var section = document?[AiInboxSection] as JsonObject;
        return AiModes.Modules.ToDictionary(module => module, module =>
            section?[module] is JsonValue value && value.TryGetValue<string>(out var folder) && folder != "" ? folder : null);
    }

    private static IReadOnlyDictionary<string, string> ReadAiModes(JsonObject? document)
    {
        var section = document?[AiModesSection] as JsonObject;
        return AiModes.Modules.ToDictionary(module => module, module =>
            section?[module] is JsonValue value && value.TryGetValue<string>(out var mode) && AiModes.Available.Contains(mode)
                ? mode
                : AiModes.CopyPaste);
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

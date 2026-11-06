using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Settings;

/// <summary>One daily reminder: a local time (HH:MM, 24-hour) and whether it notifies.</summary>
public sealed record Reminder(string Time, bool Enabled);

/// <summary>The daily English and tech reminders in settings.json ("reminders").</summary>
public sealed partial record ReminderSettings(Reminder English, Reminder Tech)
{
    public static readonly ReminderSettings Default = new(new Reminder("09:00", true), new Reminder("20:00", true));

    public static bool IsValidTime(string? time) => time is not null && TimePattern().IsMatch(time);

    [GeneratedRegex(@"^([01]\d|2[0-3]):[0-5]\d$")]
    private static partial Regex TimePattern();
}

public sealed record ReminderInput(string? Time, bool? Enabled);

/// <summary>PUT /api/settings/reminders. Both reminders and both fields are required.</summary>
public sealed record ReminderSettingsInput(ReminderInput? English, ReminderInput? Tech);

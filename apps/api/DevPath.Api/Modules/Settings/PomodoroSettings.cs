namespace DevPath.Api.Modules.Settings;

/// <summary>Timer lengths in minutes and how many completed focus sessions come before a long break.</summary>
public sealed record PomodoroSettings(int FocusMinutes, int ShortBreakMinutes, int LongBreakMinutes, int LongBreakInterval)
{
    public static readonly PomodoroSettings Default = new(25, 5, 15, 4);
}

/// <summary>PUT /api/settings/pomodoro. Every value is required.</summary>
public sealed record PomodoroSettingsInput(int? FocusMinutes, int? ShortBreakMinutes, int? LongBreakMinutes, int? LongBreakInterval);

/// <summary>GET /api/settings: one section per area; later phases add sections.</summary>
public sealed record AppSettings(PomodoroSettings Pomodoro);

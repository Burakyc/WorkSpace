namespace DevPath.Api.Modules.Pomodoro;

/// <summary>What a client sends to log a focus session. The id is set by the API; tags are normalized.</summary>
public sealed record SessionInput(
    string? GoalId,
    string? ProjectId,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    int? DurationMinutes,
    bool? Completed,
    string? Note,
    IReadOnlyList<string?>? Tags = null);

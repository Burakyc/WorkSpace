namespace DevPath.Api.Modules.Pomodoro;

/// <summary>What a client sends to log a focus session. The id and tags are set by the API.</summary>
public sealed record SessionInput(
    string? GoalId,
    string? ProjectId,
    DateTimeOffset? StartedAt,
    DateTimeOffset? EndedAt,
    int? DurationMinutes,
    bool? Completed,
    string? Note);

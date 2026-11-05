using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Pomodoro;

/// <summary>One pomodoro focus session. Read for goal progress now; written by the timer in phase 2.2.</summary>
public sealed record Session(
    string Id,
    string GoalId,
    string? ProjectId,
    IReadOnlyList<string> Tags,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    int DurationMinutes,
    bool Completed,
    string? Note) : IEntity;

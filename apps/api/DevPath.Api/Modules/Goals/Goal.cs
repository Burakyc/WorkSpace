using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Goals;

/// <summary>Something the user works toward. Every pomodoro session belongs to a goal.</summary>
public sealed record Goal(
    string Id,
    string Title,
    string? Description,
    int? TargetPomodoros,
    bool Archived,
    DateTimeOffset CreatedAt) : IEntity;

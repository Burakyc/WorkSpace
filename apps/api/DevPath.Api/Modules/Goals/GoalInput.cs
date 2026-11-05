namespace DevPath.Api.Modules.Goals;

/// <summary>What a client may set on a goal (create and update). Id, archived and createdAt are owned by the API.</summary>
public sealed record GoalInput(string? Title, string? Description, int? TargetPomodoros);

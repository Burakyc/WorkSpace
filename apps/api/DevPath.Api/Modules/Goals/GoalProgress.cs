using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Modules.Goals;

/// <summary>How far a goal is, from its completed pomodoro sessions. <see cref="Percent"/> is null without a target.</summary>
public sealed record GoalProgress(string GoalId, int CompletedSessions, int TotalMinutes, int? Percent)
{
    /// <summary>
    /// Counts only this goal's completed sessions. The percentage is rounded down and capped at 100,
    /// so it never shows 100% before the target is reached.
    /// </summary>
    public static GoalProgress Calculate(Goal goal, IEnumerable<Session> sessions)
    {
        var completed = sessions.Where(session => session.GoalId == goal.Id && session.Completed).ToList();
        int? percent = goal.TargetPomodoros is { } target
            ? Math.Min(100, completed.Count * 100 / target)
            : null;
        return new GoalProgress(goal.Id, completed.Count, completed.Sum(session => session.DurationMinutes), percent);
    }
}

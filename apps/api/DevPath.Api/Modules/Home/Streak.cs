namespace DevPath.Api.Modules.Home;

/// <summary>The pomodoro streak: consecutive days with at least one completed session.</summary>
public static class Streak
{
    /// <summary>Counted back from today, or from yesterday while today has none yet (so the streak is not lost in the morning).</summary>
    public static int Count(IEnumerable<DateOnly> daysWithSessions, DateOnly today)
    {
        var days = daysWithSessions.ToHashSet();
        var day = days.Contains(today) ? today : today.AddDays(-1);
        var count = 0;
        while (days.Contains(day))
        {
            count++;
            day = day.AddDays(-1);
        }
        return count;
    }
}

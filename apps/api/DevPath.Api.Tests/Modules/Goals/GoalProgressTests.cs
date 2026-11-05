using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Tests.Modules.Goals;

public class GoalProgressTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 5, 9, 0, 0, TimeSpan.Zero);

    private static Goal GoalWith(int? target) => new("g", "Goal", null, target, false, Start);

    private static Session SessionOf(string goalId, int minutes = 25, bool completed = true) =>
        new(Guid.NewGuid().ToString(), goalId, null, [], Start, Start.AddMinutes(minutes), minutes, completed, null);

    private static IEnumerable<Session> Completed(int count) => Enumerable.Range(0, count).Select(_ => SessionOf("g"));

    [Fact]
    public void No_sessions_with_a_target_is_zero_percent()
    {
        Assert.Equal(new GoalProgress("g", 0, 0, 0), GoalProgress.Calculate(GoalWith(20), []));
    }

    [Fact]
    public void No_sessions_without_a_target_has_no_percent()
    {
        Assert.Equal(new GoalProgress("g", 0, 0, null), GoalProgress.Calculate(GoalWith(null), []));
    }

    [Fact]
    public void Percent_is_completed_sessions_of_the_target()
    {
        Assert.Equal(35, GoalProgress.Calculate(GoalWith(20), Completed(7)).Percent);
    }

    [Theory]
    [InlineData(19, 95)]
    [InlineData(20, 100)]
    [InlineData(25, 100)]
    public void Percent_is_rounded_down_and_capped(int completed, int expected)
    {
        Assert.Equal(expected, GoalProgress.Calculate(GoalWith(20), Completed(completed)).Percent);
    }

    [Fact]
    public void Without_a_target_it_counts_sessions_and_minutes()
    {
        var progress = GoalProgress.Calculate(GoalWith(null), [SessionOf("g", 25), SessionOf("g", 25), SessionOf("g", 10)]);

        Assert.Equal(new GoalProgress("g", 3, 60, null), progress);
    }

    [Fact]
    public void Only_this_goals_completed_sessions_count()
    {
        Session[] sessions = [SessionOf("g", 25), SessionOf("g", 12, completed: false), SessionOf("other", 25)];

        Assert.Equal(new GoalProgress("g", 1, 25, 5), GoalProgress.Calculate(GoalWith(20), sessions));
    }
}

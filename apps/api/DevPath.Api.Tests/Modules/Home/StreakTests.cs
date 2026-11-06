using DevPath.Api.Modules.Home;

namespace DevPath.Api.Tests.Modules.Home;

public class StreakTests
{
    private static readonly DateOnly Today = new(2026, 11, 6);

    private static int Count(params int[] daysAgo) => Streak.Count(daysAgo.Select(d => Today.AddDays(-d)), Today);

    [Fact]
    public void Counts_back_from_today() => Assert.Equal(3, Count(0, 1, 2, 4));

    [Fact]
    public void Counts_back_from_yesterday_while_today_has_none() => Assert.Equal(2, Count(1, 2));

    [Fact]
    public void A_gap_before_yesterday_ends_it() => Assert.Equal(0, Count(2, 3));

    [Fact]
    public void Nothing_is_zero() => Assert.Equal(0, Count());

    [Fact]
    public void Several_sessions_on_a_day_count_once() => Assert.Equal(2, Count(0, 0, 1, 1));
}

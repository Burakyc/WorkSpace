using DevPath.Api.Modules.Calendar;

namespace DevPath.Api.Tests.Modules.Calendar;

public class CalendarGridTests
{
    [Theory]
    [InlineData("2026-11", "2026-10-26", "2026-12-06")]
    [InlineData("2027-02", "2027-02-01", "2027-02-28")]
    [InlineData("2026-03", "2026-02-23", "2026-04-05")]
    public void Visible_range_is_whole_monday_first_weeks(string month, string first, string last)
    {
        Assert.True(CalendarGrid.TryParseMonth(month, out var firstOfMonth));

        var range = CalendarGrid.VisibleRange(firstOfMonth);

        Assert.Equal((DateOnly.Parse(first), DateOnly.Parse(last)), range);
        Assert.Equal(DayOfWeek.Monday, range.First.DayOfWeek);
        Assert.Equal(DayOfWeek.Sunday, range.Last.DayOfWeek);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("2026-13")]
    [InlineData("2026-00")]
    [InlineData("26-11")]
    [InlineData("2026-1")]
    [InlineData("abcd-ef")]
    [InlineData("1999-12")]
    [InlineData("2101-01")]
    public void Rejects_bad_months(string? month)
    {
        Assert.False(CalendarGrid.TryParseMonth(month, out _));
    }

    [Theory]
    [InlineData("2026-11-05", true)]
    [InlineData("2028-02-29", true)]
    [InlineData("2026-02-30", false)]
    [InlineData("2026-11-5", false)]
    [InlineData("1999-12-31", false)]
    [InlineData("2101-01-01", false)]
    [InlineData("05.11.2026", false)]
    [InlineData(null, false)]
    public void Parses_real_dates_only(string? value, bool valid)
    {
        Assert.Equal(valid, CalendarGrid.TryParseDate(value, out _));
    }
}

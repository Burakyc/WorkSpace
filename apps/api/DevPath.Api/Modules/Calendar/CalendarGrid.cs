using System.Globalization;
using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Calendar;

/// <summary>
/// The days a month view shows: Monday-first weeks from the Monday on or before the 1st to the Sunday on or after
/// the last day. The renderer's monthGrid.ts uses the same rule.
/// </summary>
public static partial class CalendarGrid
{
    [GeneratedRegex(@"^\d{4}-\d{2}$")]
    private static partial Regex MonthPattern();

    /// <summary>Parses "YYYY-MM" (years 2000–2100) into the first day of that month.</summary>
    public static bool TryParseMonth(string? value, out DateOnly firstDay)
    {
        firstDay = default;
        if (value is null || !MonthPattern().IsMatch(value))
        {
            return false;
        }

        var year = int.Parse(value[..4], CultureInfo.InvariantCulture);
        var month = int.Parse(value[5..], CultureInfo.InvariantCulture);
        if (year is < 2000 or > 2100 || month is < 1 or > 12)
        {
            return false;
        }

        firstDay = new DateOnly(year, month, 1);
        return true;
    }

    /// <summary>Parses a real "YYYY-MM-DD" date in the years 2000–2100.</summary>
    public static bool TryParseDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date) &&
        date.Year is >= 2000 and <= 2100;

    public static (DateOnly First, DateOnly Last) VisibleRange(DateOnly firstOfMonth)
    {
        var lastOfMonth = firstOfMonth.AddMonths(1).AddDays(-1);
        return (
            firstOfMonth.AddDays(-DaysSinceMonday(firstOfMonth)),
            lastOfMonth.AddDays(6 - DaysSinceMonday(lastOfMonth)));
    }

    private static int DaysSinceMonday(DateOnly day) => ((int)day.DayOfWeek + 6) % 7;
}

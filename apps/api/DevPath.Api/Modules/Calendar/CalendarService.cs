using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Modules.Calendar;

public sealed record CalendarDay(DateOnly Date, int CompletedSessions, int TotalMinutes);

public sealed record CalendarMonth(string Month, string TimeZone, IReadOnlyList<CalendarDay> Days);

public sealed class CalendarService(IRepository<Session> sessions)
{
    /// <summary>
    /// Completed sessions per local day for every day of the month's visible grid. A session belongs to the local
    /// date of its start in <paramref name="timeZone"/> (an IANA id sent by the page).
    /// </summary>
    public async Task<CalendarMonth> GetMonthAsync(string? month, string? timeZone, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (!CalendarGrid.TryParseMonth(month, out var firstOfMonth))
        {
            errors["month"] = ["Ay YYYY-AA biçiminde olmalı."];
        }

        var zone = FindZone(timeZone);
        if (zone is null)
        {
            errors["timeZone"] = ["Saat dilimi tanınmadı."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var (first, last) = CalendarGrid.VisibleRange(firstOfMonth);
        var byDay = (await sessions.GetAllAsync(cancellationToken))
            .Where(session => session.Completed)
            .GroupBy(session => LocalDate(session.StartedAt, zone!))
            .ToDictionary(group => group.Key, group => (Count: group.Count(), Minutes: group.Sum(s => s.DurationMinutes)));

        var days = new List<CalendarDay>();
        for (var day = first; day <= last; day = day.AddDays(1))
        {
            var (count, minutes) = byDay.GetValueOrDefault(day);
            days.Add(new CalendarDay(day, count, minutes));
        }

        return new CalendarMonth(month!, timeZone!, days);
    }

    public static DateOnly LocalDate(DateTimeOffset instant, TimeZoneInfo zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).DateTime);

    /// <summary>The time zone for an IANA id, or null when it is missing or unknown.</summary>
    public static TimeZoneInfo? FindZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return null;
        }
    }
}

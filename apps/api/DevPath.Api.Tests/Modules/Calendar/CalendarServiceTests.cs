using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Calendar;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Calendar;

public sealed class CalendarServiceTests : IDisposable
{
    private const string Istanbul = "Europe/Istanbul";

    private readonly TempFolder _folder = new();
    private readonly JsonRepository<Session> _sessions;
    private readonly CalendarService _calendar;

    public CalendarServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        _sessions = new JsonRepository<Session>(store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema);
        _calendar = new CalendarService(_sessions);
    }

    public void Dispose() => _folder.Dispose();

    private Task Add(string startedAtUtc, int minutes = 25, bool completed = true)
    {
        var start = DateTimeOffset.Parse(startedAtUtc);
        return _sessions.UpsertAsync(
            new Session(Guid.NewGuid().ToString(), "g", null, [], start, start.AddMinutes(minutes), minutes, completed, null),
            CancellationToken.None);
    }

    private async Task<CalendarDay> Day(string month, string date, string zone = Istanbul) =>
        (await _calendar.GetMonthAsync(month, zone, CancellationToken.None)).Days.Single(d => d.Date == DateOnly.Parse(date));

    [Fact]
    public async Task Counts_completed_sessions_and_minutes_per_day()
    {
        await Add("2026-11-03T09:00:00Z");
        await Add("2026-11-03T10:00:00Z", minutes: 50);
        await Add("2026-11-04T09:00:00Z");

        var month = await _calendar.GetMonthAsync("2026-11", Istanbul, CancellationToken.None);

        Assert.Equal(42, month.Days.Count);
        Assert.Equal(new CalendarDay(DateOnly.Parse("2026-11-03"), 2, 75), month.Days.Single(d => d.Date.Day == 3 && d.Date.Month == 11));
        Assert.Equal(1, (await Day("2026-11", "2026-11-04")).CompletedSessions);
        Assert.Equal(0, (await Day("2026-11", "2026-11-05")).CompletedSessions);
    }

    [Fact]
    public async Task Stopped_sessions_do_not_count()
    {
        await Add("2026-11-03T09:00:00Z", minutes: 10, completed: false);

        Assert.Equal(new CalendarDay(DateOnly.Parse("2026-11-03"), 0, 0), await Day("2026-11", "2026-11-03"));
    }

    [Fact]
    public async Task Sessions_belong_to_their_local_day()
    {
        await Add("2026-11-05T21:30:00Z");

        Assert.Equal(1, (await Day("2026-11", "2026-11-06")).CompletedSessions);
        Assert.Equal(0, (await Day("2026-11", "2026-11-05")).CompletedSessions);
        Assert.Equal(1, (await Day("2026-11", "2026-11-05", "UTC")).CompletedSessions);
    }

    [Fact]
    public async Task A_late_session_on_the_last_day_moves_into_the_next_month()
    {
        await Add("2026-11-30T22:30:00Z");

        Assert.Equal(1, (await Day("2026-11", "2026-12-01")).CompletedSessions);
        Assert.Equal(1, (await Day("2026-12", "2026-12-01")).CompletedSessions);
        Assert.Equal(0, (await Day("2026-11", "2026-11-30")).CompletedSessions);
    }

    [Theory]
    [InlineData("2026-11", "Mars/Base", "timeZone")]
    [InlineData("2026-11", null, "timeZone")]
    [InlineData("2026-13", Istanbul, "month")]
    public async Task Rejects_bad_input(string month, string? zone, string field)
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() => _calendar.GetMonthAsync(month, zone, CancellationToken.None));

        Assert.Equal([field], ex.Errors.Keys);
    }
}

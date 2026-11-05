using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Calendar;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Calendar;

public sealed class DayServiceTests : IDisposable
{
    private const string Istanbul = "Europe/Istanbul";
    private static readonly DateTimeOffset Created = DateTimeOffset.Parse("2026-11-01T00:00:00Z");

    private readonly TempFolder _folder = new();
    private readonly JsonRepository<Session> _sessions;
    private readonly JsonRepository<Goal> _goals;
    private readonly JsonRepository<Project> _projects;
    private readonly JsonFileStore _store;
    private readonly DayService _days;

    public DayServiceTests()
    {
        var store = _store = new JsonFileStore(new DataDirectory(_folder.Path));
        _sessions = new JsonRepository<Session>(store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema);
        _goals = new JsonRepository<Goal>(store, GoalsModule.FileName, GoalsModule.Schema);
        _projects = new JsonRepository<Project>(store, ProjectsModule.FileName, ProjectsModule.Schema);
        _days = new DayService(_sessions, _goals, _projects, store);
    }

    public void Dispose() => _folder.Dispose();

    private Task AddGoal(string id, string title, bool archived = false) =>
        _goals.UpsertAsync(new Goal(id, title, null, null, archived, Created), CancellationToken.None);

    private async Task<string> Add(
        string startedAtUtc, string goalId = "g1", int minutes = 25, bool completed = true,
        string? projectId = null, string? note = null)
    {
        var id = Guid.NewGuid().ToString();
        var start = DateTimeOffset.Parse(startedAtUtc);
        await _sessions.UpsertAsync(
            new Session(id, goalId, projectId, ["di"], start, start.AddMinutes(minutes), minutes, completed, note),
            CancellationToken.None);
        return id;
    }

    private Task<DayDetail> Get(string date, string zone = Istanbul) => _days.GetAsync(date, zone, CancellationToken.None);

    [Fact]
    public async Task Lists_the_sessions_of_the_local_day_oldest_first()
    {
        await AddGoal("g1", "Learn ASP.NET Core");
        var late = await Add("2026-11-03T10:00:00Z");
        var early = await Add("2026-11-03T09:00:00Z");
        var stopped = await Add("2026-11-03T11:00:00Z", minutes: 10, completed: false);
        await Add("2026-11-04T09:00:00Z");

        var day = await Get("2026-11-03");

        Assert.Equal([early, late, stopped], day.Sessions.Select(s => s.Id));
        Assert.False(day.Sessions[2].Completed);
        Assert.Equal((2, 50), (day.CompletedSessions, day.TotalMinutes));
        Assert.Equal(new DateOnly(2026, 11, 3), day.Date);
    }

    [Fact]
    public async Task Joins_goal_and_project_titles()
    {
        await AddGoal("g1", "Learn ASP.NET Core", archived: true);
        await _projects.UpsertAsync(new Project("p1", "g1", "Todo API", null, true, Created), CancellationToken.None);
        await Add("2026-11-03T09:00:00Z", projectId: "p1", note: "DI done");
        await Add("2026-11-03T10:00:00Z", goalId: "gone", projectId: "missing");

        var sessions = (await Get("2026-11-03")).Sessions;

        Assert.Equal(("Learn ASP.NET Core", "Todo API", "DI done"), (sessions[0].GoalTitle, sessions[0].ProjectTitle, sessions[0].Note));
        Assert.Equal(["di"], sessions[0].Tags);
        Assert.Null(sessions[1].GoalTitle);
        Assert.Null(sessions[1].ProjectTitle);
    }

    [Fact]
    public async Task Goals_count_completed_sessions_only_and_most_worked_first()
    {
        await AddGoal("g1", "English");
        await AddGoal("g2", "ASP.NET");
        await AddGoal("g3", "Docker");
        await Add("2026-11-03T08:00:00Z", goalId: "g1");
        await Add("2026-11-03T09:00:00Z", goalId: "g2");
        await Add("2026-11-03T10:00:00Z", goalId: "g2", minutes: 50);
        await Add("2026-11-03T11:00:00Z", goalId: "g2", minutes: 5, completed: false);
        await Add("2026-11-03T12:00:00Z", goalId: "g3", minutes: 5, completed: false);

        var goals = (await Get("2026-11-03")).Goals;

        Assert.Equal(
            [new DayGoal("g2", "ASP.NET", 2, 75), new DayGoal("g1", "English", 1, 25), new DayGoal("g3", "Docker", 0, 0)],
            goals);
    }

    [Fact]
    public async Task Sessions_belong_to_their_local_day()
    {
        await Add("2026-11-05T21:30:00Z");

        Assert.Single((await Get("2026-11-06")).Sessions);
        Assert.Empty((await Get("2026-11-05")).Sessions);
        Assert.Single((await Get("2026-11-05", "UTC")).Sessions);
    }

    [Theory]
    [InlineData("2026-02-30", Istanbul, "date")]
    [InlineData("2026-11-5", Istanbul, "date")]
    [InlineData("1999-12-31", Istanbul, "date")]
    [InlineData(null, Istanbul, "date")]
    [InlineData("2026-11-05", "Mars/Base", "timeZone")]
    public async Task Rejects_bad_input(string? date, string zone, string field)
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() => _days.GetAsync(date, zone, CancellationToken.None));

        Assert.Equal([field], ex.Errors.Keys);
    }

    [Fact]
    public async Task Saves_and_reads_the_daily_log()
    {
        var saved = await _days.SaveLogAsync("2026-11-05", new DayLogInput("Finished the DI chapter."), CancellationToken.None);

        Assert.Equal("Finished the DI chapter.", saved.Text);
        Assert.Equal("Finished the DI chapter.", (await Get("2026-11-05")).Log);
        var file = await _store.ReadAsync("daily/2026-11-05.json", DayService.LogSchema, CancellationToken.None);
        Assert.Equal(1, file!["schemaVersion"]!.GetValue<int>());
        Assert.Equal("2026-11-05", file["date"]!.GetValue<string>());
        Assert.True(File.Exists(Path.Combine(_folder.Path, "daily", "2026-11-05.json")));
    }

    [Fact]
    public async Task Log_text_is_trimmed_at_the_end_and_replaced_on_save()
    {
        await _days.SaveLogAsync("2026-11-05", new DayLogInput("first"), CancellationToken.None);

        var saved = await _days.SaveLogAsync("2026-11-05", new DayLogInput("  - indented\nline \n\n"), CancellationToken.None);

        Assert.Equal("  - indented\nline", saved.Text);
        Assert.Equal("  - indented\nline", (await Get("2026-11-05")).Log);
        Assert.Equal("", (await _days.SaveLogAsync("2026-11-05", new DayLogInput(null), CancellationToken.None)).Text);
        Assert.Equal("", (await Get("2026-11-05")).Log);
    }

    [Fact]
    public async Task Rejects_a_too_long_log_or_a_bad_date()
    {
        var longest = await _days.SaveLogAsync("2026-11-05", new DayLogInput(new string('a', 10_000)), CancellationToken.None);
        Assert.Equal(10_000, longest.Text.Length);

        var tooLong = await Assert.ThrowsAsync<ValidationException>(() =>
            _days.SaveLogAsync("2026-11-05", new DayLogInput(new string('a', 10_001)), CancellationToken.None));
        var badDate = await Assert.ThrowsAsync<ValidationException>(() =>
            _days.SaveLogAsync("2026-02-30", new DayLogInput("x"), CancellationToken.None));

        Assert.Equal(["text"], tooLong.Errors.Keys);
        Assert.Equal(["date"], badDate.Errors.Keys);
    }

    [Fact]
    public async Task A_day_without_a_log_has_empty_text()
    {
        Assert.Equal("", (await Get("2026-11-05")).Log);
        Assert.False(Directory.Exists(Path.Combine(_folder.Path, "daily")));
    }
}

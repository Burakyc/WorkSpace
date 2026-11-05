using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Pomodoro;

public sealed class SessionServiceTests : IDisposable
{
    private static readonly DateTimeOffset Now = new(2026, 11, 5, 12, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _clock = new(Now);
    private readonly GoalService _goals;
    private readonly ProjectService _projects;
    private readonly SessionService _sessions;

    public SessionServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        var goalRepository = new JsonRepository<Goal>(store, GoalsModule.FileName, GoalsModule.Schema);
        var projectRepository = new JsonRepository<Project>(store, ProjectsModule.FileName, ProjectsModule.Schema);
        var sessionRepository = new JsonRepository<Session>(store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema);
        _goals = new GoalService(goalRepository, sessionRepository, _clock);
        _projects = new ProjectService(projectRepository, goalRepository, _clock);
        _sessions = new SessionService(sessionRepository, goalRepository, projectRepository, _clock);
    }

    public void Dispose() => _folder.Dispose();

    private string SessionsFile => _folder.File(PomodoroModule.SessionsFileName);

    private Task<Goal> NewGoal(int? target = 20) =>
        _goals.CreateAsync(new GoalInput("Learn ASP.NET Core", null, target), CancellationToken.None);

    private static SessionInput Input(
        string? goalId,
        string? projectId = null,
        int durationMinutes = 25,
        bool? completed = true,
        string? note = null,
        DateTimeOffset? startedAt = null,
        DateTimeOffset? endedAt = null) =>
        new(goalId, projectId, startedAt ?? Now.AddMinutes(-25), endedAt ?? Now, durationMinutes, completed, note);

    private async Task<ValidationException> Invalid(SessionInput input) =>
        await Assert.ThrowsAsync<ValidationException>(() => _sessions.CreateAsync(input, CancellationToken.None));

    [Fact]
    public async Task Saves_a_session_with_utc_times_and_no_tags()
    {
        var goal = await NewGoal();
        var startedAt = new DateTimeOffset(2026, 11, 5, 14, 35, 0, TimeSpan.FromHours(3));

        var session = await _sessions.CreateAsync(
            Input(goal.Id, note: "  DI scopes  ", startedAt: startedAt, endedAt: startedAt.AddMinutes(25)),
            CancellationToken.None);

        Assert.True(Guid.TryParse(session.Id, out _));
        Assert.Equal(TimeSpan.Zero, session.StartedAt.Offset);
        Assert.Equal(startedAt, session.StartedAt);
        Assert.Equal("DI scopes", session.Note);
        Assert.Empty(session.Tags);
        var file = JsonNode.Parse(await File.ReadAllTextAsync(SessionsFile))!;
        Assert.Equal(session.Id, file["items"]![0]!["id"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(null, "Hedef gerekli.")]
    [InlineData("missing", "Hedef bulunamadı.")]
    public async Task Needs_an_existing_goal(string? goalId, string message)
    {
        var ex = await Invalid(Input(goalId));

        Assert.Equal([message], ex.Errors["goalId"]);
        Assert.False(File.Exists(SessionsFile));
    }

    [Fact]
    public async Task Allows_an_archived_goal()
    {
        var goal = await NewGoal();
        await _goals.SetArchivedAsync(goal.Id, true, CancellationToken.None);

        var session = await _sessions.CreateAsync(Input(goal.Id), CancellationToken.None);

        Assert.Equal(goal.Id, session.GoalId);
    }

    [Fact]
    public async Task Project_must_exist_and_belong_to_the_goal()
    {
        var goal = await NewGoal();
        var other = await NewGoal();
        var otherProject = await _projects.CreateAsync(new ProjectCreateInput(other.Id, "P", null), CancellationToken.None);

        Assert.Equal(["Proje bulunamadı."], (await Invalid(Input(goal.Id, "missing"))).Errors["projectId"]);
        Assert.Equal(["Proje bu hedefe ait değil."], (await Invalid(Input(goal.Id, otherProject.Id))).Errors["projectId"]);
    }

    [Theory]
    [InlineData(-25, null)]
    [InlineData(10, 0)]
    [InlineData(-25, 2)]
    public async Task Times_must_be_ordered_and_not_in_the_future(int startOffset, int? endOffset)
    {
        var goal = await NewGoal();
        var input = Input(goal.Id, durationMinutes: 1) with
        {
            StartedAt = Now.AddMinutes(startOffset),
            EndedAt = endOffset is { } end ? Now.AddMinutes(end) : null,
        };

        Assert.Equal(["Başlangıç ve bitiş zamanı geçersiz."], (await Invalid(input)).Errors["endedAt"]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(601)]
    [InlineData(26)]
    public async Task Duration_must_fit_the_span(int minutes)
    {
        var goal = await NewGoal();

        Assert.Equal(["Süre geçersiz."], (await Invalid(Input(goal.Id, durationMinutes: minutes))).Errors["durationMinutes"]);
    }

    [Fact]
    public async Task Note_is_optional_and_limited()
    {
        var goal = await NewGoal();

        Assert.Null((await _sessions.CreateAsync(Input(goal.Id, note: "   "), CancellationToken.None)).Note);
        Assert.NotNull(await _sessions.CreateAsync(Input(goal.Id, note: new string('n', 500)), CancellationToken.None));
        Assert.Contains("note", (await Invalid(Input(goal.Id, note: new string('n', 501)))).Errors.Keys);
    }

    [Fact]
    public async Task Completed_is_required()
    {
        var goal = await NewGoal();

        Assert.Equal(["Tamamlandı bilgisi gerekli."], (await Invalid(Input(goal.Id, completed: null))).Errors["completed"]);
    }

    [Fact]
    public async Task Only_completed_sessions_move_the_progress()
    {
        var goal = await NewGoal(target: 20);

        await _sessions.CreateAsync(Input(goal.Id), CancellationToken.None);
        await _sessions.CreateAsync(Input(goal.Id, durationMinutes: 10, completed: false), CancellationToken.None);

        var progress = Assert.Single(await _goals.ListProgressAsync(CancellationToken.None));
        Assert.Equal(new GoalProgress(goal.Id, 1, 25, 5), progress);
    }

    [Fact]
    public async Task Stores_normalized_tags_and_rejects_invalid_ones()
    {
        var goal = await NewGoal();

        var session = await _sessions.CreateAsync(Input(goal.Id) with { Tags = ["#DI", "di", "EF Core"] }, CancellationToken.None);

        Assert.Equal(["di", "ef-core"], session.Tags);
        Assert.Equal([Tags.InvalidMessage], (await Invalid(Input(goal.Id) with { Tags = ["a/b"] })).Errors["tags"]);
    }
}

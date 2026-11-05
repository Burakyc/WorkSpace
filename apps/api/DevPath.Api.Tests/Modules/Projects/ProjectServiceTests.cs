using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Projects;

public sealed class ProjectServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 11, 5, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _clock = new(Start);
    private readonly GoalService _goals;
    private readonly ProjectService _projects;

    public ProjectServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        var goalRepository = new JsonRepository<Goal>(store, GoalsModule.FileName, GoalsModule.Schema);
        _goals = new GoalService(
            goalRepository,
            new JsonRepository<Session>(store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema),
            _clock);
        _projects = new ProjectService(
            new JsonRepository<Project>(store, ProjectsModule.FileName, ProjectsModule.Schema),
            goalRepository,
            _clock);
    }

    public void Dispose() => _folder.Dispose();

    private string ProjectsFile => _folder.File(ProjectsModule.FileName);

    private Task<Goal> NewGoal(string title = "Learn ASP.NET Core") =>
        _goals.CreateAsync(new GoalInput(title, null, null), CancellationToken.None);

    [Fact]
    public async Task Create_sets_owned_fields_and_saves_a_versioned_file()
    {
        var goal = await NewGoal();

        var project = await _projects.CreateAsync(
            new ProjectCreateInput(goal.Id, "  Todo API ", " https://github.com/x "), CancellationToken.None);

        Assert.Equal(new Project(project.Id, goal.Id, "Todo API", "https://github.com/x", false, Start), project);
        var file = JsonNode.Parse(await File.ReadAllTextAsync(ProjectsFile))!;
        Assert.Equal(1, file["schemaVersion"]!.GetValue<int>());
        Assert.Equal(goal.Id, file["items"]![0]!["goalId"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(null, "Hedef gerekli.")]
    [InlineData("missing", "Hedef bulunamadı.")]
    public async Task Create_needs_an_existing_goal(string? goalId, string message)
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _projects.CreateAsync(new ProjectCreateInput(goalId, "Todo API", null), CancellationToken.None));

        Assert.Equal([message], ex.Errors["goalId"]);
        Assert.False(File.Exists(ProjectsFile));
    }

    [Fact]
    public async Task Create_refuses_an_archived_goal_and_reports_all_errors()
    {
        var goal = await NewGoal();
        await _goals.SetArchivedAsync(goal.Id, true, CancellationToken.None);

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _projects.CreateAsync(new ProjectCreateInput(goal.Id, "", "http://x"), CancellationToken.None));

        Assert.Equal(["Arşivlenmiş bir hedefe proje eklenemez."], ex.Errors["goalId"]);
        Assert.Equal(["goalId", "title", "url"], ex.Errors.Keys.Order());
    }

    [Fact]
    public async Task Update_changes_title_and_url_only()
    {
        var goal = await NewGoal();
        var project = await _projects.CreateAsync(new ProjectCreateInput(goal.Id, "Old", "https://a.example"), CancellationToken.None);
        await _projects.SetArchivedAsync(project.Id, true, CancellationToken.None);
        _clock.Now = Start.AddDays(1);

        var updated = await _projects.UpdateAsync(project.Id, new ProjectUpdateInput("New", ""), CancellationToken.None);

        Assert.Equal(new Project(project.Id, goal.Id, "New", null, true, Start), updated);
        Assert.Null(await _projects.UpdateAsync("missing", new ProjectUpdateInput("x", null), CancellationToken.None));
        await Assert.ThrowsAsync<ValidationException>(
            () => _projects.UpdateAsync(project.Id, new ProjectUpdateInput(" ", null), CancellationToken.None));
    }

    [Fact]
    public async Task Archive_and_restore_are_idempotent()
    {
        var goal = await NewGoal();
        var project = await _projects.CreateAsync(new ProjectCreateInput(goal.Id, "P", null), CancellationToken.None);

        Assert.True((await _projects.SetArchivedAsync(project.Id, true, CancellationToken.None))!.Archived);
        Assert.True((await _projects.SetArchivedAsync(project.Id, true, CancellationToken.None))!.Archived);
        Assert.False((await _projects.SetArchivedAsync(project.Id, false, CancellationToken.None))!.Archived);
        Assert.Null(await _projects.SetArchivedAsync("missing", true, CancellationToken.None));
    }

    [Fact]
    public async Task List_is_in_creation_order_and_hides_archived()
    {
        var goal = await NewGoal();
        var first = await _projects.CreateAsync(new ProjectCreateInput(goal.Id, "1", null), CancellationToken.None);
        _clock.Now = Start.AddMinutes(1);
        var second = await _projects.CreateAsync(new ProjectCreateInput(goal.Id, "2", null), CancellationToken.None);
        _clock.Now = Start.AddMinutes(2);
        var third = await _projects.CreateAsync(new ProjectCreateInput(goal.Id, "3", null), CancellationToken.None);
        await _projects.SetArchivedAsync(second.Id, true, CancellationToken.None);

        var active = (await _projects.ListAsync(false, CancellationToken.None)).Select(p => p.Id);
        var all = (await _projects.ListAsync(true, CancellationToken.None)).Select(p => p.Id);

        Assert.Equal([first.Id, third.Id], active);
        Assert.Equal([first.Id, second.Id, third.Id], all);
    }
}

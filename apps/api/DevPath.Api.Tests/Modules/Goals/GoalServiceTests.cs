using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Goals;

public sealed class GoalServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 11, 5, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _clock = new(Start);
    private readonly GoalService _service;

    public GoalServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        _service = new GoalService(new JsonRepository<Goal>(store, GoalsModule.FileName, GoalsModule.Schema), _clock);
    }

    public void Dispose() => _folder.Dispose();

    private string GoalsFile => _folder.File(GoalsModule.FileName);

    [Fact]
    public async Task Create_sets_owned_fields_and_saves_a_versioned_file()
    {
        var goal = await _service.CreateAsync(new GoalInput("  Learn ASP.NET Core  ", "   ", 20), CancellationToken.None);

        Assert.True(Guid.TryParse(goal.Id, out _));
        Assert.Equal(new Goal(goal.Id, "Learn ASP.NET Core", null, 20, false, Start), goal);
        var file = JsonNode.Parse(await File.ReadAllTextAsync(GoalsFile))!;
        Assert.Equal(1, file["schemaVersion"]!.GetValue<int>());
        Assert.Equal("Learn ASP.NET Core", file["items"]![0]!["title"]!.GetValue<string>());
    }

    [Fact]
    public async Task Create_rejects_invalid_input_and_saves_nothing()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateAsync(new GoalInput("", null, 0), CancellationToken.None));

        Assert.Contains("title", ex.Errors.Keys);
        Assert.False(File.Exists(GoalsFile));
    }

    [Fact]
    public async Task Update_changes_input_fields_and_keeps_owned_ones()
    {
        var goal = await _service.CreateAsync(new GoalInput("Old", "d", 5), CancellationToken.None);
        await _service.SetArchivedAsync(goal.Id, true, CancellationToken.None);
        _clock.Now = Start.AddDays(1);

        var updated = await _service.UpdateAsync(goal.Id, new GoalInput("New", null, null), CancellationToken.None);

        Assert.Equal(new Goal(goal.Id, "New", null, null, true, Start), updated);
        Assert.Null(await _service.UpdateAsync("missing", new GoalInput("x", null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Update_rejects_invalid_input_and_leaves_the_file()
    {
        var goal = await _service.CreateAsync(new GoalInput("Keep", null, null), CancellationToken.None);
        var before = await File.ReadAllTextAsync(GoalsFile);

        await Assert.ThrowsAsync<ValidationException>(
            () => _service.UpdateAsync(goal.Id, new GoalInput(new string('a', 121), null, null), CancellationToken.None));

        Assert.Equal(before, await File.ReadAllTextAsync(GoalsFile));
    }

    [Fact]
    public async Task Archive_and_restore_are_idempotent()
    {
        var goal = await _service.CreateAsync(new GoalInput("G", null, null), CancellationToken.None);

        Assert.True((await _service.SetArchivedAsync(goal.Id, true, CancellationToken.None))!.Archived);
        Assert.True((await _service.SetArchivedAsync(goal.Id, true, CancellationToken.None))!.Archived);
        Assert.False((await _service.SetArchivedAsync(goal.Id, false, CancellationToken.None))!.Archived);
        Assert.Null(await _service.SetArchivedAsync("missing", true, CancellationToken.None));
    }

    [Fact]
    public async Task List_shows_active_goals_newest_first()
    {
        var (first, second, third) = await CreateThree();
        await _service.SetArchivedAsync(second.Id, true, CancellationToken.None);

        var ids = (await _service.ListAsync(false, CancellationToken.None)).Select(goal => goal.Id);

        Assert.Equal([third.Id, first.Id], ids);
    }

    [Fact]
    public async Task List_with_archived_puts_them_after_active_goals()
    {
        var (first, second, third) = await CreateThree();
        await _service.SetArchivedAsync(first.Id, true, CancellationToken.None);
        await _service.SetArchivedAsync(third.Id, true, CancellationToken.None);

        var ids = (await _service.ListAsync(true, CancellationToken.None)).Select(goal => goal.Id);

        Assert.Equal([second.Id, third.Id, first.Id], ids);
    }

    private async Task<(Goal First, Goal Second, Goal Third)> CreateThree()
    {
        var first = await _service.CreateAsync(new GoalInput("1", null, null), CancellationToken.None);
        _clock.Now = Start.AddMinutes(1);
        var second = await _service.CreateAsync(new GoalInput("2", null, null), CancellationToken.None);
        _clock.Now = Start.AddMinutes(2);
        var third = await _service.CreateAsync(new GoalInput("3", null, null), CancellationToken.None);
        return (first, second, third);
    }
}

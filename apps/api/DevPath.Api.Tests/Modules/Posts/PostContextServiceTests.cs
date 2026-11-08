using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Posts;
using DevPath.Api.Modules.Projects;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class PostContextServiceTests : IDisposable
{
    private static readonly DateTimeOffset Created = DateTimeOffset.Parse("2026-11-01T12:00:00Z");

    private readonly TempFolder _folder = new();
    private readonly JsonRepository<Goal> _goals;
    private readonly JsonRepository<Project> _projects;
    private readonly JsonRepository<Session> _sessions;
    private readonly JsonRepository<NoteNode> _notes;
    private readonly NoteService _noteService;
    private readonly PostContextService _service;

    public PostContextServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        _goals = new JsonRepository<Goal>(store, GoalsModule.FileName, GoalsModule.Schema);
        _projects = new JsonRepository<Project>(store, ProjectsModule.FileName, ProjectsModule.Schema);
        _sessions = new JsonRepository<Session>(store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema);
        _notes = new JsonRepository<NoteNode>(store, NotesModule.IndexFileName, NotesModule.IndexSchema);
        _noteService = new NoteService(_notes, store, new FixedTimeProvider(Created));
        _service = new PostContextService(_projects, _goals, _sessions, _notes, _noteService);
    }

    public void Dispose() => _folder.Dispose();

    private async Task AddProject(string? url = "https://github.com/me/todo")
    {
        await _goals.UpsertAsync(new Goal("g", "Learn ASP.NET Core", null, null, false, Created), default);
        await _projects.UpsertAsync(new Project("p", "g", "Todo API", url, false, Created), default);
    }

    private Task AddSession(string id, string startedAt, string projectId = "p", bool completed = true, string? note = null, string[]? tags = null)
    {
        var start = DateTimeOffset.Parse(startedAt);
        return _sessions.UpsertAsync(
            new Session(id, "g", projectId, tags ?? [], start, start.AddMinutes(25), 25, completed, note), default);
    }

    private async Task<string> AddPage(string title, string text)
    {
        var node = await _noteService.CreateAsync(new NoteCreateInput(null, NoteNode.Page, title), default);
        await _noteService.SaveContentAsync(node.Id, new NoteContentInput(new JsonArray(new JsonObject
        {
            ["type"] = "paragraph",
            ["content"] = new JsonArray(new JsonObject { ["type"] = "text", ["text"] = text }),
        })), default);
        return node.Id;
    }

    private Task<DraftContext> Build(params string[] noteIds) =>
        _service.BuildAsync(new ProjectContextInput("p", noteIds), default);

    [Fact]
    public async Task Holds_the_project_numbers_notes_and_pages()
    {
        await AddProject();
        await AddSession("a", "2026-11-02T12:00:00Z", note: "Older note", tags: ["di"]);
        await AddSession("b", "2026-11-03T12:00:00Z", note: " Newer note ", tags: ["di", "ef-core"]);
        await AddSession("c", "2026-11-04T12:00:00Z", completed: false, note: "Stopped note", tags: ["x"]);
        await AddSession("d", "2026-11-05T12:00:00Z", projectId: "other", note: "Other project");
        var page = await AddPage("DI notes", "Scoped lives per request.");

        var context = await Build(page);

        Assert.Equal("Todo API", context.Topic);
        Assert.Equal(
            """
            Project: Todo API
            Goal: Learn ASP.NET Core
            Project link: https://github.com/me/todo
            Completed sessions: 2 (50 minutes), 2026-11-02 to 2026-11-03
            Tags: di (2), ef-core (1), x (1)

            Session notes, newest first:
            - 2026-11-04: Stopped note
            - 2026-11-03: Newer note
            - 2026-11-02: Older note

            Note page "DI notes":
            Scoped lives per request.
            """.ReplaceLineEndings("\n"),
            context.Text.ReplaceLineEndings("\n"));
    }

    [Fact]
    public async Task Lines_without_data_are_left_out()
    {
        await AddProject(url: null);

        var context = await Build();

        Assert.Equal("Project: Todo API\nGoal: Learn ASP.NET Core", context.Text.ReplaceLineEndings("\n"));
    }

    [Fact]
    public async Task Caps_the_session_notes_and_the_page_text()
    {
        await AddProject();
        for (var i = 0; i < 52; i++)
        {
            await AddSession($"s{i}", DateTimeOffset.Parse("2026-11-01T12:00:00Z").AddMinutes(i * 30).ToString("O"), note: $"n{i}");
        }

        var page = await AddPage("Long", new string('a', PostContextService.MaxPageText + 10));

        var context = await Build(page);

        Assert.Contains(": n51", context.Text, StringComparison.Ordinal);
        Assert.DoesNotContain(": n1\n", context.Text.ReplaceLineEndings("\n"), StringComparison.Ordinal);
        Assert.Contains(new string('a', PostContextService.MaxPageText) + "…", context.Text, StringComparison.Ordinal);
        Assert.DoesNotContain(new string('a', PostContextService.MaxPageText + 1), context.Text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Bad_ids_are_field_errors()
    {
        await AddProject();
        var folder = await _noteService.CreateAsync(new NoteCreateInput(null, NoteNode.Folder, "F"), default);

        var project = await Assert.ThrowsAsync<ValidationException>(() => _service.BuildAsync(new ProjectContextInput("x", []), default));
        Assert.Contains("projectId", project.Errors.Keys);

        foreach (var ids in new[] { ["missing"], [folder.Id], Enumerable.Range(0, 11).Select(i => $"n{i}").ToArray() })
        {
            var note = await Assert.ThrowsAsync<ValidationException>(() => Build(ids));
            Assert.Contains("noteIds", note.Errors.Keys);
        }
    }
}

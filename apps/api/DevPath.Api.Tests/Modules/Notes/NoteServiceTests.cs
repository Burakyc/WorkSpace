using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Notes;

public sealed class NoteServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 11, 5, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _clock = new(Start);
    private readonly NoteService _notes;

    public NoteServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        _notes = new NoteService(
            new JsonRepository<NoteNode>(store, NotesModule.IndexFileName, NotesModule.IndexSchema), store, _clock);
    }

    public void Dispose() => _folder.Dispose();

    private static readonly CancellationToken None = CancellationToken.None;

    private Task<NoteNode> Create(string title, string kind = NoteNode.Page, string? parentId = null) =>
        _notes.CreateAsync(new NoteCreateInput(parentId, kind, title), None);

    private string PageFile(string id) => _folder.File(NotesModule.PagePath(id));

    private async Task<List<string>> Titles(string? parentId) =>
        [.. (await _notes.ListAsync(None)).Where(n => n.ParentId == parentId).Select(n => n.Title)];

    private static async Task<IReadOnlyDictionary<string, string[]>> Errors(Func<Task> act) =>
        (await Assert.ThrowsAsync<ValidationException>(act)).Errors;

    [Fact]
    public async Task Create_orders_siblings_and_writes_an_empty_file_for_pages_only()
    {
        var folder = await Create("  ASP.NET  ", NoteNode.Folder);
        var page = await Create("Notes");
        var child = await Create("DI", parentId: folder.Id);

        Assert.Equal(new NoteNode(folder.Id, null, "folder", "ASP.NET", 0, Start, Start), folder);
        Assert.Equal(1, page.Order);
        Assert.Equal((folder.Id, 0), (child.ParentId, child.Order));
        Assert.False(File.Exists(PageFile(folder.Id)));
        var file = JsonNode.Parse(await File.ReadAllTextAsync(PageFile(child.Id)))!;
        Assert.Equal(1, file["schemaVersion"]!.GetValue<int>());
        Assert.Empty(file["blocks"]!.AsArray());
        var index = JsonNode.Parse(await File.ReadAllTextAsync(_folder.File(NotesModule.IndexFileName)))!;
        Assert.Equal(3, index["items"]!.AsArray().Count);
    }

    [Fact]
    public async Task Create_rejects_bad_input()
    {
        Assert.Equal(["Başlık gerekli."], (await Errors(() => Create("  ")))["title"]);
        Assert.Equal(["Başlık en fazla 200 karakter olabilir."], (await Errors(() => Create(new string('a', 201))))["title"]);
        Assert.Equal(["Tür klasör veya sayfa olmalı."], (await Errors(() => Create("A", "note")))["kind"]);
        Assert.Equal(["Üst öğe bulunamadı."], (await Errors(() => Create("A", parentId: "missing")))["parentId"]);
        Assert.Empty(await _notes.ListAsync(None));
    }

    [Fact]
    public async Task Rename_trims_and_updates_the_time_only_when_the_title_changes()
    {
        var page = await Create("DI");
        _clock.Now = Start.AddHours(1);

        var same = await _notes.RenameAsync(page.Id, new NoteRenameInput("DI "), None);
        var renamed = await _notes.RenameAsync(page.Id, new NoteRenameInput(" Dependency injection "), None);

        Assert.Equal(Start, same!.UpdatedAt);
        Assert.Equal(("Dependency injection", Start.AddHours(1)), (renamed!.Title, renamed.UpdatedAt));
        Assert.Null(await _notes.RenameAsync("missing", new NoteRenameInput("X"), None));
        await Errors(() => _notes.RenameAsync(page.Id, new NoteRenameInput(""), None));
    }

    [Fact]
    public async Task Move_makes_the_node_the_last_child_and_keeps_its_updated_time()
    {
        var folder = await Create("Folder", NoteNode.Folder);
        await Create("First", parentId: folder.Id);
        var page = await Create("Page");
        _clock.Now = Start.AddHours(1);

        var moved = await _notes.MoveAsync(page.Id, new NoteMoveInput(folder.Id), None);

        Assert.Equal((folder.Id, 1, Start), (moved!.ParentId, moved.Order, moved.UpdatedAt));
        Assert.Equal(["First", "Page"], await Titles(folder.Id));

        var back = await _notes.MoveAsync(page.Id, new NoteMoveInput(null), None);
        Assert.Equal((null, 1), (back!.ParentId, back.Order));
        Assert.Null(await _notes.MoveAsync("missing", new NoteMoveInput(null), None));
    }

    [Fact]
    public async Task Move_into_itself_or_a_descendant_is_rejected()
    {
        var top = await Create("Top", NoteNode.Folder);
        var child = await Create("Child", parentId: top.Id);
        var grandchild = await Create("Grandchild", parentId: child.Id);

        var self = await Errors(() => _notes.MoveAsync(top.Id, new NoteMoveInput(top.Id), None));
        var own = await Errors(() => _notes.MoveAsync(top.Id, new NoteMoveInput(grandchild.Id), None));
        var missing = await Errors(() => _notes.MoveAsync(top.Id, new NoteMoveInput("missing"), None));

        Assert.Equal(["Bir öğe kendi içine veya alt öğelerinden birine taşınamaz."], self["parentId"]);
        Assert.Equal(self["parentId"], own["parentId"]);
        Assert.Equal(["Üst öğe bulunamadı."], missing["parentId"]);
        Assert.Null((await _notes.ListAsync(None)).Single(n => n.Id == top.Id).ParentId);
    }

    [Fact]
    public async Task Shift_swaps_with_a_neighbour_and_stops_at_the_edges()
    {
        var a = await Create("A");
        await Create("B");
        var c = await Create("C");

        await _notes.ShiftAsync(a.Id, new NoteShiftInput(1), None);
        Assert.Equal(["B", "A", "C"], await Titles(null));

        await _notes.ShiftAsync(c.Id, new NoteShiftInput(-1), None);
        Assert.Equal(["B", "C", "A"], await Titles(null));

        await _notes.ShiftAsync(a.Id, new NoteShiftInput(1), None);
        var first = (await _notes.ListAsync(None))[0];
        await _notes.ShiftAsync(first.Id, new NoteShiftInput(-1), None);
        Assert.Equal(["B", "C", "A"], await Titles(null));

        Assert.Equal(["Kaydırma -1 veya 1 olmalı."], (await Errors(() => _notes.ShiftAsync(a.Id, new NoteShiftInput(2), None)))["offset"]);
        Assert.Null(await _notes.ShiftAsync("missing", new NoteShiftInput(1), None));
    }

    [Fact]
    public async Task Delete_removes_the_node_its_descendants_and_their_files()
    {
        var top = await Create("Top");
        var child = await Create("Child", NoteNode.Folder, top.Id);
        var grandchild = await Create("Grandchild", parentId: child.Id);
        var sibling = await Create("Sibling");

        Assert.True(await _notes.DeleteAsync(top.Id, None));

        Assert.Equal([sibling.Id], (await _notes.ListAsync(None)).Select(n => n.Id));
        Assert.False(File.Exists(PageFile(top.Id)));
        Assert.False(File.Exists(PageFile(grandchild.Id)));
        Assert.True(File.Exists(PageFile(sibling.Id)));
        Assert.False(await _notes.DeleteAsync("missing", None));
    }

    [Fact]
    public async Task Content_round_trip_sets_the_updated_time()
    {
        var page = await Create("DI");
        Assert.Empty((await _notes.GetContentAsync(page.Id, None))!.Blocks);
        _clock.Now = Start.AddHours(2);
        var blocks = JsonNode.Parse("""[{"id":"a","type":"paragraph","content":[]},{"id":"b","type":"heading"}]""");

        var saved = await _notes.SaveContentAsync(page.Id, new NoteContentInput(blocks), None);

        Assert.Equal(Start.AddHours(2), saved!.UpdatedAt);
        Assert.Equal(Start.AddHours(2), (await _notes.ListAsync(None)).Single().UpdatedAt);
        Assert.True(JsonNode.DeepEquals(blocks, (await _notes.GetContentAsync(page.Id, None))!.Blocks));
        var file = JsonNode.Parse(await File.ReadAllTextAsync(PageFile(page.Id)))!;
        Assert.Equal(1, file["schemaVersion"]!.GetValue<int>());
        Assert.Equal(2, file["blocks"]!.AsArray().Count);
    }

    [Fact]
    public async Task Content_rejects_folders_bad_blocks_and_unknown_ids()
    {
        var folder = await Create("Folder", NoteNode.Folder);
        var page = await Create("Page");

        Assert.Null(await _notes.GetContentAsync("missing", None));
        Assert.Null(await _notes.SaveContentAsync("missing", new NoteContentInput(new JsonArray()), None));
        Assert.Equal(["Klasörlerin içeriği yoktur."], (await Errors(() => _notes.GetContentAsync(folder.Id, None)))["id"]);
        Assert.Equal(["Klasörlerin içeriği yoktur."], (await Errors(() => _notes.SaveContentAsync(folder.Id, new NoteContentInput(new JsonArray()), None)))["id"]);
        Assert.Equal(["İçerik bir blok listesi olmalı."], (await Errors(() => _notes.SaveContentAsync(page.Id, new NoteContentInput(new JsonObject()), None)))["blocks"]);
        Assert.Equal(["İçerik bir blok listesi olmalı."], (await Errors(() => _notes.SaveContentAsync(page.Id, new NoteContentInput(null), None)))["blocks"]);
    }

    [Fact]
    public async Task A_page_without_a_file_reads_as_empty()
    {
        var page = await Create("Page");
        File.Delete(PageFile(page.Id));

        Assert.Empty((await _notes.GetContentAsync(page.Id, None))!.Blocks);
    }
}

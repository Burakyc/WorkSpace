using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Notes;

public sealed class NoteSearchServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);
    private static readonly CancellationToken None = CancellationToken.None;

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _clock = new(Start);
    private readonly NoteService _notes;
    private readonly NoteSearchService _search;

    public NoteSearchServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        var nodes = new JsonRepository<NoteNode>(store, NotesModule.IndexFileName, NotesModule.IndexSchema);
        _notes = new NoteService(nodes, store, _clock);
        _search = new NoteSearchService(nodes, _notes);
    }

    public void Dispose() => _folder.Dispose();

    /// <summary>Creates a page with one paragraph per text, an hour after the previous one.</summary>
    private async Task<NoteNode> Page(string title, string? parentId = null, params string[] paragraphs)
    {
        _clock.Now = _clock.Now.AddHours(1);
        var page = await _notes.CreateAsync(new NoteCreateInput(parentId, NoteNode.Page, title), None);
        var blocks = new JsonArray([.. paragraphs.Select(p => (JsonNode)new JsonObject
        {
            ["type"] = "paragraph",
            ["content"] = new JsonArray(new JsonObject { ["type"] = "text", ["text"] = p }),
        })]);
        await _notes.SaveContentAsync(page.Id, new NoteContentInput(blocks), None);
        return page;
    }

    private async Task<List<string>> Titles(string query) => [.. (await _search.SearchAsync(query, None)).Select(r => r.Title)];

    [Fact]
    public async Task Every_word_must_match_ignoring_case_and_turkish_letters()
    {
        var folder = await _notes.CreateAsync(new NoteCreateInput(null, NoteNode.Folder, "Dependency folder"), None);
        await Page("Dependency Injection", folder.Id, "Servisler constructor ile alınır.");
        await Page("Başlangıç", null, "ilk notlar");
        await Page("Only dependency", null, "nothing else");

        Assert.Equal(["Dependency Injection"], await Titles("dependency inj"));
        Assert.Equal(["Başlangıç"], await Titles("baslangic"));
        Assert.Equal(["Dependency Injection"], await Titles("SERVİSLER alinir"));
        Assert.DoesNotContain("Dependency folder", await Titles("dependency"));

        var result = (await _search.SearchAsync("injection", None)).Single();
        Assert.Equal(["Dependency folder"], result.Path);
    }

    [Fact]
    public async Task Title_matches_come_first_then_the_newest()
    {
        await Page("Lifetimes", null, "about scoped services");
        await Page("Scoped services", null, "title match, older than the next one");
        await Page("Notes", null, "scoped in the text, newest");
        await Page("Other", null, "scoped too");

        Assert.Equal(["Scoped services", "Other", "Notes", "Lifetimes"], await Titles("scoped"));
    }

    [Fact]
    public async Task At_most_fifty_results()
    {
        for (var i = 0; i < 55; i++)
        {
            await _notes.CreateAsync(new NoteCreateInput(null, NoteNode.Page, $"Page {i}"), None);
        }

        Assert.Equal(NoteSearchService.MaxResults, (await _search.SearchAsync("page", None)).Count);
    }

    [Fact]
    public async Task Snippet_surrounds_the_first_match_and_marks_every_match()
    {
        var before = string.Join(' ', Enumerable.Repeat("filler", 20));
        await Page("Long", null, before + " the Scope ends", "scope again " + new string('x', 200));

        var result = (await _search.SearchAsync("scope", None)).Single();

        Assert.StartsWith("…", result.Snippet);
        Assert.EndsWith("…", result.Snippet);
        Assert.Equal(1 + NoteSearchService.SnippetLength + 1, result.Snippet.Length);
        Assert.Equal(2, result.Highlights.Count);
        Assert.All(result.Highlights, h => Assert.Equal("scope", result.Snippet.Substring(h.Start, h.Length).ToLowerInvariant()));
    }

    [Fact]
    public async Task Overlapping_matches_are_merged_and_title_only_matches_show_the_start()
    {
        await Page("Short", null, "dependency");
        await Page("Inject", null, "plain text here");

        var merged = (await _search.SearchAsync("depend pend", None)).Single();
        Assert.Equal([new Highlight(0, 6)], merged.Highlights);

        var titleOnly = (await _search.SearchAsync("inject", None)).Single();
        Assert.Equal("plain text here", titleOnly.Snippet);
        Assert.Empty(titleOnly.Highlights);
    }

    [Theory]
    [InlineData("a")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Short_queries_are_rejected(string? query)
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => _search.SearchAsync(query, None));
        Assert.Equal(["Arama 2 ile 200 karakter arasında olmalı."], error.Errors["q"]);
        await Assert.ThrowsAsync<ValidationException>(() => _search.SearchAsync(new string('a', 201), None));
    }
}

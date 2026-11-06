using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;
using DevPath.Api.Tests.Infrastructure.Storage;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ContentServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Start);
    private readonly ImportService _imports;
    private readonly ContentService _service;

    public ContentServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_folder.Path));
        _imports = new ImportService(store, _time);
        _service = new ContentService(store, new DataDirectory(_folder.Path), _time, NullLogger<ContentService>.Instance);
    }

    public void Dispose() => _folder.Dispose();

    [Fact]
    public async Task Lists_topics_alphabetically_with_counts()
    {
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(topic: "Dil bilgisi", terms: ["a", "b", "c"]), default);
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(topic: "Çalışma", level: "A2", terms: ["d"]), default);
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(topic: "Akşam", terms: ["e"]), default);
        var dil = await _service.GetAsync("vocab", "dil-bilgisi", default);
        var ids = dil!["items"]!.AsArray().Select(i => i!["id"]!.GetValue<string>()).ToList();
        await _service.MarkAsync("vocab", "dil-bilgisi", ids[0], "known", default);
        await _service.MarkAsync("vocab", "dil-bilgisi", ids[1], "known", default);
        await _service.MarkAsync("vocab", "dil-bilgisi", ids[2], "repeat", default);

        var topics = await _service.ListAsync("vocab", default);

        Assert.Equal(["Akşam", "Çalışma", "Dil bilgisi"], topics.Select(t => t.Topic));
        var summary = topics[2];
        Assert.Equal(("dil-bilgisi", "B2", 3), (summary.Slug, summary.Level, summary.ItemCount));
        Assert.Equal(["english", "work"], summary.Tags);
        Assert.Equal(new Dictionary<string, int> { ["known"] = 2, ["repeat"] = 1 }, summary.Marks);
        Assert.Empty(topics[1].Marks);
    }

    [Fact]
    public async Task No_folder_gives_an_empty_list_and_a_bad_file_is_skipped()
    {
        Assert.Empty(await _service.ListAsync("lesson", default));

        await _imports.ImportAsync("vocab", ImportSamples.Vocab(), default);
        await File.WriteAllTextAsync(_folder.File("content/english/broken.json"), "{ not json");
        await File.WriteAllTextAsync(_folder.File("content/english/odd.json"), "{ \"schemaVersion\": 1 }");
        await File.WriteAllTextAsync(_folder.File("content/english/Not A Slug.json"), "{}");

        var topics = await _service.ListAsync("vocab", default);

        Assert.Equal(["phrasal-verbs-for-meetings"], topics.Select(t => t.Slug));
    }

    [Fact]
    public async Task Gets_a_topic_as_stored_without_its_schema_version()
    {
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(), default);

        var topic = await _service.GetAsync("vocab", "phrasal-verbs-for-meetings", default);

        Assert.False(topic!.ContainsKey("schemaVersion"));
        Assert.Equal("follow up on", topic["items"]![0]!["term"]!.GetValue<string>());
        Assert.Null(await _service.GetAsync("vocab", "missing", default));
        Assert.Null(await _service.GetAsync("vocab", "../english/x", default));
        Assert.Null(await _service.GetAsync("vocab", "A b", default));
    }

    [Fact]
    public async Task Sets_and_removes_a_mark_without_touching_the_topic_date()
    {
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(), default);
        var id = (await _service.GetAsync("vocab", "phrasal-verbs-for-meetings", default))!["items"]![0]!["id"]!.GetValue<string>();
        _time.Now = Start.AddHours(2);

        var marked = await _service.MarkAsync("vocab", "phrasal-verbs-for-meetings", id, "known", default);

        Assert.Equal("known", marked!["mark"]!.GetValue<string>());
        Assert.Equal(Start.AddHours(2), marked["markedAt"]!.GetValue<DateTimeOffset>());
        var topic = await _service.GetAsync("vocab", "phrasal-verbs-for-meetings", default);
        Assert.Equal(Start, topic!["updatedAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal("known", topic["items"]![0]!["mark"]!.GetValue<string>());

        var cleared = await _service.MarkAsync("vocab", "phrasal-verbs-for-meetings", id, null, default);

        Assert.False(cleared!.ContainsKey("mark"));
        Assert.False(cleared.ContainsKey("markedAt"));
    }

    [Fact]
    public async Task Unknown_topics_and_items_give_null()
    {
        await _imports.ImportAsync("vocab", ImportSamples.Vocab(), default);

        Assert.Null(await _service.MarkAsync("vocab", "phrasal-verbs-for-meetings", "missing", "known", default));
        Assert.Null(await _service.MarkAsync("vocab", "missing", "x", "known", default));
        Assert.False(File.Exists(_folder.File("content/english/missing.json")));
    }

    [Fact]
    public async Task A_mark_the_type_does_not_have_is_rejected()
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => _service.MarkAsync("vocab", "x", "y", "done", default));

        Assert.Equal(["Geçersiz işaret."], error.Errors["mark"]);
    }

    [Fact]
    public async Task Interview_questions_can_be_marked_practised_only()
    {
        await _imports.ImportAsync("interview", ImportSamples.Interview(), default);
        var id = (await _service.GetAsync("interview", "asp-net-core", default))!["items"]![0]!["id"]!.GetValue<string>();

        await _service.MarkAsync("interview", "asp-net-core", id, "practised", default);

        Assert.Equal(new Dictionary<string, int> { ["practised"] = 1 }, (await _service.ListAsync("interview", default))[0].Marks);
        var error = await Assert.ThrowsAsync<ValidationException>(() => _service.MarkAsync("interview", "asp-net-core", id, "known", default));
        Assert.Equal(["Geçersiz işaret."], error.Errors["mark"]);
    }

    [Fact]
    public async Task Lesson_progress_counts_done_parts()
    {
        var lesson = ImportSamples.Lesson().Replace("\"items\": [", "\"items\": [{ \"title\": \"Third\", \"summary\": \"s\", \"body\": \"b\" },");
        await _imports.ImportAsync("lesson", lesson, default);
        var ids = (await _service.GetAsync("lesson", "dependency-injection", default))!["items"]!.AsArray()
            .Select(i => i!["id"]!.GetValue<string>()).ToList();

        await _service.MarkAsync("lesson", "dependency-injection", ids[0], "done", default);
        await _service.MarkAsync("lesson", "dependency-injection", ids[2], "done", default);

        var summary = Assert.Single(await _service.ListAsync("lesson", default));
        Assert.Equal((3, 2), (summary.ItemCount, summary.Marks["done"]));
        await Assert.ThrowsAsync<ValidationException>(() => _service.MarkAsync("lesson", "dependency-injection", ids[1], "known", default));
    }
}

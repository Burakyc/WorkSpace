using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ImportServiceTests : IDisposable
{
    private const string TopicFile = "content/english/phrasal-verbs-for-meetings.json";

    private static readonly DateTimeOffset Start = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly JsonFileStore _store;
    private readonly FixedTimeProvider _time = new(Start);
    private readonly ImportService _service;

    public ImportServiceTests()
    {
        _store = new JsonFileStore(new DataDirectory(_folder.Path));
        _service = new ImportService(_store, _time);
    }

    public void Dispose() => _folder.Dispose();

    [Fact]
    public async Task The_first_import_creates_the_topic_file()
    {
        var result = await _service.ImportAsync("vocab", ImportSamples.Vocab(terms: ["follow up on", "touch base"]), default);

        Assert.Empty(result.Errors);
        Assert.Equal(new ImportReport("vocab", "Phrasal verbs for meetings", "phrasal-verbs-for-meetings", true, 2, 0, false), result.Report);
        var topic = await ReadTopicAsync();
        Assert.Equal(1, topic["schemaVersion"]!.GetValue<int>());
        Assert.Equal("B2", topic["level"]!.GetValue<string>());
        Assert.Equal(["english", "work"], Strings(topic["tags"]));
        var item = topic["items"]![0]!.AsObject();
        Assert.True(Guid.TryParse(item["id"]!.GetValue<string>(), out _));
        Assert.Equal(Start, item["addedAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal(["id", "addedAt", "term", "meaning", "example"], item.Select(p => p.Key));
    }

    [Fact]
    public async Task A_second_import_adds_new_items_and_never_changes_existing_ones()
    {
        await _service.ImportAsync("vocab", ImportSamples.Vocab(terms: ["follow up on", "touch base"]), default);
        await MarkFirstItemKnownAsync();
        var firstId = (await ReadTopicAsync())["items"]![0]!["id"]!.GetValue<string>();
        _time.Now = Start.AddHours(1);

        var result = await _service.ImportAsync(
            "vocab",
            ImportSamples.Vocab(topic: "PHRASAL verbs for meetings", level: "C1", tags: ["work", "Meetings"], terms: ["Follow  Up ON", "circle back", "touch base "]),
            default);

        Assert.Equal(new ImportReport("vocab", "Phrasal verbs for meetings", "phrasal-verbs-for-meetings", false, 1, 2, true), result.Report);
        var topic = await ReadTopicAsync();
        Assert.Equal("Phrasal verbs for meetings", topic["topic"]!.GetValue<string>());
        Assert.Equal("B2", topic["level"]!.GetValue<string>());
        Assert.Equal(["english", "work", "meetings"], Strings(topic["tags"]));
        Assert.Equal(Start.AddHours(1), topic["updatedAt"]!.GetValue<DateTimeOffset>());
        var items = topic["items"]!.AsArray();
        Assert.Equal(["follow up on", "touch base", "circle back"], items.Select(i => i!["term"]!.GetValue<string>()));
        Assert.Equal(firstId, items[0]!["id"]!.GetValue<string>());
        Assert.Equal("follow up on anlamı", items[0]!["meaning"]!.GetValue<string>());
        Assert.Equal("known", items[0]!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Nothing_is_written_when_everything_already_exists()
    {
        await _service.ImportAsync("vocab", ImportSamples.Vocab(), default);
        var before = await File.ReadAllTextAsync(_folder.File(TopicFile));
        _time.Now = Start.AddDays(1);

        var result = await _service.ImportAsync("vocab", ImportSamples.Vocab(), default);

        Assert.Equal((0, 1), (result.Report!.Added, result.Report.Skipped));
        Assert.Equal(before, await File.ReadAllTextAsync(_folder.File(TopicFile)));
    }

    [Fact]
    public async Task Duplicates_inside_one_file_are_added_once()
    {
        var result = await _service.ImportAsync("vocab", ImportSamples.Vocab(terms: ["touch base", "Touch base", "touch base"]), default);

        Assert.Equal((1, 2), (result.Report!.Added, result.Report.Skipped));
        Assert.Single((await ReadTopicAsync())["items"]!.AsArray());
    }

    [Fact]
    public async Task Invalid_text_is_never_saved()
    {
        var result = await _service.ImportAsync("vocab", ImportSamples.Vocab().Replace("\"meaning\"", "\"meanin\""), default);

        Assert.Null(result.Report);
        Assert.NotEmpty(result.Errors);
        Assert.False(Directory.Exists(_folder.File("content")));
    }

    [Fact]
    public async Task Each_type_goes_to_its_module_folder_and_question_tags_are_normalized()
    {
        await _service.ImportAsync("lesson", ImportSamples.Lesson(), default);
        await _service.ImportAsync("interview", ImportSamples.Interview(), default);

        Assert.True(File.Exists(_folder.File("content/learning/dependency-injection.json")));
        var interview = await _store.ReadAsync("content/interview/asp-net-core.json", ContentModule.TopicSchema, default);
        Assert.Equal(["di"], Strings(interview!["items"]![1]!["tags"]));
    }

    [Fact]
    public async Task Interview_questions_merge_by_normalized_question()
    {
        await _service.ImportAsync("interview", ImportSamples.Interview(), default);
        var again = ImportSamples.Interview()
            .Replace("What is middleware?", "  what is  MIDDLEWARE? ")
            .Replace("Scoped vs singleton?", "What is a filter?");

        var result = await _service.ImportAsync("interview", again, default);

        Assert.Equal((1, 1), (result.Report!.Added, result.Report.Skipped));
    }

    [Fact]
    public async Task Lesson_parts_merge_by_normalized_title_and_keep_their_progress()
    {
        await _service.ImportAsync("lesson", ImportSamples.Lesson(), default);
        const string file = "content/learning/dependency-injection.json";
        await _store.UpdateAsync(file, ContentModule.TopicSchema, document =>
        {
            document!["items"]![0]!["mark"] = "done";
            return document;
        }, default);
        var again = ImportSamples.Lesson().Replace("\"Why DI\"", "\"  why  di \"").Replace("\"Lifetimes\"", "\"Scopes\"");

        var result = await _service.ImportAsync("lesson", again, default);

        Assert.Equal((1, 1), (result.Report!.Added, result.Report.Skipped));
        var items = (await _store.ReadAsync(file, ContentModule.TopicSchema, default))!["items"]!.AsArray();
        Assert.Equal(["Why DI", "Lifetimes", "Scopes"], items.Select(i => i!["title"]!.GetValue<string>()));
        Assert.Equal("done", items[0]!["mark"]!.GetValue<string>());
    }

    [Fact]
    public void An_unknown_type_is_a_validation_error()
    {
        var error = Assert.Throws<ValidationException>(() => _service.Validate("x", "{}"));

        Assert.Equal(["Tür vocab, lesson veya interview olmalı."], error.Errors["type"]);
    }

    private async Task<JsonObject> ReadTopicAsync() =>
        (await _store.ReadAsync(TopicFile, ContentModule.TopicSchema, default))!;

    /// <summary>What a later phase does: a progress field on an item.</summary>
    private Task MarkFirstItemKnownAsync() =>
        _store.UpdateAsync(TopicFile, ContentModule.TopicSchema, document =>
        {
            document!["items"]![0]!["status"] = "known";
            return document;
        }, default);

    private static string[] Strings(JsonNode? array) => [.. array!.AsArray().Select(n => n!.GetValue<string>())];
}

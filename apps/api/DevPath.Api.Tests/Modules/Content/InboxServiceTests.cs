using System.Text;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;
using DevPath.Api.Modules.Settings;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class InboxServiceTests : IDisposable
{
    private readonly TempFolder _data = new();
    private readonly TempFolder _inbox = new();
    private readonly SettingsService _settings;
    private readonly InboxService _service;

    public InboxServiceTests()
    {
        var store = new JsonFileStore(new DataDirectory(_data.Path));
        _settings = new SettingsService(store);
        var time = new FixedTimeProvider(new DateTimeOffset(2026, 11, 8, 14, 30, 5, TimeSpan.Zero));
        _service = new InboxService(_settings, new ImportService(store, time), time);
    }

    public void Dispose()
    {
        _data.Dispose();
        _inbox.Dispose();
    }

    private async Task<InboxScan> ScanAsync(string type = "vocab")
    {
        await _settings.SaveAiInboxAsync("english", _inbox.Path, default);
        return await _service.ScanAsync("english", type, default);
    }

    private void Drop(string name, string text) => File.WriteAllText(_inbox.File(name), text);

    [Fact]
    public async Task An_inbox_file_of_the_post_type_becomes_a_draft()
    {
        await _settings.SaveAiInboxAsync("posts", _inbox.Path, default);
        Drop("draft.json", ImportSamples.Post());

        var scan = await _service.ScanAsync("posts", "post", default);
        Assert.Empty(Assert.Single(scan.Files).Errors);

        var import = await _service.ImportAsync("posts", "post", ["draft.json"], default);

        Assert.Equal(1, Assert.Single(import.Results).Report!.Added);
        Assert.True(File.Exists(_data.File("posts.json")));
        Assert.True(File.Exists(_inbox.File("done/draft.json")));
    }

    [Fact]
    public async Task Lists_the_modules_files_by_name_and_counts_other_types()
    {
        Drop("b.json", ImportSamples.Vocab());
        Drop("a.json", """{ "schemaVersion": 1, "type": "vocab", "topic": "T", "level": "B2", "items": [{ "term": "x" }] }""");
        Drop("lesson.json", """{ "type": "lesson" }""");
        Drop("notes.txt", "not listed");
        Directory.CreateDirectory(_inbox.File("sub"));
        Drop("sub/deep.json", ImportSamples.Vocab());

        var scan = await ScanAsync();

        Assert.Equal(_inbox.Path, scan.Folder);
        Assert.Null(scan.Error);
        Assert.Equal(["a.json", "b.json"], scan.Files.Select(file => file.Name));
        Assert.NotEmpty(scan.Files[0].Errors);
        Assert.Empty(scan.Files[1].Errors);
        Assert.Equal(1, scan.OtherTypeCount);
    }

    [Fact]
    public async Task Answers_without_a_folder_and_with_a_missing_one()
    {
        var none = await _service.ScanAsync("english", "vocab", default);
        Assert.Null(none.Folder);
        Assert.Empty(none.Files);

        await _settings.SaveAiInboxAsync("english", _inbox.Path, default);
        Directory.Delete(_inbox.Path);
        var gone = await _service.ScanAsync("english", "vocab", default);
        Directory.CreateDirectory(_inbox.Path);

        Assert.Equal("Klasör bulunamadı.", gone.Error);
        Assert.Empty(gone.Files);
    }

    [Fact]
    public async Task Refuses_an_unknown_module()
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => _service.ScanAsync("calendar", "vocab", default));

        Assert.Equal("Bilinmeyen modül.", error.Errors["module"][0]);
    }

    [Fact]
    public async Task Reads_broken_files_as_errors_and_fences_as_valid()
    {
        Drop("not-json.json", "{\n  oops\n}");
        Drop("no-type.json", """{ "topic": "T" }""");
        Drop("array.json", "[1]");
        Drop("fenced.json", "```json\n" + ImportSamples.Vocab() + "\n```");
        Drop("bom.json", "\uFEFF" + ImportSamples.Vocab());
        Drop("big.json", new string(' ', ImportValidator.MaxBytes + 1));
        File.WriteAllBytes(_inbox.File("latin.json"), Encoding.Latin1.GetBytes("""{ "type": "vocab", "topic": "ş" }""".Replace('ş', 'é')));

        var files = (await ScanAsync()).Files.ToDictionary(file => file.Name);

        Assert.Equal(2, files["not-json.json"].Errors[0].Line);
        Assert.NotEmpty(files["no-type.json"].Errors);
        Assert.NotEmpty(files["array.json"].Errors);
        Assert.Empty(files["fenced.json"].Errors);
        Assert.Empty(files["bom.json"].Errors);
        Assert.Equal("Dosya 2 MB'tan büyük olamaz.", files["big.json"].Errors[0].Message);
        Assert.Equal("Dosya okunamadı.", files["latin.json"].Errors[0].Message);
    }

    [Fact]
    public async Task Writes_a_report_next_to_an_invalid_file_and_removes_stale_ones()
    {
        Drop("bad.json", "{\n  oops\n}");
        Drop("other.json", """{ "type": "lesson" }""");
        Drop("gone.json.errors.txt", "old");
        Drop("keep.errors.txt", "not ours");

        await ScanAsync();

        Assert.StartsWith("Satır 2 · ", File.ReadAllText(_inbox.File("bad.json.errors.txt")));
        Assert.False(File.Exists(_inbox.File("other.json.errors.txt")));
        Assert.False(File.Exists(_inbox.File("gone.json.errors.txt")));
        Assert.True(File.Exists(_inbox.File("keep.errors.txt")));

        Drop("bad.json", ImportSamples.Vocab());
        await ScanAsync();

        Assert.False(File.Exists(_inbox.File("bad.json.errors.txt")));
    }

    private async Task<InboxImport> ImportAsync(params string[] names)
    {
        await _settings.SaveAiInboxAsync("english", _inbox.Path, default);
        return await _service.ImportAsync("english", "vocab", names, default);
    }

    [Fact]
    public async Task Imports_a_valid_file_and_moves_it_to_done()
    {
        Drop("a.json", ImportSamples.Vocab(terms: ["follow up on"]));
        Drop("a.json.errors.txt", "old");

        var result = Assert.Single((await ImportAsync("a.json")).Results);

        Assert.True(result.Moved);
        Assert.Equal(1, result.Report!.Added);
        Assert.Empty(result.Errors);
        Assert.False(File.Exists(_inbox.File("a.json")));
        Assert.False(File.Exists(_inbox.File("a.json.errors.txt")));
        Assert.True(File.Exists(_inbox.File("done/a.json")));
        Assert.True(File.Exists(_data.File("content/english/phrasal-verbs-for-meetings.json")));
    }

    [Fact]
    public async Task Merges_into_an_existing_topic_without_touching_old_items()
    {
        Drop("a.json", ImportSamples.Vocab(terms: ["follow up on"]));
        await ImportAsync("a.json");
        var topic = _data.File("content/english/phrasal-verbs-for-meetings.json");
        var firstId = JsonNode.Parse(File.ReadAllText(topic))!["items"]![0]!["id"]!.GetValue<string>();

        Drop("b.json", ImportSamples.Vocab(terms: ["follow up on", "touch base"]));
        var result = Assert.Single((await ImportAsync("b.json")).Results);

        Assert.Equal(1, result.Report!.Added);
        Assert.Equal(1, result.Report.Skipped);
        var items = JsonNode.Parse(File.ReadAllText(topic))!["items"]!.AsArray();
        Assert.Equal(2, items.Count);
        Assert.Equal(firstId, items[0]!["id"]!.GetValue<string>());
    }

    [Fact]
    public async Task An_invalid_file_stays_with_its_report_and_the_others_still_import()
    {
        Drop("bad.json", "{\n  oops\n}");
        Drop("good.json", ImportSamples.Vocab());

        var results = (await ImportAsync("bad.json", "good.json")).Results;

        Assert.Null(results[0].Report);
        Assert.False(results[0].Moved);
        Assert.NotEmpty(results[0].Errors);
        Assert.True(File.Exists(_inbox.File("bad.json")));
        Assert.True(File.Exists(_inbox.File("bad.json.errors.txt")));
        Assert.True(results[1].Moved);
    }

    [Theory]
    [InlineData("../inbox-outside.json")]
    [InlineData("..\\x.json")]
    [InlineData("sub/x.json")]
    [InlineData("x.txt")]
    [InlineData("missing.json")]
    public async Task Refuses_any_name_outside_the_folder_listing(string name)
    {
        Directory.CreateDirectory(_inbox.File("sub"));
        Drop("sub/x.json", ImportSamples.Vocab());
        Drop("x.txt", ImportSamples.Vocab());
        File.WriteAllText(Path.Combine(_inbox.Path, "..", "inbox-outside.json"), ImportSamples.Vocab());

        try
        {
            var result = Assert.Single((await ImportAsync(name)).Results);

            Assert.Equal("Dosya bulunamadı.", result.Errors[0].Message);
            Assert.Null(result.Report);
            Assert.False(Directory.Exists(_data.File("content")));
        }
        finally
        {
            File.Delete(Path.Combine(_inbox.Path, "..", "inbox-outside.json"));
        }
    }

    [Fact]
    public async Task A_name_clash_in_done_gets_a_timestamp_and_never_overwrites()
    {
        Directory.CreateDirectory(_inbox.File("done"));
        Drop("done/a.json", "first");
        var stamp = new DateTimeOffset(2026, 11, 8, 14, 30, 5, TimeSpan.Zero).ToLocalTime();
        var stamped = $"a-{stamp:yyyyMMdd-HHmmss}";

        Drop("a.json", ImportSamples.Vocab());
        await ImportAsync("a.json");
        Drop("a.json", ImportSamples.Vocab());
        await ImportAsync("a.json");

        Assert.Equal("first", File.ReadAllText(_inbox.File("done/a.json")));
        Assert.True(File.Exists(_inbox.File($"done/{stamped}.json")));
        Assert.True(File.Exists(_inbox.File($"done/{stamped}-2.json")));
    }
}

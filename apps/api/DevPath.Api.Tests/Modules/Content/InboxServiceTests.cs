using System.Text;
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
        _settings = new SettingsService(new JsonFileStore(new DataDirectory(_data.Path)));
        _service = new InboxService(_settings);
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
}

using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Tests.Infrastructure.Storage;

public sealed class JsonFileStoreTests : IDisposable
{
    private readonly TempFolder _folder = new();
    private readonly JsonFileStore _store;

    public JsonFileStoreTests()
    {
        _store = new JsonFileStore(new DataDirectory(_folder.Path));
    }

    public void Dispose() => _folder.Dispose();

    [Fact]
    public async Task Round_trip_returns_the_written_document()
    {
        var document = new JsonObject { ["schemaVersion"] = 1, ["items"] = new JsonArray("a", "b") };

        await _store.WriteAsync("goals.json", document, CancellationToken.None);
        var read = await _store.ReadAsync("goals.json", CancellationToken.None);

        Assert.True(JsonNode.DeepEquals(document, read));
    }

    [Fact]
    public async Task Missing_file_reads_as_null()
    {
        Assert.Null(await _store.ReadAsync("missing.json", CancellationToken.None));
    }

    [Fact]
    public async Task Interrupted_write_leaves_the_old_file_intact()
    {
        await _store.WriteAsync("goals.json", new JsonObject { ["version"] = "old" }, CancellationToken.None);
        var before = await File.ReadAllBytesAsync(_folder.File("goals.json"));
        var broken = new JsonObject
        {
            ["padding"] = new string('x', 100_000),
            ["boom"] = JsonValue.Create(new ThrowsWhileSerializing()),
        };

        await Assert.ThrowsAsync<IOException>(() => _store.WriteAsync("goals.json", broken, CancellationToken.None));

        Assert.Equal(before, await File.ReadAllBytesAsync(_folder.File("goals.json")));
        Assert.False(File.Exists(_folder.File("goals.json.tmp")));
    }

    [Fact]
    public async Task Stale_temp_file_is_ignored_and_replaced()
    {
        await _store.WriteAsync("goals.json", new JsonObject { ["v"] = 1 }, CancellationToken.None);
        await File.WriteAllTextAsync(_folder.File("goals.json.tmp"), "{ half-writ");

        var read = await _store.ReadAsync("goals.json", CancellationToken.None);
        await _store.WriteAsync("goals.json", new JsonObject { ["v"] = 2 }, CancellationToken.None);

        Assert.Equal(1, read!["v"]!.GetValue<int>());
        Assert.Equal(2, (await _store.ReadAsync("goals.json", CancellationToken.None))!["v"]!.GetValue<int>());
        Assert.False(File.Exists(_folder.File("goals.json.tmp")));
    }

    [Fact]
    public async Task Concurrent_updates_and_reads_lose_nothing()
    {
        var updates = Enumerable.Range(0, 50).Select(i => (Task)_store.UpdateAsync("list.json", document =>
        {
            document ??= new JsonObject { ["items"] = new JsonArray() };
            document["items"]!.AsArray().Add(i);
            return document;
        }, CancellationToken.None));
        var reads = Enumerable.Range(0, 50).Select(_ => (Task)_store.ReadAsync("list.json", CancellationToken.None));

        await Task.WhenAll(updates.Concat(reads));

        var items = (await _store.ReadAsync("list.json", CancellationToken.None))!["items"]!.AsArray();
        Assert.Equal(Enumerable.Range(0, 50), items.Select(item => item!.GetValue<int>()).Order());
    }

    [Fact]
    public async Task Nested_path_creates_parent_folders()
    {
        await _store.WriteAsync("notes/pages/a.json", new JsonObject(), CancellationToken.None);

        Assert.True(File.Exists(_folder.File(@"notes\pages\a.json")));
    }

    [Theory]
    [InlineData("../x.json")]
    [InlineData(@"..\x.json")]
    [InlineData(@"C:\x.json")]
    [InlineData("notes/../../x.json")]
    [InlineData("")]
    public async Task Paths_outside_the_data_folder_are_rejected(string path)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _store.WriteAsync(path, new JsonObject(), CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentException>(() => _store.ReadAsync(path, CancellationToken.None));

        Assert.False(File.Exists(Path.Combine(Path.GetDirectoryName(_folder.Path)!, "x.json")));
    }

    [Fact]
    public async Task File_on_disk_is_indented_json()
    {
        await _store.WriteAsync("goals.json", new JsonObject { ["schemaVersion"] = 1 }, CancellationToken.None);

        var text = await File.ReadAllTextAsync(_folder.File("goals.json"));

        Assert.Equal("{\n  \"schemaVersion\": 1\n}", text.ReplaceLineEndings("\n"));
    }

    private sealed class ThrowsWhileSerializing
    {
        public string Value => throw new IOException("Simulated failure in the middle of a write.");
    }
}

using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Tests.Infrastructure.Storage;

public sealed class JsonFileStoreTests : IDisposable
{
    private static readonly DocumentSchema V1 = new(1, []);

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

        await _store.WriteAsync("goals.json", V1, document, CancellationToken.None);
        var read = await _store.ReadAsync("goals.json", V1, CancellationToken.None);

        Assert.True(JsonNode.DeepEquals(document, read));
    }

    [Fact]
    public async Task Missing_file_reads_as_null()
    {
        Assert.Null(await _store.ReadAsync("missing.json", V1, CancellationToken.None));
    }

    [Fact]
    public async Task Interrupted_write_leaves_the_old_file_intact()
    {
        await _store.WriteAsync("goals.json", V1, new JsonObject { ["version"] = "old" }, CancellationToken.None);
        var before = await File.ReadAllBytesAsync(_folder.File("goals.json"));
        var broken = new JsonObject
        {
            ["padding"] = new string('x', 100_000),
            ["boom"] = JsonValue.Create(new ThrowsWhileSerializing()),
        };

        await Assert.ThrowsAsync<IOException>(() => _store.WriteAsync("goals.json", V1, broken, CancellationToken.None));

        Assert.Equal(before, await File.ReadAllBytesAsync(_folder.File("goals.json")));
        Assert.False(File.Exists(_folder.File("goals.json.tmp")));
    }

    [Fact]
    public async Task Stale_temp_file_is_ignored_and_replaced()
    {
        await _store.WriteAsync("goals.json", V1, new JsonObject { ["v"] = 1 }, CancellationToken.None);
        await File.WriteAllTextAsync(_folder.File("goals.json.tmp"), "{ half-writ");

        var read = await _store.ReadAsync("goals.json", V1, CancellationToken.None);
        await _store.WriteAsync("goals.json", V1, new JsonObject { ["v"] = 2 }, CancellationToken.None);

        Assert.Equal(1, read!["v"]!.GetValue<int>());
        Assert.Equal(2, (await _store.ReadAsync("goals.json", V1, CancellationToken.None))!["v"]!.GetValue<int>());
        Assert.False(File.Exists(_folder.File("goals.json.tmp")));
    }

    [Fact]
    public async Task Concurrent_updates_and_reads_lose_nothing()
    {
        var updates = Enumerable.Range(0, 50).Select(i => (Task)_store.UpdateAsync("list.json", V1, document =>
        {
            document ??= new JsonObject { ["items"] = new JsonArray() };
            document["items"]!.AsArray().Add(i);
            return document;
        }, CancellationToken.None));
        var reads = Enumerable.Range(0, 50).Select(_ => (Task)_store.ReadAsync("list.json", V1, CancellationToken.None));

        await Task.WhenAll(updates.Concat(reads));

        var items = (await _store.ReadAsync("list.json", V1, CancellationToken.None))!["items"]!.AsArray();
        Assert.Equal(Enumerable.Range(0, 50), items.Select(item => item!.GetValue<int>()).Order());
    }

    [Fact]
    public async Task Nested_path_creates_parent_folders()
    {
        await _store.WriteAsync("notes/pages/a.json", V1, new JsonObject(), CancellationToken.None);

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
        await Assert.ThrowsAsync<ArgumentException>(() => _store.WriteAsync(path, V1, new JsonObject(), CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentException>(() => _store.ReadAsync(path, V1, CancellationToken.None));

        Assert.False(File.Exists(Path.Combine(Path.GetDirectoryName(_folder.Path)!, "x.json")));
    }

    [Fact]
    public async Task Delete_removes_the_file_and_ignores_a_missing_one()
    {
        await _store.WriteAsync("notes/pages/a.json", V1, new JsonObject(), CancellationToken.None);

        await _store.DeleteAsync("notes/pages/a.json", CancellationToken.None);
        await _store.DeleteAsync("notes/pages/a.json", CancellationToken.None);
        await _store.DeleteAsync("missing/b.json", CancellationToken.None);

        Assert.False(File.Exists(_folder.File("notes/pages/a.json")));
        await Assert.ThrowsAsync<ArgumentException>(() => _store.DeleteAsync(@"..\x.json", CancellationToken.None));
    }

    [Fact]
    public async Task File_on_disk_is_indented_json()
    {
        await _store.WriteAsync("goals.json", V1, new JsonObject { ["schemaVersion"] = 1 }, CancellationToken.None);

        var text = await File.ReadAllTextAsync(_folder.File("goals.json"));

        Assert.Equal("{\n  \"schemaVersion\": 1\n}", text.ReplaceLineEndings("\n"));
    }

    [Fact]
    public async Task Older_file_is_migrated_and_saved_on_read()
    {
        var renameTitle = new DocumentSchema(1, [new Migration(0, document =>
        {
            document["name"] = document["title"]?.DeepClone();
            document.Remove("title");
            return document;
        })]);
        await File.WriteAllTextAsync(_folder.File("goals.json"), """{ "title": "Learn DI" }""");

        var read = await _store.ReadAsync("goals.json", renameTitle, CancellationToken.None);

        var expected = JsonNode.Parse("""{ "schemaVersion": 1, "name": "Learn DI" }""");
        Assert.True(JsonNode.DeepEquals(expected, read));
        var onDisk = JsonNode.Parse(await File.ReadAllTextAsync(_folder.File("goals.json")));
        Assert.True(JsonNode.DeepEquals(expected, onDisk));
    }

    [Fact]
    public async Task Current_file_is_not_rewritten_on_read()
    {
        var file = _folder.File("goals.json");
        await File.WriteAllTextAsync(file, """{ "schemaVersion": 1 }""");
        var lastWrite = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        File.SetLastWriteTimeUtc(file, lastWrite);

        await _store.ReadAsync("goals.json", V1, CancellationToken.None);

        Assert.Equal(lastWrite, File.GetLastWriteTimeUtc(file));
    }

    [Fact]
    public async Task Newer_file_is_refused_and_left_untouched()
    {
        var file = _folder.File("goals.json");
        await File.WriteAllTextAsync(file, """{ "schemaVersion": 5, "fromTheFuture": true }""");
        var before = await File.ReadAllBytesAsync(file);

        await Assert.ThrowsAsync<UnsupportedSchemaVersionException>(
            () => _store.ReadAsync("goals.json", V1, CancellationToken.None));
        await Assert.ThrowsAsync<UnsupportedSchemaVersionException>(
            () => _store.WriteAsync("goals.json", V1, new JsonObject(), CancellationToken.None));

        Assert.Equal(before, await File.ReadAllBytesAsync(file));
    }

    private sealed class ThrowsWhileSerializing
    {
        public string Value => throw new IOException("Simulated failure in the middle of a write.");
    }
}

using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Tests.Infrastructure.Storage;

public sealed class JsonRepositoryTests : IDisposable
{
    private const string FileName = "items.json";
    private static readonly DocumentSchema Schema = new(1, []);

    private readonly TempFolder _folder = new();
    private readonly JsonRepository<TestItem> _repository;

    public JsonRepositoryTests()
    {
        _repository = CreateRepository();
    }

    public void Dispose() => _folder.Dispose();

    [Fact]
    public async Task Missing_file_is_an_empty_list()
    {
        Assert.Empty(await _repository.GetAllAsync(CancellationToken.None));
        Assert.Null(await _repository.GetAsync("x", CancellationToken.None));
        Assert.False(File.Exists(_folder.File(FileName)));
    }

    [Fact]
    public async Task First_upsert_creates_a_versioned_file()
    {
        await _repository.UpsertAsync(new TestItem("a", "Learn DI"), CancellationToken.None);

        var onDisk = JsonNode.Parse(await File.ReadAllTextAsync(_folder.File(FileName)));
        var expected = JsonNode.Parse("""{ "schemaVersion": 1, "items": [ { "id": "a", "title": "Learn DI" } ] }""");
        Assert.True(JsonNode.DeepEquals(expected, onDisk));
    }

    [Fact]
    public async Task Upsert_replaces_an_item_in_place()
    {
        await _repository.UpsertAsync(new TestItem("a", "one"), CancellationToken.None);
        await _repository.UpsertAsync(new TestItem("b", "two"), CancellationToken.None);
        await _repository.UpsertAsync(new TestItem("a", "one, edited"), CancellationToken.None);

        Assert.Equal(
            [new TestItem("a", "one, edited"), new TestItem("b", "two")],
            await _repository.GetAllAsync(CancellationToken.None));
        Assert.Equal(new TestItem("b", "two"), await _repository.GetAsync("b", CancellationToken.None));
    }

    [Fact]
    public async Task Insert_order_is_kept()
    {
        foreach (var id in new[] { "c", "a", "b" })
        {
            await _repository.UpsertAsync(new TestItem(id, id), CancellationToken.None);
        }

        var ids = (await _repository.GetAllAsync(CancellationToken.None)).Select(item => item.Id);
        Assert.Equal(["c", "a", "b"], ids);
    }

    [Fact]
    public async Task Delete_removes_a_known_id()
    {
        await _repository.UpsertAsync(new TestItem("a", "one"), CancellationToken.None);

        Assert.True(await _repository.DeleteAsync("a", CancellationToken.None));
        Assert.Empty(await _repository.GetAllAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Delete_of_unknown_id_does_not_rewrite_the_file()
    {
        await _repository.UpsertAsync(new TestItem("a", "one"), CancellationToken.None);
        var file = _folder.File(FileName);
        var lastWrite = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        File.SetLastWriteTimeUtc(file, lastWrite);

        Assert.False(await _repository.DeleteAsync("missing", CancellationToken.None));
        Assert.False(await CreateRepository().DeleteAsync("missing-file-too", CancellationToken.None));

        Assert.Equal(lastWrite, File.GetLastWriteTimeUtc(file));
    }

    [Fact]
    public async Task Items_are_persisted()
    {
        await _repository.UpsertAsync(new TestItem("a", "one"), CancellationToken.None);

        var reopened = CreateRepository();

        Assert.Equal([new TestItem("a", "one")], await reopened.GetAllAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Concurrent_upserts_lose_nothing()
    {
        await Task.WhenAll(Enumerable.Range(0, 50)
            .Select(i => _repository.UpsertAsync(new TestItem($"id-{i}", $"item {i}"), CancellationToken.None)));

        Assert.Equal(50, (await _repository.GetAllAsync(CancellationToken.None)).Count);
    }

    private JsonRepository<TestItem> CreateRepository() =>
        new(new JsonFileStore(new DataDirectory(_folder.Path)), FileName, Schema);

    private sealed record TestItem(string Id, string Title) : IEntity;
}

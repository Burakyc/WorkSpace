using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Modules.Home;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Home;

public sealed class FeedServiceTests : IDisposable
{
    private readonly TempFolder _folder = new();
    private readonly FeedService _service;

    public FeedServiceTests()
    {
        _service = new FeedService(new DataDirectory(_folder.Path));
    }

    public void Dispose() => _folder.Dispose();

    private string FeedFile => _folder.File(FeedService.FileName);

    private static string Item(string title, string? publishedAt) => publishedAt is null
        ? $$"""{ "title": "{{title}}", "summary": "s" }"""
        : $$"""{ "title": "{{title}}", "summary": "s", "publishedAt": "{{publishedAt}}" }""";

    [Fact]
    public async Task No_file_is_missing()
    {
        var result = await _service.GetAsync(CancellationToken.None);

        Assert.Equal("missing", result.Status);
        Assert.Empty(result.Items);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public async Task Valid_file_gives_the_ten_newest_and_is_left_unchanged()
    {
        var items = new List<string> { Item("undated-1", null), Item("undated-2", null) };
        for (var day = 1; day <= 12; day++)
        {
            items.Add(Item($"day-{day}", $"2026-11-{day:00}T08:00:00Z"));
        }
        var json = $$"""{ "schemaVersion": 1, "generatedAt": "2026-11-13T07:00:00Z", "items": [{{string.Join(",", items)}}] }""";
        await File.WriteAllTextAsync(FeedFile, json);

        var result = await _service.GetAsync(CancellationToken.None);

        Assert.Equal("ok", result.Status);
        Assert.Equal(new DateTimeOffset(2026, 11, 13, 7, 0, 0, TimeSpan.Zero), result.GeneratedAt);
        Assert.Equal(
            ["day-12", "day-11", "day-10", "day-9", "day-8", "day-7", "day-6", "day-5", "day-4", "day-3"],
            result.Items.Select(i => i.Title));
        Assert.Equal(json, await File.ReadAllTextAsync(FeedFile));
    }

    [Fact]
    public async Task Undated_items_follow_dated_ones_in_file_order()
    {
        await File.WriteAllTextAsync(FeedFile, $$"""
            { "schemaVersion": 1, "generatedAt": "2026-11-06T07:00:00Z",
              "items": [{{Item("b", null)}}, {{Item("dated", "2026-11-01T00:00:00Z")}}, {{Item("a", null)}}] }
            """);

        var result = await _service.GetAsync(CancellationToken.None);

        Assert.Equal(["dated", "b", "a"], result.Items.Select(i => i.Title));
    }

    [Theory]
    [InlineData("{ not json", "$: Geçerli bir JSON değil (satır 1).")]
    [InlineData("[]", "$: Dosya bir JSON nesnesi olmalı.")]
    public async Task Broken_file_is_invalid(string content, string error)
    {
        await File.WriteAllTextAsync(FeedFile, content);

        var result = await _service.GetAsync(CancellationToken.None);

        Assert.Equal("invalid", result.Status);
        Assert.Equal([error], result.Errors);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task File_over_two_megabytes_is_invalid()
    {
        await File.WriteAllTextAsync(FeedFile, new string(' ', (int)FeedService.MaxBytes + 1));

        var result = await _service.GetAsync(CancellationToken.None);

        Assert.Equal(["$: Dosya 2 MB'den büyük olamaz."], result.Errors);
    }
}

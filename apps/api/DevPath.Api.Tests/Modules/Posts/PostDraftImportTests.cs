using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Modules.Content;
using DevPath.Api.Modules.Posts;
using DevPath.Api.Tests.Infrastructure.Storage;
using DevPath.Api.Tests.Modules.Content;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class PostDraftImportTests : IDisposable
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-09T10:00:00Z");

    private readonly TempFolder _folder = new();
    private readonly ImportService _imports;

    public PostDraftImportTests()
    {
        _imports = new ImportService(new JsonFileStore(new DataDirectory(_folder.Path)), new FixedTimeProvider(Now));
    }

    public void Dispose() => _folder.Dispose();

    private string DraftsFile => Path.Combine(_folder.Path, PostsModule.DraftsFileName);

    [Fact]
    public async Task Items_become_drafts_in_posts_json_and_no_topic_file_is_written()
    {
        var result = await _imports.ImportAsync("post", ImportSamples.Post(), CancellationToken.None);

        Assert.Empty(result.Errors);
        Assert.Equal(new ImportReport("post", "Todo API", "todo-api", true, 1, 0, false), result.Report);
        Assert.False(Directory.Exists(Path.Combine(_folder.Path, "content")));

        var stored = JsonNode.Parse(File.ReadAllText(DraftsFile))!;
        Assert.Equal(1, stored["schemaVersion"]!.GetValue<int>());
        var draft = stored["items"]![0]!;
        Assert.False(string.IsNullOrEmpty(draft["id"]!.GetValue<string>()));
        Assert.Equal("Todo API", draft["topic"]!.GetValue<string>());
        Assert.Equal("What DI taught me", draft["title"]!.GetValue<string>());
        Assert.Equal(["aspnetcore", "learning"], draft["hashtags"]!.AsArray().Select(tag => tag!.GetValue<string>()));
        Assert.Equal("https://github.com/me/todo", draft["sourceLink"]!.GetValue<string>());
        Assert.Equal(Now, draft["createdAt"]!.GetValue<DateTimeOffset>());
    }

    [Fact]
    public async Task The_same_title_is_skipped_and_the_old_draft_stays()
    {
        await _imports.ImportAsync("post", ImportSamples.Post(body: "First"), CancellationToken.None);

        var again = await _imports.ImportAsync("post", ImportSamples.Post(title: "what  di taught ME", body: "Second"), CancellationToken.None);

        Assert.Equal(0, again.Report!.Added);
        Assert.Equal(1, again.Report.Skipped);
        Assert.False(again.Report.Created);
        var items = JsonNode.Parse(File.ReadAllText(DraftsFile))!["items"]!.AsArray();
        Assert.Equal("First", Assert.Single(items)!["body"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("""{ "schemaVersion": 1, "type": "post", "topic": "T", "items": [{ "title": "A" }] }""", "/items/0", "Eksik alan: body")]
    [InlineData("""{ "schemaVersion": 1, "type": "post", "topic": "T", "items": [{ "title": "A", "body": "B", "sourceLink": "http://x.test" }] }""", "/items/0/sourceLink", "Biçimi geçersiz.")]
    [InlineData("""{ "schemaVersion": 1, "type": "post", "topic": "T", "items": [{ "title": "A", "body": "B", "hashtags": ["a b"] }] }""", "/items/0/hashtags/0", "Biçimi geçersiz.")]
    [InlineData("""{ "schemaVersion": 1, "type": "post", "topic": "T", "items": [{ "title": "A", "body": "B", "likes": 1 }] }""", "/items/0/likes", "Bilinmeyen alan: likes")]
    [InlineData("""{ "schemaVersion": 1, "type": "post", "topic": "T", "level": "beginner", "items": [{ "title": "A", "body": "B" }] }""", "/level", "Bilinmeyen alan: level")]
    public async Task Invalid_text_gives_errors_and_saves_nothing(string text, string path, string message)
    {
        var result = await _imports.ImportAsync("post", text, CancellationToken.None);

        Assert.Null(result.Report);
        Assert.Contains(result.Errors, error => error.Path == path && error.Message == message);
        Assert.False(File.Exists(DraftsFile));
    }
}

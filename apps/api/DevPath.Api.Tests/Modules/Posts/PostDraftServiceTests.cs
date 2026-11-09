using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Posts;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class PostDraftServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = DateTimeOffset.Parse("2026-11-09T10:00:00Z");

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Start.AddHours(1));
    private readonly JsonRepository<PostDraft> _repository;
    private readonly PostDraftService _service;

    public PostDraftServiceTests()
    {
        _repository = new JsonRepository<PostDraft>(
            new JsonFileStore(new DataDirectory(_folder.Path)), PostsModule.DraftsFileName, PostsModule.DraftsSchema);
        _service = new PostDraftService(_repository, _time);
    }

    public void Dispose() => _folder.Dispose();

    private Task Add(string id, DateTimeOffset createdAt) => _repository.UpsertAsync(
        new PostDraft(id, "Todo API", $"Title {id}", "Body", ["a"], "https://x.test/", "Image", createdAt, createdAt),
        CancellationToken.None);

    private static PostDraftInput Valid() => new("New title", "New body", ["#one", "two", "one"], " https://y.test/ ", " A picture ");

    [Fact]
    public async Task Lists_newest_first()
    {
        await Add("old", Start);
        await Add("new", Start.AddMinutes(1));

        Assert.Equal(["new", "old"], (await _service.ListAsync(CancellationToken.None)).Select(draft => draft.Id));
    }

    [Fact]
    public async Task An_edit_keeps_the_topic_and_creation_date()
    {
        await Add("a", Start);

        var changed = await _service.UpdateAsync("a", Valid(), CancellationToken.None);

        Assert.NotNull(changed);
        Assert.Equal("Todo API", changed.Topic);
        Assert.Equal("New title", changed.Title);
        Assert.Equal(["one", "two"], changed.Hashtags);
        Assert.Equal("https://y.test/", changed.SourceLink);
        Assert.Equal("A picture", changed.ImageSuggestion);
        Assert.Equal(Start, changed.CreatedAt);
        Assert.Equal(_time.Now, changed.UpdatedAt);
        Assert.Equal("New title", (await _repository.GetAsync("a", CancellationToken.None))!.Title);
    }

    [Fact]
    public async Task An_empty_link_and_suggestion_become_null()
    {
        await Add("a", Start);

        var changed = await _service.UpdateAsync("a", Valid() with { SourceLink = " ", ImageSuggestion = null }, CancellationToken.None);

        Assert.Null(changed!.SourceLink);
        Assert.Null(changed.ImageSuggestion);
    }

    public static TheoryData<PostDraftInput, string> Invalid => new()
    {
        { Valid() with { Title = " " }, "title" },
        { Valid() with { Title = new string('a', 121) }, "title" },
        { Valid() with { Body = "" }, "body" },
        { Valid() with { Body = new string('a', 3_001) }, "body" },
        { Valid() with { Hashtags = [.. Enumerable.Range(0, 11).Select(i => $"t{i}")] }, "hashtags" },
        { Valid() with { Hashtags = ["two words"] }, "hashtags" },
        { Valid() with { Hashtags = [new string('a', 51)] }, "hashtags" },
        { Valid() with { SourceLink = "http://x.test" }, "sourceLink" },
        { Valid() with { SourceLink = "https://x.test/" + new string('a', 2_000) }, "sourceLink" },
        { Valid() with { ImageSuggestion = new string('a', 501) }, "imageSuggestion" },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public async Task Each_limit_gives_a_field_error(PostDraftInput input, string field)
    {
        await Add("a", Start);

        var error = await Assert.ThrowsAsync<ValidationException>(() => _service.UpdateAsync("a", input, CancellationToken.None));

        Assert.Contains(field, error.Errors.Keys);
        Assert.Equal("Title a", (await _repository.GetAsync("a", CancellationToken.None))!.Title);
    }

    [Fact]
    public async Task Unknown_ids_are_reported()
    {
        Assert.Null(await _service.UpdateAsync("x", Valid(), CancellationToken.None));
        Assert.False(await _service.DeleteAsync("x", CancellationToken.None));
    }

    [Fact]
    public async Task Deletes_a_draft()
    {
        await Add("a", Start);

        Assert.True(await _service.DeleteAsync("a", CancellationToken.None));
        Assert.Empty(await _service.ListAsync(CancellationToken.None));
    }
}

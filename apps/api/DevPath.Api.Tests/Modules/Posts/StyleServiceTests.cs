using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Posts;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class StyleServiceTests : IDisposable
{
    private static readonly DateTimeOffset Start = DateTimeOffset.Parse("2026-11-09T10:00:00Z");

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Start);
    private readonly StyleService _style;

    public StyleServiceTests()
    {
        _style = new StyleService(new JsonFileStore(new DataDirectory(_folder.Path)), _time);
    }

    public void Dispose() => _folder.Dispose();

    private async Task<StylePrompt> Save(string? text)
    {
        var saved = await _style.SaveAsync(new StyleInput(text), CancellationToken.None);
        _time.Now = _time.Now.AddMinutes(1);
        return saved;
    }

    [Fact]
    public async Task Without_a_file_the_prompt_is_empty()
    {
        var style = await _style.GetAsync(CancellationToken.None);

        Assert.Equal("", style.Text);
        Assert.Null(style.UpdatedAt);
        Assert.Empty(style.History);
    }

    [Fact]
    public async Task A_changed_save_moves_the_old_text_to_the_history()
    {
        await Save("first  \n");
        var second = await Save("second");

        Assert.Equal("second", second.Text);
        Assert.Equal(Start.AddMinutes(1), second.UpdatedAt);
        var version = Assert.Single(second.History);
        Assert.Equal("first", version.Text);
        Assert.Equal(Start, version.SavedAt);
        Assert.Equal(second, await _style.GetAsync(CancellationToken.None) with { History = second.History });
        Assert.Contains("\"schemaVersion\": 1", File.ReadAllText(Path.Combine(_folder.Path, PostsModule.StyleFileName)));
    }

    [Fact]
    public async Task The_same_text_writes_nothing()
    {
        await Save("first");

        var again = await Save("first \n");

        Assert.Equal(Start, again.UpdatedAt);
        Assert.Empty(again.History);
    }

    [Fact]
    public async Task An_empty_text_is_allowed_and_is_no_version_itself()
    {
        await Save("first");
        var cleared = await Save("  ");
        var back = await Save("second");

        Assert.Equal("", cleared.Text);
        Assert.Equal("first", Assert.Single(cleared.History).Text);
        Assert.Equal("first", Assert.Single(back.History).Text);
    }

    [Fact]
    public async Task The_history_keeps_the_ten_newest()
    {
        StylePrompt last = null!;
        for (var i = 1; i <= 12; i++)
        {
            last = await Save($"v{i}");
        }

        Assert.Equal(["v11", "v10", "v9", "v8", "v7", "v6", "v5", "v4", "v3", "v2"], last.History.Select(v => v.Text));
    }

    [Fact]
    public async Task A_too_long_text_is_refused()
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => Save(new string('a', StyleService.MaxLength + 1)));

        Assert.Contains("text", error.Errors.Keys);
        Assert.Equal("", (await _style.GetAsync(CancellationToken.None)).Text);
    }
}

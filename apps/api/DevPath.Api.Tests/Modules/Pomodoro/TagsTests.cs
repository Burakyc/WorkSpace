using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Tests.Modules.Pomodoro;

public class TagsTests
{
    [Theory]
    [InlineData(" #DI ", "di")]
    [InlineData("##API", "api")]
    [InlineData("#İngilizce", "ingilizce")]
    [InlineData("clean   code", "clean-code")]
    [InlineData("ef_core-8", "ef_core-8")]
    public void Normalizes(string raw, string expected)
    {
        Assert.Equal(expected, Tags.Normalize(raw));
        Assert.True(Tags.IsValid(Tags.Normalize(raw)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("#")]
    [InlineData("a/b")]
    [InlineData("c#")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    public void Rejects_invalid_tags(string raw)
    {
        Assert.False(Tags.IsValid(Tags.Normalize(raw)));
    }

    [Fact]
    public void Drops_duplicates_and_keeps_order()
    {
        var tags = Tags.NormalizeAll(["#DI", "efcore", "di", " EFCore "], out var error);

        Assert.Null(error);
        Assert.Equal(["di", "efcore"], tags);
    }

    [Fact]
    public void Reports_too_many_or_invalid_tags()
    {
        Tags.NormalizeAll(Enumerable.Range(1, 11).Select(i => $"t{i}"), out var tooMany);
        Tags.NormalizeAll(["ok", "a/b"], out var invalid);

        Assert.Equal(Tags.TooManyMessage, tooMany);
        Assert.Equal(Tags.InvalidMessage, invalid);
    }

    [Fact]
    public void Null_is_no_tags()
    {
        Assert.Empty(Tags.NormalizeAll(null, out var error));
        Assert.Null(error);
    }
}

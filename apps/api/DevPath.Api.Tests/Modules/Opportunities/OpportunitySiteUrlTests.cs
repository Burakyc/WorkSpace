using DevPath.Api.Modules.Opportunities;

namespace DevPath.Api.Tests.Modules.Opportunities;

public class OpportunitySiteUrlTests
{
    [Theory]
    [InlineData("patika.dev", "https://patika.dev/", "patika.dev")]
    [InlineData("  https://patika.dev ", "https://patika.dev/", "patika.dev")]
    [InlineData("https://www.youthall.com/tr/jobs", "https://www.youthall.com/tr/jobs", "youthall.com")]
    [InlineData("WWW.Coderspace.IO/events?city=istanbul", "https://www.coderspace.io/events?city=istanbul", "coderspace.io")]
    public void Bare_domains_get_https_and_paths_are_kept(string input, string url, string id)
    {
        var parsed = OpportunitySiteUrl.Parse(input, out var error);

        Assert.Equal("", error);
        Assert.Equal(url, parsed!.AbsoluteUri);
        Assert.Equal(id, OpportunitySiteUrl.Id(parsed));
    }

    [Theory]
    [InlineData(null, OpportunitySiteUrl.RequiredError)]
    [InlineData("   ", OpportunitySiteUrl.RequiredError)]
    [InlineData("http://example.com", OpportunitySiteUrl.HttpsError)]
    [InlineData("ftp://example.com", OpportunitySiteUrl.HttpsError)]
    [InlineData("javascript:alert(1)", OpportunitySiteUrl.HttpsError)]
    [InlineData("localhost", OpportunitySiteUrl.FormatError)]
    [InlineData("https://user@example.com", OpportunitySiteUrl.FormatError)]
    [InlineData("example.com:8080", OpportunitySiteUrl.FormatError)]
    public void Bad_addresses_are_refused_with_their_message(string? input, string message)
    {
        Assert.Null(OpportunitySiteUrl.Parse(input, out var error));
        Assert.Equal(message, error);
    }

    [Fact]
    public void Addresses_over_2000_characters_are_refused()
    {
        var input = "example.com/" + new string('a', 1989);

        Assert.Null(OpportunitySiteUrl.Parse(input, out var error));
        Assert.Equal(OpportunitySiteUrl.LengthError, error);
        Assert.NotNull(OpportunitySiteUrl.Parse(input[..^1], out _));
    }
}

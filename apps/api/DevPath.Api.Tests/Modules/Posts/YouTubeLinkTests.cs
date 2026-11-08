using DevPath.Api.Modules.Posts;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class YouTubeLinkTests
{
    private const string Id = "abc123DEF_4";

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=abc123DEF_4")]
    [InlineData("https://youtube.com/watch?list=x&v=abc123DEF_4&t=10")]
    [InlineData("https://m.youtube.com/watch?v=abc123DEF_4")]
    [InlineData("https://www.youtube.com/shorts/abc123DEF_4")]
    [InlineData("https://www.youtube.com/live/abc123DEF_4?si=x")]
    [InlineData("https://www.youtube.com/embed/abc123DEF_4")]
    [InlineData("https://youtu.be/abc123DEF_4?t=3")]
    public void Each_form_gives_the_id(string url) => Assert.Equal(Id, YouTubeLink.VideoId(new Uri(url)));

    [Theory]
    [InlineData("https://example.com/watch?v=abc123DEF_4")]
    [InlineData("https://youtube.com.evil.test/watch?v=abc123DEF_4")]
    [InlineData("https://www.youtube.com/watch")]
    [InlineData("https://www.youtube.com/watch?v=short")]
    [InlineData("https://www.youtube.com/watch?v=abc123DEF_4/../x")]
    [InlineData("https://www.youtube.com/channel/abc123DEF_4")]
    [InlineData("https://www.youtube.com/@someone")]
    [InlineData("https://youtu.be/")]
    public void Anything_else_is_not_a_video(string url) => Assert.Null(YouTubeLink.VideoId(new Uri(url)));

    [Fact]
    public void Builds_the_urls()
    {
        Assert.Equal($"https://www.youtube.com/watch?v={Id}", YouTubeLink.WatchUrl(Id).AbsoluteUri);
        Assert.Equal(
            $"https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D{Id}&format=json",
            YouTubeLink.OEmbedUrl(Id).AbsoluteUri);
    }
}

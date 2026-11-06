using DevPath.Api.Modules.Home;

namespace DevPath.Api.Tests.Modules.Home;

public class YouTubeChannelIdTests
{
    private const string Id = "UC_x5XG1OV2P6uZZ5FSM9Ttw";

    [Theory]
    [InlineData(Id)]
    [InlineData("  " + Id + " ")]
    [InlineData("youtube.com/channel/" + Id)]
    [InlineData("https://www.youtube.com/channel/" + Id)]
    [InlineData("http://m.youtube.com/channel/" + Id)]
    [InlineData("https://www.youtube.com/channel/" + Id + "/videos")]
    [InlineData("https://www.youtube.com/channel/" + Id + "?view=0")]
    public void Ids_and_channel_urls_give_the_id(string input)
    {
        Assert.Equal(Id, YouTubeChannelId.Parse(input, out var error));
        Assert.Equal("", error);
    }

    [Theory]
    [InlineData("@GoogleDevelopers")]
    [InlineData("https://www.youtube.com/@GoogleDevelopers")]
    public void Handles_are_refused_with_a_hint(string input)
    {
        Assert.Null(YouTubeChannelId.Parse(input, out var error));
        Assert.Equal(YouTubeChannelId.HandleError, error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("UC_short")]
    [InlineData("https://evil.example/channel/" + Id)]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData(Id + "x")]
    public void Anything_else_is_a_format_error(string? input)
    {
        Assert.Null(YouTubeChannelId.Parse(input, out var error));
        Assert.Equal(YouTubeChannelId.FormatError, error);
    }
}

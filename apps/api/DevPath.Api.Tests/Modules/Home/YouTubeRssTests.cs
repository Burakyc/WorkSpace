using DevPath.Api.Modules.Home;

namespace DevPath.Api.Tests.Modules.Home;

public class YouTubeRssTests
{
    /// <summary>A channel feed shaped like YouTube's, with the entries given.</summary>
    public static string Feed(string title, params string[] entries) => $"""
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
          <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UC_x5XG1OV2P6uZZ5FSM9Ttw"/>
          <yt:channelId>UC_x5XG1OV2P6uZZ5FSM9Ttw</yt:channelId>
          <title>{title}</title>
          {string.Join("\n", entries)}
        </feed>
        """;

    public static string Entry(string videoId, string title, string published) => $"""
        <entry>
          <id>yt:video:{videoId}</id>
          <yt:videoId>{videoId}</yt:videoId>
          <title>{title}</title>
          <link rel="alternate" href="https://evil.example/{videoId}"/>
          <published>{published}</published>
          <media:group><media:thumbnail url="https://evil.example/t.jpg" width="480" height="360"/></media:group>
        </entry>
        """;

    [Fact]
    public void Parses_the_channel_title_and_videos()
    {
        var feed = YouTubeRss.Parse(Feed("Google for Developers",
            Entry("dQw4w9WgXcQ", "What&apos;s new in .NET", "2026-11-05T17:00:00+00:00"),
            Entry("abcdefghijk", " Second ", "2026-11-04T09:30:00+00:00")));

        Assert.Equal("Google for Developers", feed.Title);
        Assert.Equal(
            [
                new YouTubeVideoEntry("dQw4w9WgXcQ", "What's new in .NET", new DateTimeOffset(2026, 11, 5, 17, 0, 0, TimeSpan.Zero)),
                new YouTubeVideoEntry("abcdefghijk", "Second", new DateTimeOffset(2026, 11, 4, 9, 30, 0, TimeSpan.Zero)),
            ],
            feed.Videos);
        Assert.Equal("https://www.youtube.com/watch?v=dQw4w9WgXcQ", YouTubeRss.WatchUrl("dQw4w9WgXcQ"));
        Assert.Equal("https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg", YouTubeRss.ThumbnailUrl("dQw4w9WgXcQ"));
    }

    [Fact]
    public void Broken_entries_are_skipped()
    {
        var feed = YouTubeRss.Parse(Feed("C",
            "<entry><title>No id</title><published>2026-11-05T17:00:00+00:00</published></entry>",
            Entry("bad id!", "Bad id", "2026-11-05T17:00:00+00:00"),
            Entry("abcdefghijk", "  ", "2026-11-05T17:00:00+00:00"),
            Entry("abcdefghijl", "Bad date", "yesterday"),
            Entry("abcdefghijm", "Kept", "2026-11-05T17:00:00+00:00")));

        Assert.Equal(["Kept"], feed.Videos.Select(v => v.Title));
    }

    [Theory]
    [InlineData("not xml")]
    [InlineData("<rss><channel/></rss>")]
    [InlineData("<?xml version=\"1.0\"?><!DOCTYPE feed [<!ENTITY x \"y\">]><feed xmlns=\"http://www.w3.org/2005/Atom\"><title>&x;</title></feed>")]
    public void Non_feeds_and_dtds_are_refused(string xml)
    {
        Assert.Throws<FormatException>(() => YouTubeRss.Parse(xml));
    }
}

using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace DevPath.Api.Modules.Home;

/// <summary>One video from a channel feed. Links and thumbnails are built from <see cref="Id"/>, never taken from the feed.</summary>
public sealed record YouTubeVideoEntry(string Id, string Title, DateTimeOffset PublishedAt);

public sealed record YouTubeFeed(string Title, IReadOnlyList<YouTubeVideoEntry> Videos);

/// <summary>Parses a channel's Atom feed (https://www.youtube.com/feeds/videos.xml?channel_id=…).</summary>
public static partial class YouTubeRss
{
    private static readonly XNamespace Atom = "http://www.w3.org/2005/Atom";
    private static readonly XNamespace Yt = "http://www.youtube.com/xml/schemas/2015";

    /// <summary>The feed, skipping broken entries. Throws <see cref="FormatException"/> when the text is not a channel feed.</summary>
    public static YouTubeFeed Parse(string xml)
    {
        XDocument document;
        try
        {
            using var reader = XmlReader.Create(new StringReader(xml), new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
            });
            document = XDocument.Load(reader);
        }
        catch (XmlException ex)
        {
            throw new FormatException("The feed is not valid XML.", ex);
        }

        var feed = document.Root;
        if (feed is null || feed.Name != Atom + "feed")
        {
            throw new FormatException("The document is not an Atom feed.");
        }

        var videos = new List<YouTubeVideoEntry>();
        foreach (var entry in feed.Elements(Atom + "entry"))
        {
            var id = entry.Element(Yt + "videoId")?.Value.Trim() ?? "";
            var title = entry.Element(Atom + "title")?.Value.Trim() ?? "";
            var published = entry.Element(Atom + "published")?.Value.Trim() ?? "";
            if (VideoIdPattern().IsMatch(id) &&
                title.Length > 0 &&
                DateTimeOffset.TryParse(published, CultureInfo.InvariantCulture, DateTimeStyles.None, out var publishedAt))
            {
                videos.Add(new YouTubeVideoEntry(id, title, publishedAt));
            }
        }

        return new YouTubeFeed(feed.Element(Atom + "title")?.Value.Trim() ?? "", videos);
    }

    public static string WatchUrl(string videoId) => $"https://www.youtube.com/watch?v={videoId}";

    public static string ThumbnailUrl(string videoId) => $"https://i.ytimg.com/vi/{videoId}/mqdefault.jpg";

    [GeneratedRegex("^[A-Za-z0-9_-]{11}$")]
    private static partial Regex VideoIdPattern();
}

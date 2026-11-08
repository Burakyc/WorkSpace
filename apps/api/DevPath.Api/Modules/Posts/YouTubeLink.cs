using System.Text.RegularExpressions;
using Microsoft.AspNetCore.WebUtilities;

namespace DevPath.Api.Modules.Posts;

/// <summary>Recognizes a YouTube video link and builds the URLs read for it.</summary>
public static partial class YouTubeLink
{
    [GeneratedRegex("^[A-Za-z0-9_-]{11}$")]
    private static partial Regex VideoIdPattern();

    /// <summary>The video id, or null when this is not a YouTube video link.</summary>
    public static string? VideoId(Uri uri)
    {
        var host = uri.Host.ToLowerInvariant();
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var id = host switch
        {
            "youtu.be" => segments.FirstOrDefault(),
            "youtube.com" or "www.youtube.com" or "m.youtube.com" => segments switch
            {
                ["watch"] => QueryHelpers.ParseQuery(uri.Query).GetValueOrDefault("v").FirstOrDefault(),
                ["shorts" or "live" or "embed", var value, ..] => value,
                _ => null,
            },
            _ => null,
        };
        return id is not null && VideoIdPattern().IsMatch(id) ? id : null;
    }

    public static Uri WatchUrl(string videoId) => new($"https://www.youtube.com/watch?v={videoId}");

    public static Uri OEmbedUrl(string videoId) =>
        new($"https://www.youtube.com/oembed?url={Uri.EscapeDataString(WatchUrl(videoId).AbsoluteUri)}&format=json");
}

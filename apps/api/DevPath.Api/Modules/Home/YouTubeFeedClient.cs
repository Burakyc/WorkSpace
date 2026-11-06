using System.Net;
using System.Text;

namespace DevPath.Api.Modules.Home;

/// <summary>A fetched feed, or why there is none: the channel does not exist (<see cref="NotFound"/>) or the fetch failed.</summary>
public sealed record YouTubeFetch(YouTubeFeed? Feed, bool NotFound)
{
    public static readonly YouTubeFetch Missing = new(null, true);
    public static readonly YouTubeFetch Failed = new(null, false);
}

/// <summary>Downloads a channel's RSS through the named <c>youtube</c> client (10 s timeout, at most 2 MB).</summary>
public sealed class YouTubeFeedClient(IHttpClientFactory httpClientFactory, ILogger<YouTubeFeedClient> logger)
{
    public const string ClientName = "youtube";
    public const int MaxBytes = 2 * 1024 * 1024;

    public static Uri FeedUrl(string channelId) => new($"https://www.youtube.com/feeds/videos.xml?channel_id={channelId}");

    public async Task<YouTubeFetch> FetchAsync(string channelId, CancellationToken cancellationToken)
    {
        try
        {
            using var client = httpClientFactory.CreateClient(ClientName);
            using var response = await client.GetAsync(FeedUrl(channelId), HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return YouTubeFetch.Missing;
            }

            if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength > MaxBytes)
            {
                logger.LogWarning("YouTube feed {ChannelId} answered {Status}.", channelId, (int)response.StatusCode);
                return YouTubeFetch.Failed;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var limited = new MemoryStream();
            var buffer = new byte[81920];
            int read;
            while ((read = await stream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                if (limited.Length + read > MaxBytes)
                {
                    return YouTubeFetch.Failed;
                }
                limited.Write(buffer, 0, read);
            }

            var xml = Encoding.UTF8.GetString(limited.GetBuffer(), 0, (int)limited.Length).TrimStart('﻿');
            return new YouTubeFetch(YouTubeRss.Parse(xml), false);
        }
        catch (Exception ex) when (
            ex is HttpRequestException or FormatException ||
            (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("YouTube feed {ChannelId} could not be read: {Reason}", channelId, ex.Message);
            return YouTubeFetch.Failed;
        }
    }
}

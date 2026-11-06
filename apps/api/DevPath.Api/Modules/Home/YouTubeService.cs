using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Settings;

namespace DevPath.Api.Modules.Home;

public sealed record YouTubeChannel(string Id, string Title);

public sealed record YouTubeChannelInput(string? Input);

public sealed record YouTubeVideo(
    string Id,
    string Title,
    string ChannelId,
    string ChannelTitle,
    DateTimeOffset PublishedAt,
    string ThumbnailUrl,
    string Url);

/// <summary>GET /api/youtube/videos and POST /api/youtube/refresh.</summary>
public sealed record YouTubeVideos(IReadOnlyList<YouTubeVideo> Videos, DateTimeOffset? LastRefreshAt, string? Error);

/// <summary>cache/youtube.json: the last videos fetched per channel and how the last refresh went.</summary>
public sealed record YouTubeCache(IReadOnlyList<YouTubeCachedChannel> Channels, DateTimeOffset? LastRefreshAt, string? Error)
{
    public static readonly YouTubeCache Empty = new([], null, null);
}

public sealed record YouTubeCachedChannel(string ChannelId, DateTimeOffset FetchedAt, IReadOnlyList<YouTubeVideoEntry> Videos);

/// <summary>
/// The followed channels (settings.json, section "youtube") and their cached videos (cache/youtube.json).
/// Reading videos never fetches; only adding a channel and <see cref="RefreshAsync"/> go to the network.
/// </summary>
public sealed class YouTubeService(JsonFileStore store, YouTubeFeedClient feeds, TimeProvider time)
{
    public const string CacheFileName = "cache/youtube.json";
    public const int MaxChannels = 50;
    public const int ShownVideos = 10;
    public static readonly DocumentSchema CacheSchema = new(1, []);
    private const string Section = "youtube";

    private readonly SemaphoreSlim _refreshGate = new(1, 1);

    public async Task<IReadOnlyList<YouTubeChannel>> ListChannelsAsync(CancellationToken cancellationToken) =>
        ReadChannels(await store.ReadAsync(SettingsService.FileName, SettingsService.Schema, cancellationToken));

    /// <summary>Checks the channel against its RSS, saves it with the feed's title and caches its videos.</summary>
    public async Task<YouTubeChannel> AddChannelAsync(YouTubeChannelInput input, CancellationToken cancellationToken)
    {
        var id = YouTubeChannelId.Parse(input.Input, out var error) ?? throw InputError(error);
        var channels = await ListChannelsAsync(cancellationToken);
        if (channels.Any(c => c.Id == id))
        {
            throw InputError("Bu kanal zaten ekli.");
        }
        if (channels.Count >= MaxChannels)
        {
            throw InputError($"En fazla {MaxChannels} kanal eklenebilir.");
        }

        var fetch = await feeds.FetchAsync(id, cancellationToken);
        if (fetch.Feed is null)
        {
            throw InputError(fetch.NotFound ? "Kanal bulunamadı." : "Kanal kontrol edilemedi. İnternet bağlantını kontrol et.");
        }

        var channel = new YouTubeChannel(id, fetch.Feed.Title.Length > 0 ? fetch.Feed.Title : id);
        await store.UpdateAsync(SettingsService.FileName, SettingsService.Schema, document =>
        {
            document ??= new JsonObject();
            var saved = ReadChannels(document).Where(c => c.Id != id).Append(channel).ToList();
            document[Section] = new JsonObject { ["channels"] = JsonSerializer.SerializeToNode(saved, StorageJson.Options) };
            return document;
        }, cancellationToken);

        var fetchedAt = time.GetUtcNow();
        await UpdateCacheAsync(cache => cache with
        {
            Channels = cache.Channels.Where(c => c.ChannelId != id).Append(new YouTubeCachedChannel(id, fetchedAt, fetch.Feed.Videos)).ToList(),
        }, cancellationToken);
        return channel;
    }

    /// <summary>Removes the channel and its cached videos; false when it was not followed.</summary>
    public async Task<bool> RemoveChannelAsync(string id, CancellationToken cancellationToken)
    {
        var removed = false;
        await store.UpdateAsync(SettingsService.FileName, SettingsService.Schema, document =>
        {
            var channels = ReadChannels(document);
            if (document is null || !channels.Any(c => c.Id == id))
            {
                return null;
            }

            removed = true;
            document[Section] = new JsonObject
            {
                ["channels"] = JsonSerializer.SerializeToNode(channels.Where(c => c.Id != id).ToList(), StorageJson.Options),
            };
            return document;
        }, cancellationToken);

        if (removed)
        {
            await UpdateCacheAsync(cache => cache with { Channels = cache.Channels.Where(c => c.ChannelId != id).ToList() }, cancellationToken);
        }
        return removed;
    }

    /// <summary>The newest cached videos of the followed channels. Never fetches.</summary>
    public async Task<YouTubeVideos> GetVideosAsync(CancellationToken cancellationToken)
    {
        var channels = await ListChannelsAsync(cancellationToken);
        var cache = await ReadCacheAsync(cancellationToken);
        var titles = channels.ToDictionary(c => c.Id, c => c.Title);
        var videos = cache.Channels
            .Where(c => titles.ContainsKey(c.ChannelId))
            .SelectMany(c => c.Videos.Select(v => new YouTubeVideo(
                v.Id, v.Title, c.ChannelId, titles[c.ChannelId], v.PublishedAt, YouTubeRss.ThumbnailUrl(v.Id), YouTubeRss.WatchUrl(v.Id))))
            .OrderByDescending(v => v.PublishedAt)
            .Take(ShownVideos)
            .ToList();
        return new YouTubeVideos(videos, cache.LastRefreshAt, cache.Error);
    }

    /// <summary>How many cached videos of the followed channels were published after <paramref name="since"/>. Never fetches.</summary>
    public async Task<int> CountVideosSinceAsync(DateTimeOffset since, CancellationToken cancellationToken)
    {
        var followed = (await ListChannelsAsync(cancellationToken)).Select(c => c.Id).ToHashSet();
        return (await ReadCacheAsync(cancellationToken)).Channels
            .Where(c => followed.Contains(c.ChannelId))
            .Sum(c => c.Videos.Count(v => v.PublishedAt > since));
    }

    /// <summary>Fetches every channel; a failed channel keeps its cached videos and is named in the error.</summary>
    public async Task<YouTubeVideos> RefreshAsync(CancellationToken cancellationToken)
    {
        await _refreshGate.WaitAsync(cancellationToken);
        try
        {
            var channels = await ListChannelsAsync(cancellationToken);
            if (channels.Count > 0)
            {
                var fetched = new List<YouTubeCachedChannel>();
                var failed = new List<string>();
                foreach (var channel in channels)
                {
                    var fetch = await feeds.FetchAsync(channel.Id, cancellationToken);
                    if (fetch.Feed is null)
                    {
                        failed.Add(channel.Title);
                    }
                    else
                    {
                        fetched.Add(new YouTubeCachedChannel(channel.Id, time.GetUtcNow(), fetch.Feed.Videos));
                    }
                }

                var refreshedIds = fetched.Select(c => c.ChannelId).ToHashSet();
                await UpdateCacheAsync(cache => new YouTubeCache(
                    cache.Channels.Where(c => !refreshedIds.Contains(c.ChannelId)).Concat(fetched).ToList(),
                    time.GetUtcNow(),
                    failed.Count == 0 ? null : $"Güncellenemeyen kanallar: {string.Join(", ", failed)}."), cancellationToken);
            }
        }
        finally
        {
            _refreshGate.Release();
        }

        return await GetVideosAsync(cancellationToken);
    }

    private async Task<YouTubeCache> ReadCacheAsync(CancellationToken cancellationToken) =>
        ToCache(await store.ReadAsync(CacheFileName, CacheSchema, cancellationToken));

    private Task UpdateCacheAsync(Func<YouTubeCache, YouTubeCache> update, CancellationToken cancellationToken) =>
        store.UpdateAsync(CacheFileName, CacheSchema, document =>
            JsonSerializer.SerializeToNode(update(ToCache(document)), StorageJson.Options)!.AsObject(), cancellationToken);

    private static YouTubeCache ToCache(JsonObject? document)
    {
        try
        {
            return document?.Deserialize<YouTubeCache>(StorageJson.Options) ?? YouTubeCache.Empty;
        }
        catch (JsonException)
        {
            return YouTubeCache.Empty;
        }
    }

    private static List<YouTubeChannel> ReadChannels(JsonObject? settings)
    {
        try
        {
            return settings?[Section]?["channels"]?.Deserialize<List<YouTubeChannel>>(StorageJson.Options) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static ValidationException InputError(string message) => new(new Dictionary<string, string[]> { ["input"] = [message] });
}

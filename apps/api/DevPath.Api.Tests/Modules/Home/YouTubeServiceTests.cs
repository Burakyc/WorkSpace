using System.Net;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Home;
using DevPath.Api.Tests.Infrastructure.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using static DevPath.Api.Tests.Modules.Home.YouTubeRssTests;

namespace DevPath.Api.Tests.Modules.Home;

public sealed class YouTubeServiceTests : IDisposable
{
    private const string A = "UCaaaaaaaaaaaaaaaaaaaaaa";
    private const string B = "UCbbbbbbbbbbbbbbbbbbbbbb";
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Now);
    private readonly JsonFileStore _store;

    /// <summary>What each channel's feed answers; a missing channel is a network failure.</summary>
    private readonly Dictionary<string, Func<HttpResponseMessage>> _feeds = [];
    private readonly StubHttpHandler _http;
    private readonly YouTubeService _service;

    public YouTubeServiceTests()
    {
        _store = new JsonFileStore(new DataDirectory(_folder.Path));
        _http = new StubHttpHandler(request =>
        {
            var id = request.RequestUri!.Query.Split('=')[1];
            return _feeds.TryGetValue(id, out var answer) ? answer() : throw new HttpRequestException("offline");
        });
        var client = new YouTubeFeedClient(new StubHttpClientFactory(_http), NullLogger<YouTubeFeedClient>.Instance);
        _service = new YouTubeService(_store, client, _time);
    }

    public void Dispose() => _folder.Dispose();

    private void Serve(string channelId, string title, params (string Id, int Day)[] videos) =>
        _feeds[channelId] = () => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(Feed(title, videos.Select(v => Entry(v.Id, $"{title} {v.Day}", $"2026-11-{v.Day:00}T12:00:00Z")).ToArray())),
        };

    private static string Vid(string prefix, int n) => $"{prefix}{n:0000000000}"[..11];

    private Task<YouTubeChannel> Add(string input) => _service.AddChannelAsync(new YouTubeChannelInput(input), CancellationToken.None);

    private async Task<string> AddError(string input)
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => Add(input));
        return Assert.Single(error.Errors["input"]);
    }

    [Fact]
    public async Task Adding_saves_the_feed_title_and_caches_the_videos()
    {
        Serve(A, "Channel A", (Vid("a", 1), 1), (Vid("a", 2), 2));

        var channel = await Add($"https://www.youtube.com/channel/{A}/videos");

        Assert.Equal(new YouTubeChannel(A, "Channel A"), channel);
        Assert.Equal([channel], await _service.ListChannelsAsync(CancellationToken.None));
        Assert.Equal(new Uri($"https://www.youtube.com/feeds/videos.xml?channel_id={A}"), Assert.Single(_http.Requests).RequestUri);
        var videos = await _service.GetVideosAsync(CancellationToken.None);
        Assert.Equal(["Channel A 2", "Channel A 1"], videos.Videos.Select(v => v.Title));
        Assert.Equal("Channel A", videos.Videos[0].ChannelTitle);
        Assert.Equal($"https://www.youtube.com/watch?v={Vid("a", 2)}", videos.Videos[0].Url);
        Assert.True(File.Exists(_folder.File("cache/youtube.json")));
    }

    [Fact]
    public async Task Adding_refuses_bad_missing_unreachable_and_duplicate_channels()
    {
        Assert.Equal(YouTubeChannelId.FormatError, await AddError("hello"));

        _feeds[A] = () => new HttpResponseMessage(HttpStatusCode.NotFound);
        Assert.Equal("Kanal bulunamadı.", await AddError(A));

        _feeds.Remove(A);
        Assert.Equal("Kanal kontrol edilemedi. İnternet bağlantını kontrol et.", await AddError(A));

        _feeds[A] = () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("<html/>") };
        Assert.Equal("Kanal kontrol edilemedi. İnternet bağlantını kontrol et.", await AddError(A));

        Serve(A, "Channel A");
        await Add(A);
        Assert.Equal("Bu kanal zaten ekli.", await AddError(A));
        Assert.Single(await _service.ListChannelsAsync(CancellationToken.None));
    }

    [Fact]
    public async Task At_most_fifty_channels()
    {
        for (var i = 0; i < YouTubeService.MaxChannels; i++)
        {
            var id = $"UC{i:0000000000000000000000}";
            Serve(id, $"C{i}");
            await Add(id);
        }

        Serve(A, "One too many");
        Assert.Equal("En fazla 50 kanal eklenebilir.", await AddError(A));
    }

    [Fact]
    public async Task Refresh_replaces_every_channels_videos()
    {
        Serve(A, "A", (Vid("a", 1), 1));
        Serve(B, "B", (Vid("b", 1), 1));
        await Add(A);
        await Add(B);
        Serve(A, "A", (Vid("a", 3), 3));
        Serve(B, "B", (Vid("b", 4), 4));
        _time.Now = Now.AddHours(1);

        var result = await _service.RefreshAsync(CancellationToken.None);

        Assert.Equal(["B 4", "A 3"], result.Videos.Select(v => v.Title));
        Assert.Equal(Now.AddHours(1), result.LastRefreshAt);
        Assert.Null(result.Error);
    }

    [Fact]
    public async Task Refresh_without_channels_fetches_nothing()
    {
        var result = await _service.RefreshAsync(CancellationToken.None);

        Assert.Empty(_http.Requests);
        Assert.Empty(result.Videos);
        Assert.Null(result.LastRefreshAt);
    }

    [Fact]
    public async Task A_failed_channel_keeps_its_cached_videos_and_is_named()
    {
        Serve(A, "A", (Vid("a", 1), 1));
        Serve(B, "B", (Vid("b", 2), 2));
        await Add(A);
        await Add(B);
        Serve(A, "A", (Vid("a", 5), 5));
        _feeds.Remove(B);

        var result = await _service.RefreshAsync(CancellationToken.None);

        Assert.Equal(["A 5", "B 2"], result.Videos.Select(v => v.Title));
        Assert.Equal("Güncellenemeyen kanallar: B.", result.Error);
        Assert.Equal(result, await _service.GetVideosAsync(CancellationToken.None) with { Videos = result.Videos });
    }

    [Fact]
    public async Task Videos_are_the_ten_newest_of_the_followed_channels_and_reading_never_fetches()
    {
        Serve(A, "A", Enumerable.Range(1, 8).Select(d => (Vid("a", d), d)).ToArray());
        Serve(B, "B", Enumerable.Range(11, 8).Select(d => (Vid("b", d), d)).ToArray());
        await Add(A);
        await Add(B);
        var calls = _http.Requests.Count;

        var videos = await _service.GetVideosAsync(CancellationToken.None);
        Assert.Equal(10, videos.Videos.Count);
        Assert.Equal("B 18", videos.Videos[0].Title);
        Assert.Equal("A 7", videos.Videos[^1].Title);

        Assert.True(await _service.RemoveChannelAsync(B, CancellationToken.None));
        Assert.False(await _service.RemoveChannelAsync(B, CancellationToken.None));
        Assert.All((await _service.GetVideosAsync(CancellationToken.None)).Videos, v => Assert.Equal(A, v.ChannelId));
        Assert.Equal(calls, _http.Requests.Count);
    }
}

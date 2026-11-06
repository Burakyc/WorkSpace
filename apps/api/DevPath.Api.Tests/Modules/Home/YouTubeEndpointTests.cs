using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Modules.Home;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using static DevPath.Api.Tests.Modules.Home.YouTubeRssTests;

namespace DevPath.Api.Tests.Modules.Home;

public class YouTubeEndpointTests
{
    private const string Id = "UC_x5XG1OV2P6uZZ5FSM9Ttw";

    private static async Task<string> InputError(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var errors = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        return errors.GetProperty("input")[0].GetString()!;
    }

    [Fact]
    public async Task Channels_and_videos_round_trip_through_a_stub_feed()
    {
        await using var factory = new ApiFactory();
        var stub = StubHttpHandler.Text(Feed("Google for Developers", Entry("dQw4w9WgXcQ", "Video", "2026-11-05T17:00:00+00:00")));
        var client = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
                services.AddHttpClient(YouTubeFeedClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => stub)))
            .CreateClient();

        var added = await client.PostAsJsonAsync("/api/youtube/channels", new { input = $"https://www.youtube.com/channel/{Id}" });
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var channels = JsonDocument.Parse(await client.GetStringAsync("/api/youtube/channels")).RootElement;
        Assert.Equal("Google for Developers", channels[0].GetProperty("title").GetString());

        var refreshed = await client.PostAsync("/api/youtube/refresh", null);
        var video = JsonDocument.Parse(await refreshed.Content.ReadAsStringAsync()).RootElement.GetProperty("videos")[0];
        Assert.Equal("Video", video.GetProperty("title").GetString());
        Assert.Equal("https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg", video.GetProperty("thumbnailUrl").GetString());
        Assert.Equal("Google for Developers", video.GetProperty("channelTitle").GetString());

        Assert.Equal("Bu kanal zaten ekli.", await InputError(await client.PostAsJsonAsync("/api/youtube/channels", new { input = Id })));
        Assert.Equal(YouTubeChannelId.FormatError, await InputError(await client.PostAsJsonAsync("/api/youtube/channels", new { input = "x" })));

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/youtube/channels/{Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/youtube/channels/{Id}")).StatusCode);
        var after = JsonDocument.Parse(await client.GetStringAsync("/api/youtube/videos")).RootElement;
        Assert.Equal(0, after.GetProperty("videos").GetArrayLength());
    }

    [Fact]
    public async Task Without_a_stub_the_test_host_refuses_the_network()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/youtube/channels", new { input = Id });

        Assert.Equal("Kanal kontrol edilemedi. İnternet bağlantını kontrol et.", await InputError(response));
    }
}

using DevPath.Api.Modules.System;
namespace DevPath.Api.Modules.Home;

/// <summary>The YouTube feed: the named HTTP client and the service (refreshed by <see cref="HomeRefresher"/>).</summary>
public static class YouTubeModule
{
    public static IServiceCollection AddYouTube(this IServiceCollection services)
    {
        services.AddHttpClient(YouTubeFeedClient.ClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd($"DevPath/{AppInfo.Version}");
        });
        services.AddSingleton<YouTubeFeedClient>();
        services.AddSingleton<YouTubeService>();
        return services;
    }
}

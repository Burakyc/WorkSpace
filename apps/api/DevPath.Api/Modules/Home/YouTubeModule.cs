namespace DevPath.Api.Modules.Home;

/// <summary>The YouTube feed: the named HTTP client, the service and the background refresh.</summary>
public static class YouTubeModule
{
    public static IServiceCollection AddYouTube(this IServiceCollection services)
    {
        services.AddHttpClient(YouTubeFeedClient.ClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("DevPath/0.0.1");
        });
        services.AddSingleton<YouTubeFeedClient>();
        services.AddSingleton<YouTubeService>();
        return services;
    }
}

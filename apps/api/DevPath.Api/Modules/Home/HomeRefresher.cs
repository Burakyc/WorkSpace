namespace DevPath.Api.Modules.Home;

/// <summary>Refreshes the external home data (YouTube, then GitHub) right after start, then every 6 hours.</summary>
public sealed class HomeRefresher(
    YouTubeService youTube,
    GitHubService gitHub,
    TimeProvider time,
    ILogger<HomeRefresher> logger) : BackgroundService
{
    public static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval, time);
        do
        {
            await RunAsync("YouTube", () => youTube.RefreshAsync(stoppingToken));
            await RunAsync("GitHub", () => gitHub.RefreshAsync(stoppingToken));
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunAsync(string source, Func<Task> refresh)
    {
        try
        {
            await refresh();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "{Source} refresh failed.", source);
        }
    }
}

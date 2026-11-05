namespace DevPath.Api.Modules.Home;

/// <summary>Refreshes every YouTube channel right after start, then every 6 hours.</summary>
public sealed class YouTubeRefresher(YouTubeService youTube, TimeProvider time, ILogger<YouTubeRefresher> logger) : BackgroundService
{
    public static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval, time);
        do
        {
            try
            {
                await youTube.RefreshAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "YouTube refresh failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

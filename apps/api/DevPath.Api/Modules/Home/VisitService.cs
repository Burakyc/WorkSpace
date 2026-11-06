using System.Text.Json;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Calendar;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Modules.Home;

/// <summary>What the user saw at <see cref="At"/>; the numbers are null without GitHub stats.</summary>
public sealed record VisitSnapshot(DateTimeOffset At, int? Stars, int? Followers);

/// <summary>visit.json: the app launch the snapshots belong to, the previous session's last snapshot and this session's.</summary>
public sealed record VisitDocument(string LaunchId, VisitSnapshot? Baseline, VisitSnapshot Latest);

/// <summary>POST /api/home/visit. Differences are null when either side has no number.</summary>
public sealed record VisitChanges(DateTimeOffset? Since, int? NewStars, int? NewFollowers, int? NewVideos, int StreakDays);

/// <summary>
/// "What changed since your last visit": compares the current numbers with what the previous app session last showed.
/// Electron main passes one DEVPATH_LAUNCH_ID per app launch, so an API restart inside a session keeps the baseline.
/// </summary>
public sealed class VisitService(
    JsonFileStore store,
    GitHubService gitHub,
    YouTubeService youTube,
    IRepository<Session> sessions,
    IConfiguration configuration,
    TimeProvider time)
{
    public const string FileName = "visit.json";
    public const string LaunchIdSetting = "DEVPATH_LAUNCH_ID";
    public static readonly DocumentSchema Schema = new(1, []);

    private readonly string _launchId = configuration[LaunchIdSetting] is { Length: > 0 } id ? id : Guid.NewGuid().ToString("N");

    /// <summary>Records this visit and answers what changed since the previous session.</summary>
    public async Task<VisitChanges> RecordAsync(string? timeZone, CancellationToken cancellationToken)
    {
        var zone = CalendarService.FindZone(timeZone)
            ?? throw new ValidationException(new Dictionary<string, string[]> { ["timeZone"] = ["Saat dilimi tanınmadı."] });

        var now = time.GetUtcNow();
        var stats = (await gitHub.GetStatusAsync(cancellationToken)).Stats;
        var current = new VisitSnapshot(now, stats?.Stars, stats?.Followers);

        VisitSnapshot? baseline = null;
        await store.UpdateAsync(FileName, Schema, document =>
        {
            VisitDocument? stored = null;
            try
            {
                stored = document?.Deserialize<VisitDocument>(StorageJson.Options);
            }
            catch (JsonException)
            {
                // A broken file starts over, as on the first visit.
            }

            baseline = stored is null ? null : stored.LaunchId == _launchId ? stored.Baseline : stored.Latest;
            return JsonSerializer.SerializeToNode(new VisitDocument(_launchId, baseline, current), StorageJson.Options)!.AsObject();
        }, cancellationToken);

        var days = (await sessions.GetAllAsync(cancellationToken))
            .Where(s => s.Completed)
            .Select(s => CalendarService.LocalDate(s.StartedAt, zone));
        var streak = Streak.Count(days, CalendarService.LocalDate(now, zone));

        return new VisitChanges(
            baseline?.At,
            Difference(current.Stars, baseline?.Stars),
            Difference(current.Followers, baseline?.Followers),
            baseline is null ? null : await youTube.CountVideosSinceAsync(baseline.At, cancellationToken),
            streak);
    }

    private static int? Difference(int? now, int? before) => now is { } a && before is { } b ? a - b : null;
}

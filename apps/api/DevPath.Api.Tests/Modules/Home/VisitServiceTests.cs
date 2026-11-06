using System.Net;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Home;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Tests.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using static DevPath.Api.Tests.Modules.Home.YouTubeRssTests;

namespace DevPath.Api.Tests.Modules.Home;

public sealed class VisitServiceTests : IDisposable
{
    private const string Zone = "Europe/Istanbul";
    private const string Channel = "UC_x5XG1OV2P6uZZ5FSM9Ttw";
    private static readonly DateTimeOffset Start = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Start);
    private readonly FakeGitHub _github = new();
    private readonly JsonFileStore _store;
    private readonly GitHubService _gitHub;
    private readonly YouTubeService _youTube;
    private readonly JsonRepository<Session> _sessions;
    private string _feed = Feed("Channel");

    public VisitServiceTests()
    {
        _store = new JsonFileStore(new DataDirectory(_folder.Path));
        var githubClient = new GitHubClient(new StubHttpClientFactory(_github.Handler), new ConfigurationBuilder().Build(), _time, NullLogger<GitHubClient>.Instance);
        _gitHub = new GitHubService(_store, githubClient, _time);
        var youTubeClient = new YouTubeFeedClient(
            new StubHttpClientFactory(new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(_feed) })),
            NullLogger<YouTubeFeedClient>.Instance);
        _youTube = new YouTubeService(_store, youTubeClient, _time);
        _sessions = new JsonRepository<Session>(_store, PomodoroModule.SessionsFileName, PomodoroModule.SessionsSchema);
    }

    public void Dispose() => _folder.Dispose();

    private VisitService Launch(string launchId) => new(
        _store, _gitHub, _youTube, _sessions,
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { [VisitService.LaunchIdSetting] = launchId }).Build(),
        _time);

    private Task<VisitChanges> Visit(VisitService service) => service.RecordAsync(Zone, CancellationToken.None);

    [Fact]
    public async Task First_visit_has_no_baseline()
    {
        var changes = await Visit(Launch("one"));

        Assert.Equal(new VisitChanges(null, null, null, null, 0), changes);
    }

    [Fact]
    public async Task A_new_launch_compares_with_what_the_previous_session_last_saw()
    {
        await _gitHub.SaveSettingsAsync(new GitHubSettingsInput("octo"), CancellationToken.None);
        var first = Launch("one");
        await Visit(first);

        // Later in the same session: more followers seen; the baseline of this session stays empty.
        _github.Followers = 6;
        await _gitHub.RefreshAsync(CancellationToken.None);
        _time.Now = Start.AddHours(2);
        Assert.Null((await Visit(first)).Since);

        // Next launch: 3 more stars, 1 follower less, one video published after the last visit.
        _github.RepoStars = [5, 5];
        _github.Followers = 5;
        await _gitHub.RefreshAsync(CancellationToken.None);
        _feed = Feed("Channel",
            Entry("aaaaaaaaaaa", "Before", "2026-11-06T10:00:00Z"),
            Entry("bbbbbbbbbbb", "After", "2026-11-06T12:00:00Z"));
        await _youTube.AddChannelAsync(new YouTubeChannelInput(Channel), CancellationToken.None);
        _time.Now = Start.AddDays(1);

        var next = Launch("two");
        var changes = await Visit(next);

        Assert.Equal(new VisitChanges(Start.AddHours(2), 3, -1, 1, 0), changes);

        // An API restart in the same launch keeps that baseline.
        _time.Now = Start.AddDays(1).AddHours(1);
        Assert.Equal(changes, await Visit(Launch("two")));
    }

    [Fact]
    public async Task Streak_comes_from_completed_sessions_in_the_time_zone()
    {
        // 21:30 UTC on 5 Nov is 00:30 on 6 Nov in Istanbul; the stopped session never counts.
        await Add("s1", new DateTimeOffset(2026, 11, 5, 21, 30, 0, TimeSpan.Zero), completed: true);
        await Add("s2", new DateTimeOffset(2026, 11, 4, 12, 0, 0, TimeSpan.Zero), completed: true);
        await Add("s3", new DateTimeOffset(2026, 11, 3, 12, 0, 0, TimeSpan.Zero), completed: false);

        Assert.Equal(1, (await Visit(Launch("one"))).StreakDays);
    }

    [Fact]
    public async Task Unknown_time_zone_is_refused()
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => Launch("one").RecordAsync("Mars/Base", CancellationToken.None));

        Assert.Equal(["Saat dilimi tanınmadı."], error.Errors["timeZone"]);
    }

    private Task Add(string id, DateTimeOffset startedAt, bool completed) => _sessions.UpsertAsync(
        new Session(id, "g", null, [], startedAt, startedAt.AddMinutes(25), 25, completed, null), CancellationToken.None);
}

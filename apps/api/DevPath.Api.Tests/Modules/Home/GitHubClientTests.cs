using System.Collections.Concurrent;
using System.Net;
using DevPath.Api.Modules.Home;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevPath.Api.Tests.Modules.Home;

/// <summary>A fake api.github.com: answers by path, records every request.</summary>
public sealed class FakeGitHub
{
    public const string Token = "ghp_secretTokenValue1234567890";

    public int Followers { get; set; } = 5;
    public int[] RepoStars { get; set; } = [3, 4];
    public HttpStatusCode? FailWith { get; set; }
    public Dictionary<string, string> FailHeaders { get; } = [];
    public bool Offline { get; set; }

    public StubHttpHandler Handler { get; }

    public FakeGitHub()
    {
        Handler = new StubHttpHandler(Respond);
    }

    private HttpResponseMessage Respond(HttpRequestMessage request)
    {
        if (Offline)
        {
            throw new HttpRequestException("offline");
        }
        if (FailWith is { } status)
        {
            var failed = new HttpResponseMessage(status) { Content = new StringContent("{}") };
            foreach (var (name, value) in FailHeaders)
            {
                failed.Headers.Add(name, value);
            }
            return failed;
        }

        var path = request.RequestUri!.AbsolutePath;
        var query = request.RequestUri.Query;
        string body;
        if (path == "/users/octo")
        {
            body = $$"""{ "login": "octo", "followers": {{Followers}}, "public_repos": 9 }""";
        }
        else if (path == "/users/octo/repos")
        {
            var page = int.Parse(query.Split("page=")[^1]);
            // Page 1 is full (100 repos, the first with RepoStars[0] stars), page 2 has one repo.
            body = page == 1
                ? "[" + string.Join(",", Enumerable.Range(0, 100).Select(i => $$"""{ "stargazers_count": {{(i == 0 ? RepoStars[0] : 0)}} }""")) + "]"
                : $$"""[{ "stargazers_count": {{RepoStars[1]}} }]""";
        }
        else if (path == "/search/commits")
        {
            body = """
                { "total_count": 41, "items": [
                  { "sha": "abc123", "html_url": "https://github.com/octo/app/commit/abc123",
                    "repository": { "full_name": "octo/app" },
                    "commit": { "message": "fix: first line\n\nbody", "author": { "date": "2026-11-05T10:00:00Z" } } },
                  { "sha": "def456", "html_url": "https://evil.example/x",
                    "repository": { "full_name": "octo/lib" },
                    "commit": { "message": "feat: second", "author": { "date": "2026-11-04T10:00:00Z" } } }
                ] }
                """;
        }
        else
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }

        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) };
    }
}

public class GitHubClientTests
{
    private static readonly FixedTimeProvider Time = new(new DateTimeOffset(2026, 11, 6, 9, 0, 0, TimeSpan.Zero));

    private static GitHubClient Client(FakeGitHub github, string? token = null) => new(
        new StubHttpClientFactory(github.Handler),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { [GitHubClient.TokenSetting] = token }).Build(),
        Time,
        NullLogger<GitHubClient>.Instance);

    [Fact]
    public async Task Reads_followers_repos_stars_and_commits()
    {
        var github = new FakeGitHub();

        var result = await Client(github).FetchAsync("octo", CancellationToken.None);

        Assert.Null(result.Error);
        var stats = result.Stats!;
        Assert.Equal((7, 5, 9, 41), (stats.Stars, stats.Followers, stats.PublicRepos, stats.CommitsLast30Days));
        Assert.Equal(
            [
                new GitHubCommit("octo/app", "abc123", "fix: first line", new DateTimeOffset(2026, 11, 5, 10, 0, 0, TimeSpan.Zero), "https://github.com/octo/app/commit/abc123"),
                new GitHubCommit("octo/lib", "def456", "feat: second", new DateTimeOffset(2026, 11, 4, 10, 0, 0, TimeSpan.Zero), null),
            ],
            stats.RecentCommits);
        var search = github.Handler.Requests.Last().RequestUri!;
        Assert.Equal("?q=author%3Aocto%20author-date%3A2026-10-07..2026-11-07&sort=author-date&order=desc&per_page=5", search.Query);
        Assert.Equal(4, github.Handler.Requests.Count);
    }

    [Fact]
    public async Task Sends_the_token_only_when_there_is_one()
    {
        var withToken = new FakeGitHub();
        await Client(withToken, FakeGitHub.Token).FetchAsync("octo", CancellationToken.None);
        Assert.All(withToken.Handler.Requests, r => Assert.Equal($"Bearer {FakeGitHub.Token}", r.Headers.Authorization?.ToString()));

        var without = new FakeGitHub();
        await Client(without).FetchAsync("octo", CancellationToken.None);
        Assert.All(without.Handler.Requests, r => Assert.Null(r.Headers.Authorization));
        Assert.All(without.Handler.Requests, r => Assert.Equal("DevPath", r.Headers.UserAgent.ToString()));
    }

    [Fact]
    public async Task Failures_give_turkish_errors()
    {
        async Task<string?> ErrorFor(Action<FakeGitHub> setup)
        {
            var github = new FakeGitHub();
            setup(github);
            var result = await Client(github).FetchAsync("octo", CancellationToken.None);
            Assert.Null(result.Stats);
            return result.Error;
        }

        Assert.Equal("GitHub kullanıcısı bulunamadı.", await ErrorFor(g => g.FailWith = HttpStatusCode.NotFound));
        Assert.Equal("GitHub token geçersiz. Ayarlar'dan sil ya da yenile.", await ErrorFor(g => g.FailWith = HttpStatusCode.Unauthorized));
        Assert.Equal(
            $"GitHub istek sınırına ulaşıldı. {GitHubClient.ResetTime(1_793_000_000)} sonrası tekrar dene.",
            await ErrorFor(g =>
            {
                g.FailWith = HttpStatusCode.Forbidden;
                g.FailHeaders["x-ratelimit-remaining"] = "0";
                g.FailHeaders["x-ratelimit-reset"] = "1793000000";
            }));
        Assert.Equal("GitHub isteği başarısız oldu (kod 403).", await ErrorFor(g => g.FailWith = HttpStatusCode.Forbidden));
        Assert.Equal("GitHub isteği başarısız oldu (kod 500).", await ErrorFor(g => g.FailWith = HttpStatusCode.InternalServerError));
        Assert.Equal("GitHub'a ulaşılamadı.", await ErrorFor(g => g.Offline = true));

        var badJson = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{ "followers": "many" }""") });
        var client = new GitHubClient(new StubHttpClientFactory(badJson), new ConfigurationBuilder().Build(), Time, NullLogger<GitHubClient>.Instance);
        Assert.Equal("GitHub yanıtı okunamadı.", (await client.FetchAsync("octo", CancellationToken.None)).Error);
    }

    [Fact]
    public async Task The_token_never_reaches_a_log()
    {
        var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection()
            .AddLogging(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(logs))
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [GitHubClient.TokenSetting] = FakeGitHub.Token }).Build())
            .AddSingleton<TimeProvider>(Time)
            .AddGitHub();
        var github = new FakeGitHub();
        services.AddHttpClient(GitHubClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => github.Handler);
        await using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<GitHubClient>();

        await client.FetchAsync("octo", CancellationToken.None);
        github.FailWith = HttpStatusCode.Unauthorized;
        await client.FetchAsync("octo", CancellationToken.None);

        Assert.Contains(logs.Messages, m => m.Contains("api.github.com", StringComparison.Ordinal));
        Assert.Contains(logs.Messages, m => m.Contains("Authorization", StringComparison.Ordinal));
        Assert.DoesNotContain(logs.Messages, m => m.Contains(FakeGitHub.Token, StringComparison.Ordinal));
    }
}

/// <summary>Collects every formatted log message at every level.</summary>
public sealed class CapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<string> Messages { get; } = new();

    public ILogger CreateLogger(string categoryName) => new Logger(Messages);

    public void Dispose()
    {
    }

    private sealed class Logger(ConcurrentQueue<string> messages) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            messages.Enqueue(formatter(state, exception) + exception);
    }
}

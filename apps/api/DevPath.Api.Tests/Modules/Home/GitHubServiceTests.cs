using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Home;
using DevPath.Api.Tests.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevPath.Api.Tests.Modules.Home;

public sealed class GitHubServiceTests : IDisposable
{
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 9, 0, 0, TimeSpan.Zero);

    private readonly TempFolder _folder = new();
    private readonly FixedTimeProvider _time = new(Now);
    private readonly FakeGitHub _github = new();
    private readonly GitHubService _service;

    public GitHubServiceTests()
    {
        var client = new GitHubClient(new StubHttpClientFactory(_github.Handler), new ConfigurationBuilder().Build(), _time, NullLogger<GitHubClient>.Instance);
        _service = new GitHubService(new JsonFileStore(new DataDirectory(_folder.Path)), client, _time);
    }

    public void Dispose() => _folder.Dispose();

    private Task<GitHubStatus> Save(string? username) => _service.SaveSettingsAsync(new GitHubSettingsInput(username), CancellationToken.None);

    [Theory]
    [InlineData("octo")]
    [InlineData(" Octo-Cat ")]
    [InlineData("a")]
    [InlineData("a1-b2-c3")]
    public async Task Valid_usernames_are_saved(string username)
    {
        await Save(username);

        Assert.Equal(username.Trim(), (await _service.GetSettingsAsync(CancellationToken.None)).Username);
    }

    [Theory]
    [InlineData("-a")]
    [InlineData("a-")]
    [InlineData("a--b")]
    [InlineData("a b")]
    [InlineData("ğ")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    public async Task Invalid_usernames_are_refused(string username)
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => Save(username));

        Assert.Equal(["Geçerli bir GitHub kullanıcı adı gir."], error.Errors["username"]);
    }

    [Fact]
    public async Task Saving_a_username_refreshes_and_an_empty_one_clears_it()
    {
        var status = await Save("octo");

        Assert.Equal(7, status.Stats!.Stars);
        Assert.Equal(Now, status.FetchedAt);
        Assert.Null(status.Error);

        var cleared = await Save("  ");
        Assert.Null(cleared.Username);
        Assert.Null(cleared.Stats);
        Assert.Null((await _service.GetSettingsAsync(CancellationToken.None)).Username);
    }

    [Fact]
    public async Task A_failed_refresh_keeps_the_numbers_and_sets_the_error()
    {
        await Save("octo");
        _github.Offline = true;
        _time.Now = Now.AddHours(6);

        var status = await _service.RefreshAsync(CancellationToken.None);

        Assert.Equal(5, status.Stats!.Followers);
        Assert.Equal(Now, status.FetchedAt);
        Assert.Equal(Now.AddHours(6), status.LastRefreshAt);
        Assert.Equal("GitHub'a ulaşılamadı.", status.Error);

        _github.Offline = false;
        Assert.Null((await _service.RefreshAsync(CancellationToken.None)).Error);
    }

    [Fact]
    public async Task A_cache_of_another_user_counts_as_empty()
    {
        await Save("octo");
        _github.Offline = true;

        var other = await Save("someone-else");

        Assert.Equal("someone-else", other.Username);
        Assert.Null(other.Stats);
        Assert.Equal("GitHub'a ulaşılamadı.", other.Error);
    }

    [Fact]
    public async Task Without_a_username_nothing_is_fetched_and_reading_never_fetches()
    {
        var empty = await _service.RefreshAsync(CancellationToken.None);
        Assert.Null(empty.Username);
        Assert.Empty(_github.Handler.Requests);

        await Save("octo");
        var calls = _github.Handler.Requests.Count;
        var status = await _service.GetStatusAsync(CancellationToken.None);

        Assert.Equal(41, status.Stats!.CommitsLast30Days);
        Assert.Equal(calls, _github.Handler.Requests.Count);
    }
}

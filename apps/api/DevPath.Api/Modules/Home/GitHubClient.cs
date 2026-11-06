using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace DevPath.Api.Modules.Home;

public sealed record GitHubCommit(string Repo, string Sha, string Message, DateTimeOffset Date, string? Url);

public sealed record GitHubStats(int Stars, int Followers, int PublicRepos, int CommitsLast30Days, IReadOnlyList<GitHubCommit> RecentCommits);

/// <summary>The fetched stats, or a Turkish <see cref="Error"/>.</summary>
public sealed record GitHubFetch(GitHubStats? Stats, string? Error);

/// <summary>
/// Reads a user's public numbers from the GitHub REST API through the named <c>github</c> client.
/// The optional token (DEVPATH_GITHUB_TOKEN) is only ever put in the Authorization header; it is never logged or returned.
/// </summary>
public sealed class GitHubClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    TimeProvider time,
    ILogger<GitHubClient> logger)
{
    public const string ClientName = "github";
    public const string TokenSetting = "DEVPATH_GITHUB_TOKEN";
    public const int MaxRepoPages = 5;
    private const int PageSize = 100;
    private const int MaxMessageLength = 200;

    private readonly string? _token = string.IsNullOrWhiteSpace(configuration[TokenSetting]) ? null : configuration[TokenSetting];

    public async Task<GitHubFetch> FetchAsync(string username, CancellationToken cancellationToken)
    {
        var user = Uri.EscapeDataString(username);
        try
        {
            using var client = httpClientFactory.CreateClient(ClientName);

            using var profile = await GetJsonAsync(client, $"users/{user}", isUser: true, cancellationToken);
            var followers = profile.RootElement.GetProperty("followers").GetInt32();
            var publicRepos = profile.RootElement.GetProperty("public_repos").GetInt32();

            var stars = 0;
            for (var page = 1; page <= MaxRepoPages; page++)
            {
                using var repos = await GetJsonAsync(client, $"users/{user}/repos?type=owner&per_page={PageSize}&page={page}", false, cancellationToken);
                var list = repos.RootElement.EnumerateArray().ToList();
                stars += list.Sum(r => r.GetProperty("stargazers_count").GetInt32());
                if (list.Count < PageSize)
                {
                    break;
                }
            }

            // A closed range: commits with forged future dates (e.g. year 2100) would otherwise top the list and the count.
            var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
            var since = today.AddDays(-30).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var until = today.AddDays(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var query = Uri.EscapeDataString($"author:{username} author-date:{since}..{until}");
            using var search = await GetJsonAsync(client, $"search/commits?q={query}&sort=author-date&order=desc&per_page=5", false, cancellationToken);
            var total = search.RootElement.GetProperty("total_count").GetInt32();
            var commits = search.RootElement.GetProperty("items").EnumerateArray().Select(ReadCommit).ToList();

            return new GitHubFetch(new GitHubStats(stars, followers, publicRepos, total, commits), null);
        }
        catch (GitHubRequestException ex)
        {
            return new GitHubFetch(null, ex.Message);
        }
        catch (Exception ex) when (ex is HttpRequestException || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("GitHub could not be reached: {Reason}", ex.GetType().Name);
            return new GitHubFetch(null, "GitHub'a ulaşılamadı.");
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or FormatException)
        {
            logger.LogWarning("GitHub answered with unexpected JSON: {Reason}", ex.GetType().Name);
            return new GitHubFetch(null, "GitHub yanıtı okunamadı.");
        }
    }

    private static GitHubCommit ReadCommit(JsonElement item)
    {
        var commit = item.GetProperty("commit");
        var message = commit.GetProperty("message").GetString() ?? "";
        var firstLine = message.Split('\n')[0].Trim();
        var url = item.TryGetProperty("html_url", out var html) ? html.GetString() : null;
        return new GitHubCommit(
            item.GetProperty("repository").GetProperty("full_name").GetString() ?? "",
            item.GetProperty("sha").GetString() ?? "",
            firstLine.Length > MaxMessageLength ? firstLine[..MaxMessageLength] : firstLine,
            commit.GetProperty("author").GetProperty("date").GetDateTimeOffset(),
            url is not null && url.StartsWith("https://github.com/", StringComparison.Ordinal) ? url : null);
    }

    private async Task<JsonDocument> GetJsonAsync(HttpClient client, string path, bool isUser, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"https://api.github.com/{path}"));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        request.Headers.UserAgent.ParseAdd("DevPath");
        if (_token is not null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        }

        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("GitHub request {Path} answered {Status}.", path.Split('?')[0], (int)response.StatusCode);
            throw new GitHubRequestException(ErrorFor(response, isUser));
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }

    private static string ErrorFor(HttpResponseMessage response, bool isUser)
    {
        var status = response.StatusCode;
        if (status == HttpStatusCode.NotFound && isUser)
        {
            return "GitHub kullanıcısı bulunamadı.";
        }
        if (status == HttpStatusCode.Unauthorized)
        {
            return "GitHub token geçersiz. Ayarlar'dan sil ya da yenile.";
        }
        if (status is HttpStatusCode.Forbidden or HttpStatusCode.TooManyRequests &&
            Header(response, "x-ratelimit-remaining") == "0")
        {
            const string limit = "GitHub istek sınırına ulaşıldı.";
            return long.TryParse(Header(response, "x-ratelimit-reset"), out var reset)
                ? $"{limit} {ResetTime(reset)} sonrası tekrar dene."
                : limit;
        }
        return $"GitHub isteği başarısız oldu (kod {(int)status}).";
    }

    /// <summary>The local HH:mm of a rate limit reset given in Unix seconds.</summary>
    public static string ResetTime(long unixSeconds) =>
        TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeSeconds(unixSeconds), TimeZoneInfo.Local).ToString("HH:mm", CultureInfo.InvariantCulture);

    private static string? Header(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values) ? values.FirstOrDefault() : null;

    private sealed class GitHubRequestException(string message) : Exception(message);
}

using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Settings;

namespace DevPath.Api.Modules.Home;

public sealed record GitHubSettings(string? Username);

public sealed record GitHubSettingsInput(string? Username);

/// <summary>GET /api/github/stats, POST /api/github/refresh: the cached stats of the saved user and how the last refresh went.</summary>
public sealed record GitHubStatus(string? Username, GitHubStats? Stats, DateTimeOffset? FetchedAt, DateTimeOffset? LastRefreshAt, string? Error);

/// <summary>cache/github.json.</summary>
public sealed record GitHubCache(string? Username, GitHubStats? Stats, DateTimeOffset? FetchedAt, DateTimeOffset? LastRefreshAt, string? Error);

/// <summary>
/// The GitHub username (settings.json, section "github") and the cached stats (cache/github.json).
/// Reading never fetches; only <see cref="RefreshAsync"/> (also run after saving a username) goes to GitHub.
/// </summary>
public sealed partial class GitHubService(JsonFileStore store, GitHubClient github, TimeProvider time)
{
    public const string CacheFileName = "cache/github.json";
    public static readonly DocumentSchema CacheSchema = new(1, []);
    private const string Section = "github";

    private readonly SemaphoreSlim _refreshGate = new(1, 1);

    public async Task<GitHubSettings> GetSettingsAsync(CancellationToken cancellationToken) =>
        new(ReadUsername(await store.ReadAsync(SettingsService.FileName, SettingsService.Schema, cancellationToken)));

    /// <summary>Saves the username (empty clears it), then refreshes for a new name.</summary>
    public async Task<GitHubStatus> SaveSettingsAsync(GitHubSettingsInput input, CancellationToken cancellationToken)
    {
        var username = (input.Username ?? "").Trim();
        if (username.Length > 0 && !UsernamePattern().IsMatch(username))
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["username"] = ["Geçerli bir GitHub kullanıcı adı gir."] });
        }

        await store.UpdateAsync(SettingsService.FileName, SettingsService.Schema, document =>
        {
            document ??= new JsonObject();
            document[Section] = new JsonObject { ["username"] = username.Length > 0 ? username : null };
            return document;
        }, cancellationToken);

        return username.Length > 0 ? await RefreshAsync(cancellationToken) : await GetStatusAsync(cancellationToken);
    }

    public async Task<GitHubStatus> GetStatusAsync(CancellationToken cancellationToken)
    {
        var username = (await GetSettingsAsync(cancellationToken)).Username;
        var cache = await ReadCacheAsync(username, cancellationToken);
        return new GitHubStatus(username, cache?.Stats, cache?.FetchedAt, cache?.LastRefreshAt, cache?.Error);
    }

    /// <summary>Fetches the saved user's stats; a failure keeps the cached numbers and sets the error.</summary>
    public async Task<GitHubStatus> RefreshAsync(CancellationToken cancellationToken)
    {
        await _refreshGate.WaitAsync(cancellationToken);
        try
        {
            var username = (await GetSettingsAsync(cancellationToken)).Username;
            if (username is null)
            {
                return new GitHubStatus(null, null, null, null, null);
            }

            var fetch = await github.FetchAsync(username, cancellationToken);
            var now = time.GetUtcNow();
            var updated = await store.UpdateAsync(CacheFileName, CacheSchema, document =>
            {
                var cached = ToCache(document, username);
                var next = fetch.Stats is not null
                    ? new GitHubCache(username, fetch.Stats, now, now, null)
                    : new GitHubCache(username, cached?.Stats, cached?.FetchedAt, now, fetch.Error);
                return JsonSerializer.SerializeToNode(next, StorageJson.Options)!.AsObject();
            }, cancellationToken);

            var cache = ToCache(updated, username);
            return new GitHubStatus(username, cache?.Stats, cache?.FetchedAt, cache?.LastRefreshAt, cache?.Error);
        }
        finally
        {
            _refreshGate.Release();
        }
    }

    private async Task<GitHubCache?> ReadCacheAsync(string? username, CancellationToken cancellationToken) =>
        username is null ? null : ToCache(await store.ReadAsync(CacheFileName, CacheSchema, cancellationToken), username);

    /// <summary>The cache when it belongs to <paramref name="username"/>; a cache of another user counts as empty.</summary>
    private static GitHubCache? ToCache(JsonObject? document, string username)
    {
        try
        {
            var cache = document?.Deserialize<GitHubCache>(StorageJson.Options);
            return string.Equals(cache?.Username, username, StringComparison.OrdinalIgnoreCase) ? cache : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ReadUsername(JsonObject? settings) =>
        settings?[Section]?["username"] is JsonValue value && value.TryGetValue<string>(out var name) && name.Length > 0 ? name : null;

    // GitHub logins: 1–39 letters, digits or single hyphens, not at the start or end.
    [GeneratedRegex("^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")]
    private static partial Regex UsernamePattern();
}

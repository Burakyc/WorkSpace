using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Home;

/// <summary>GET /api/home/feed. <c>Status</c> is "ok", "missing" or "invalid"; an invalid file shows no items.</summary>
public sealed record FeedResponse(string Status, DateTimeOffset? GeneratedAt, IReadOnlyList<FeedItem> Items, IReadOnlyList<string> Errors);

/// <summary>
/// Reads feed.json, which the morning agent writes into the data folder. The app never writes it, so the file is read
/// directly instead of through <see cref="JsonFileStore"/> (which saves migrated files back).
/// </summary>
public sealed class FeedService(DataDirectory dataDirectory)
{
    public const string FileName = "feed.json";
    public const long MaxBytes = 2 * 1024 * 1024;
    public const int ShownItems = 10;

    public async Task<FeedResponse> GetAsync(CancellationToken cancellationToken)
    {
        var file = new FileInfo(Path.Combine(dataDirectory.Path, FileName));
        if (!file.Exists)
        {
            return new FeedResponse("missing", null, [], []);
        }

        if (file.Length > MaxBytes)
        {
            return Invalid("$: Dosya 2 MB'den büyük olamaz.");
        }

        JsonNode? root;
        try
        {
            await using var stream = new FileStream(file.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            root = await JsonNode.ParseAsync(stream, cancellationToken: cancellationToken);
        }
        catch (JsonException ex)
        {
            return Invalid($"$: Geçerli bir JSON değil (satır {ex.LineNumber + 1}).");
        }

        var result = FeedValidator.Validate(root);
        if (result.Errors.Count > 0)
        {
            return new FeedResponse("invalid", null, [], result.Errors);
        }

        // Dated items newest first, then undated ones in file order (OrderBy is stable).
        var items = result.Items
            .OrderBy(i => i.PublishedAt is null)
            .ThenByDescending(i => i.PublishedAt)
            .Take(ShownItems)
            .ToList();
        return new FeedResponse("ok", result.GeneratedAt, items, []);
    }

    private static FeedResponse Invalid(string error) => new("invalid", null, [], [error]);
}

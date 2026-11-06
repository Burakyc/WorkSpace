using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Content;

/// <summary>A topic in a module's list: <see cref="Marks"/> counts the items per mark.</summary>
public sealed record TopicSummary(
    string Slug,
    string Topic,
    string Level,
    IReadOnlyList<string> Tags,
    int ItemCount,
    IReadOnlyDictionary<string, int> Marks,
    DateTimeOffset UpdatedAt);

/// <summary>Reads topic files and stores the user's marks on items. Content itself only changes through imports.</summary>
public sealed partial class ContentService(
    JsonFileStore store, DataDirectory dataDirectory, TimeProvider time, ILogger<ContentService> logger)
{
    private static readonly StringComparer TopicOrder = StringComparer.Create(CultureInfo.GetCultureInfo("tr-TR"), ignoreCase: true);

    // Slugs come from URLs: anything else never reaches the file system.
    [GeneratedRegex("^[a-z0-9-]{1,80}$")]
    private static partial Regex ValidSlug();

    /// <summary>Every topic of the type, alphabetical. A file that cannot be read is logged and left out.</summary>
    public async Task<IReadOnlyList<TopicSummary>> ListAsync(string? type, CancellationToken cancellationToken)
    {
        var contentType = ContentType.Require(type);
        var folder = Path.Combine(dataDirectory.Path, "content", contentType.Folder);
        if (!Directory.Exists(folder))
        {
            return [];
        }

        var topics = new List<TopicSummary>();
        foreach (var slug in Directory.EnumerateFiles(folder, "*.json").Select(Path.GetFileNameWithoutExtension))
        {
            if (slug is null || !ValidSlug().IsMatch(slug))
            {
                continue;
            }

            try
            {
                if (await ReadAsync(contentType, slug, cancellationToken) is { } topic)
                {
                    topics.Add(Summarize(slug, topic));
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Broken JSON, a newer schemaVersion or a hand-edited file of the wrong shape: one bad file must not hide the rest.
                logger.LogWarning(ex, "Skipped topic file {Folder}/{Slug}.json", contentType.Folder, slug);
            }
        }

        return [.. topics.OrderBy(topic => topic.Topic, TopicOrder)];
    }

    /// <summary>The topic as stored, without <c>schemaVersion</c>; null for an unknown or invalid slug.</summary>
    public async Task<JsonObject?> GetAsync(string? type, string slug, CancellationToken cancellationToken)
    {
        var contentType = ContentType.Require(type);
        if (!ValidSlug().IsMatch(slug))
        {
            return null;
        }

        var topic = await ReadAsync(contentType, slug, cancellationToken);
        topic?.Remove(DocumentSchema.VersionProperty);
        return topic;
    }

    /// <summary>Sets (or with null, removes) the item's mark. Returns the item, or null for an unknown topic or item.</summary>
    public async Task<JsonObject?> MarkAsync(string? type, string slug, string id, string? mark, CancellationToken cancellationToken)
    {
        var contentType = ContentType.Require(type);
        if (mark is not null && !contentType.Marks.Contains(mark))
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["mark"] = ["Geçersiz işaret."] });
        }

        if (!ValidSlug().IsMatch(slug))
        {
            return null;
        }

        JsonObject? marked = null;
        await store.UpdateAsync(ContentModule.TopicPath(contentType, slug), ContentModule.TopicSchema, topic =>
        {
            var item = topic?["items"]?.AsArray().OfType<JsonObject>().FirstOrDefault(i => (string?)i["id"] == id);
            if (item is null)
            {
                return null;
            }

            if (mark is null)
            {
                item.Remove("mark");
                item.Remove("markedAt");
            }
            else
            {
                item["mark"] = mark;
                item["markedAt"] = time.GetUtcNow();
            }

            marked = (JsonObject)item.DeepClone();
            return topic;
        }, cancellationToken);
        return marked;
    }

    private Task<JsonObject?> ReadAsync(ContentType type, string slug, CancellationToken cancellationToken) =>
        store.ReadAsync(ContentModule.TopicPath(type, slug), ContentModule.TopicSchema, cancellationToken);

    private static TopicSummary Summarize(string slug, JsonObject topic)
    {
        var items = topic["items"]!.AsArray();
        var marks = items
            .Select(item => (string?)item?["mark"])
            .OfType<string>()
            .GroupBy(mark => mark)
            .ToDictionary(group => group.Key, group => group.Count());
        return new TopicSummary(
            slug,
            topic["topic"]!.GetValue<string>(),
            topic["level"]!.GetValue<string>(),
            [.. topic["tags"]!.AsArray().Select(tag => tag!.GetValue<string>())],
            items.Count,
            marks,
            topic["updatedAt"]!.GetValue<DateTimeOffset>());
    }
}

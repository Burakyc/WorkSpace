using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Modules.Posts;

/// <summary>Saves a validated <c>post</c> import: its items become drafts in posts.json. A title that exists is skipped, so nothing is overwritten.</summary>
public static class PostDraftImport
{
    public static async Task<ImportReport> MergeAsync(
        JsonFileStore store, TimeProvider time, JsonObject document, CancellationToken cancellationToken)
    {
        var topic = document["topic"]!.GetValue<string>().Trim();
        var now = time.GetUtcNow();
        int added = 0, skipped = 0;

        await store.UpdateAsync(PostsModule.DraftsFileName, PostsModule.DraftsSchema, current =>
        {
            var stored = current ?? new JsonObject { ["items"] = new JsonArray() };
            var items = stored["items"]!.AsArray();
            var keys = items.Select(item => ContentKey.Key(item!["title"]!.GetValue<string>())).ToHashSet();
            foreach (var item in document["items"]!.AsArray())
            {
                var title = item!["title"]!.GetValue<string>().Trim();
                if (keys.Add(ContentKey.Key(title)))
                {
                    items.Add(JsonSerializer.SerializeToNode(NewDraft(item.AsObject(), topic, title, now), StorageJson.Options));
                    added++;
                }
                else
                {
                    skipped++;
                }
            }

            return added > 0 ? stored : null;
        }, cancellationToken);

        return new ImportReport("post", topic, ContentKey.Slug(topic), added > 0, added, skipped, LevelKept: false);
    }

    private static PostDraft NewDraft(JsonObject item, string topic, string title, DateTimeOffset now) => new(
        Guid.NewGuid().ToString(),
        topic,
        title,
        item["body"]!.GetValue<string>().Trim(),
        PostDraft.NormalizeHashtags(item["hashtags"]?.AsArray().Select(tag => tag!.GetValue<string>()) ?? []),
        item["sourceLink"]?.GetValue<string>(),
        item["imageSuggestion"]?.GetValue<string>().Trim(),
        now,
        now);
}

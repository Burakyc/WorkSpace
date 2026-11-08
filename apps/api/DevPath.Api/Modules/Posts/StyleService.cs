using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Posts;

public sealed record StyleVersion(string Text, DateTimeOffset SavedAt);

public sealed record StylePrompt(string Text, DateTimeOffset? UpdatedAt, IReadOnlyList<StyleVersion> History);

public sealed record StyleInput(string? Text);

/// <summary>The user's style prompt with its last versions (style.json).</summary>
public sealed class StyleService(JsonFileStore store, TimeProvider time)
{
    public const int MaxLength = 5_000;
    public const int MaxHistory = 10;

    public async Task<StylePrompt> GetAsync(CancellationToken cancellationToken) =>
        Read(await store.ReadAsync(PostsModule.StyleFileName, PostsModule.StyleSchema, cancellationToken));

    public async Task<StylePrompt> SaveAsync(StyleInput input, CancellationToken cancellationToken)
    {
        var text = (input.Text ?? "").TrimEnd();
        if (text.Length > MaxLength)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["text"] = ["Stil promptu en fazla 5.000 karakter olabilir."],
            });
        }

        var saved = await store.UpdateAsync(PostsModule.StyleFileName, PostsModule.StyleSchema, document =>
        {
            var current = Read(document);
            if (text == current.Text)
            {
                return null;
            }

            var history = current.Text.Length > 0 && current.UpdatedAt is { } savedAt
                ? current.History.Prepend(new StyleVersion(current.Text, savedAt)).Take(MaxHistory)
                : current.History;
            return new JsonObject
            {
                ["text"] = text,
                ["updatedAt"] = time.GetUtcNow(),
                ["history"] = JsonSerializer.SerializeToNode(history.ToList(), StorageJson.Options),
            };
        }, cancellationToken);
        return Read(saved);
    }

    private static StylePrompt Read(JsonObject? document) => new(
        document?["text"]?.GetValue<string>() ?? "",
        document?["updatedAt"]?.GetValue<DateTimeOffset>(),
        document?["history"]?.Deserialize<List<StyleVersion>>(StorageJson.Options) ?? []);
}

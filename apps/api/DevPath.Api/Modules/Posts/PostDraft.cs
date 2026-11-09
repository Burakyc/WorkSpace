using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Posts;

/// <summary>One LinkedIn post draft in posts.json. <see cref="Topic"/> says what it was drafted from. The user copies it and posts it by hand.</summary>
public sealed record PostDraft(
    string Id,
    string Topic,
    string Title,
    string Body,
    IReadOnlyList<string> Hashtags,
    string? SourceLink,
    string? ImageSuggestion,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt) : IEntity
{
    /// <summary>Without leading # and without repeats.</summary>
    public static List<string> NormalizeHashtags(IEnumerable<string> hashtags) =>
        [.. hashtags.Select(tag => tag.Trim().TrimStart('#')).Where(tag => tag.Length > 0).Distinct()];
}

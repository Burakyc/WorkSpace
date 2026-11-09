using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Projects;

namespace DevPath.Api.Modules.Posts;

public sealed record PostDraftInput(
    string? Title, string? Body, IReadOnlyList<string>? Hashtags, string? SourceLink, string? ImageSuggestion);

/// <summary>The saved drafts in posts.json. New ones arrive through the import (see <see cref="PostDraftImport"/>); here they are read, edited and deleted.</summary>
public sealed class PostDraftService(IRepository<PostDraft> drafts, TimeProvider time)
{
    public const int MaxTitle = 120;
    public const int MaxBody = 3_000;
    public const int MaxHashtags = 10;
    public const int MaxHashtag = 50;
    public const int MaxLink = 2_000;
    public const int MaxImageSuggestion = 500;

    public async Task<IReadOnlyList<PostDraft>> ListAsync(CancellationToken cancellationToken) =>
        [.. (await drafts.GetAllAsync(cancellationToken)).OrderByDescending(draft => draft.CreatedAt)];

    /// <summary>The changed draft, or null when there is none with this id.</summary>
    public async Task<PostDraft?> UpdateAsync(string id, PostDraftInput input, CancellationToken cancellationToken)
    {
        var title = input.Title?.Trim() ?? "";
        var body = input.Body?.Trim() ?? "";
        var hashtags = PostDraft.NormalizeHashtags(input.Hashtags ?? []);
        var link = input.SourceLink?.Trim() ?? "";
        var image = input.ImageSuggestion?.Trim() ?? "";

        var errors = new Dictionary<string, string[]>();
        if (title.Length is 0 or > MaxTitle)
        {
            errors["title"] = [$"Başlık 1 ile {MaxTitle} karakter arasında olmalı."];
        }

        if (body.Length is 0 or > MaxBody)
        {
            errors["body"] = ["Metin 1 ile 3.000 karakter arasında olmalı."];
        }

        if (hashtags.Count > MaxHashtags || hashtags.Any(tag => tag.Length > MaxHashtag || tag.Any(c => c == '#' || char.IsWhiteSpace(c))))
        {
            errors["hashtags"] = [$"En fazla {MaxHashtags} hashtag olabilir; her biri boşluksuz ve en fazla {MaxHashtag} karakter olmalı."];
        }

        if (link.Length > MaxLink || (link.Length > 0 && !ProjectValidator.IsHttpsUrl(link)))
        {
            errors["sourceLink"] = ["Bağlantı https:// ile başlayan geçerli bir adres olmalı."];
        }

        if (image.Length > MaxImageSuggestion)
        {
            errors["imageSuggestion"] = [$"Görsel önerisi en fazla {MaxImageSuggestion} karakter olabilir."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var draft = await drafts.GetAsync(id, cancellationToken);
        if (draft is null)
        {
            return null;
        }

        var changed = draft with
        {
            Title = title,
            Body = body,
            Hashtags = hashtags,
            SourceLink = link.Length == 0 ? null : link,
            ImageSuggestion = image.Length == 0 ? null : image,
            UpdatedAt = time.GetUtcNow(),
        };
        await drafts.UpsertAsync(changed, cancellationToken);
        return changed;
    }

    public Task<bool> DeleteAsync(string id, CancellationToken cancellationToken) => drafts.DeleteAsync(id, cancellationToken);
}

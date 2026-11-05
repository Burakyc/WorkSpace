using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Notes;

/// <summary>A folder or a page in the notes tree. Any node can have children; only pages have content.</summary>
public sealed record NoteNode(
    string Id,
    string? ParentId,
    string Kind,
    string Title,
    int Order,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt) : IEntity
{
    public const string Folder = "folder";
    public const string Page = "page";
}

using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Notes;

/// <summary>The folder/page tree: siblings are ordered by <see cref="NoteNode.Order"/>; any node can hold children.</summary>
public sealed class NoteService(IRepository<NoteNode> nodes, JsonFileStore store, TimeProvider time)
{
    public const int MaxTitleLength = 200;

    /// <summary>Every node, grouped by parent (top level first) and ordered among its siblings.</summary>
    public async Task<IReadOnlyList<NoteNode>> ListAsync(CancellationToken cancellationToken) =>
        [.. (await nodes.GetAllAsync(cancellationToken))
            .OrderBy(n => n.ParentId is not null)
            .ThenBy(n => n.ParentId, StringComparer.Ordinal)
            .ThenBy(n => n.Order)
            .ThenBy(n => n.CreatedAt)];

    public async Task<NoteNode> CreateAsync(NoteCreateInput input, CancellationToken cancellationToken)
    {
        var all = await nodes.GetAllAsync(cancellationToken);
        var errors = new Dictionary<string, string[]>();
        AddTitleError(errors, input.Title);
        if (input.Kind is not (NoteNode.Folder or NoteNode.Page))
        {
            errors["kind"] = ["Tür klasör veya sayfa olmalı."];
        }

        if (input.ParentId is not null && all.All(n => n.Id != input.ParentId))
        {
            errors["parentId"] = [ParentMissing];
        }

        ThrowIfAny(errors);

        var now = time.GetUtcNow();
        var node = new NoteNode(
            Guid.NewGuid().ToString(), input.ParentId, input.Kind!, input.Title!.Trim(), NextOrder(all, input.ParentId), now, now);
        if (node.Kind == NoteNode.Page)
        {
            var empty = new JsonObject { ["blocks"] = new JsonArray() };
            await store.WriteAsync(NotesModule.PagePath(node.Id), NotesModule.PageSchema, empty, cancellationToken);
        }

        await nodes.UpsertAsync(node, cancellationToken);
        return node;
    }

    /// <summary>Returns null when no node has this id; does not write when the title is the same.</summary>
    public async Task<NoteNode?> RenameAsync(string id, NoteRenameInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        AddTitleError(errors, input.Title);
        ThrowIfAny(errors);

        var node = await nodes.GetAsync(id, cancellationToken);
        var title = input.Title!.Trim();
        if (node is null || node.Title == title)
        {
            return node;
        }

        var renamed = node with { Title = title, UpdatedAt = time.GetUtcNow() };
        await nodes.UpsertAsync(renamed, cancellationToken);
        return renamed;
    }

    /// <summary>Makes the node the last child of <paramref name="input"/>'s parent (null = top level). Returns null for an unknown id.</summary>
    public async Task<NoteNode?> MoveAsync(string id, NoteMoveInput input, CancellationToken cancellationToken)
    {
        var all = await nodes.GetAllAsync(cancellationToken);
        var node = all.FirstOrDefault(n => n.Id == id);
        if (node is null)
        {
            return null;
        }

        if (input.ParentId is not null)
        {
            if (all.All(n => n.Id != input.ParentId))
            {
                throw new ValidationException(new Dictionary<string, string[]> { ["parentId"] = [ParentMissing] });
            }

            if (input.ParentId == id || Descendants(all, id).Any(n => n.Id == input.ParentId))
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    ["parentId"] = ["Bir öğe kendi içine veya alt öğelerinden birine taşınamaz."],
                });
            }
        }

        if (node.ParentId == input.ParentId)
        {
            return node;
        }

        var moved = node with { ParentId = input.ParentId, Order = NextOrder(all, input.ParentId) };
        await nodes.UpsertAsync(moved, cancellationToken);
        return moved;
    }

    /// <summary>Swaps the node with its previous (-1) or next (1) sibling; at the edge nothing changes. Null for an unknown id.</summary>
    public async Task<NoteNode?> ShiftAsync(string id, NoteShiftInput input, CancellationToken cancellationToken)
    {
        if (input.Offset is not (-1 or 1))
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["offset"] = ["Kaydırma -1 veya 1 olmalı."] });
        }

        var all = await ListAsync(cancellationToken);
        var node = all.FirstOrDefault(n => n.Id == id);
        if (node is null)
        {
            return null;
        }

        var siblings = all.Where(n => n.ParentId == node.ParentId).ToList();
        var index = siblings.FindIndex(n => n.Id == id) + input.Offset;
        if (index < 0 || index >= siblings.Count)
        {
            return node;
        }

        // Swap positions, then number the siblings 0..n-1 (only changed ones are written), so gaps or ties never block a move.
        (siblings[index], siblings[index - input.Offset]) = (siblings[index - input.Offset], siblings[index]);
        for (var i = 0; i < siblings.Count; i++)
        {
            if (siblings[i].Order != i)
            {
                await nodes.UpsertAsync(siblings[i] with { Order = i }, cancellationToken);
            }
        }

        return node with { Order = index };
    }

    /// <summary>Deletes the node, all its descendants and their page files. Returns false for an unknown id.</summary>
    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var all = await nodes.GetAllAsync(cancellationToken);
        var node = all.FirstOrDefault(n => n.Id == id);
        if (node is null)
        {
            return false;
        }

        // Deepest first, so an interrupted delete never leaves a child without its parent.
        var doomed = Descendants(all, id).Reverse().Append(node).ToList();
        foreach (var item in doomed)
        {
            await nodes.DeleteAsync(item.Id, cancellationToken);
            if (item.Kind == NoteNode.Page)
            {
                await store.DeleteAsync(NotesModule.PagePath(item.Id), cancellationToken);
            }
        }

        return true;
    }

    /// <summary>The page's blocks (empty when its file is missing). Null for an unknown id; a folder is a validation error.</summary>
    public async Task<NoteContent?> GetContentAsync(string id, CancellationToken cancellationToken)
    {
        var node = await nodes.GetAsync(id, cancellationToken);
        if (node is null)
        {
            return null;
        }

        ThrowIfFolder(node);
        var document = await store.ReadAsync(NotesModule.PagePath(id), NotesModule.PageSchema, cancellationToken);
        var blocks = document?["blocks"] as JsonArray ?? [];
        return new NoteContent((JsonArray)blocks.DeepClone());
    }

    /// <summary>Replaces the page's blocks and sets its <see cref="NoteNode.UpdatedAt"/>. Null for an unknown id.</summary>
    public async Task<NoteNode?> SaveContentAsync(string id, NoteContentInput input, CancellationToken cancellationToken)
    {
        var node = await nodes.GetAsync(id, cancellationToken);
        if (node is null)
        {
            return null;
        }

        ThrowIfFolder(node);
        if (input.Blocks is not JsonArray blocks)
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["blocks"] = ["İçerik bir blok listesi olmalı."] });
        }

        var document = new JsonObject { ["blocks"] = blocks.DeepClone() };
        await store.WriteAsync(NotesModule.PagePath(id), NotesModule.PageSchema, document, cancellationToken);
        var saved = node with { UpdatedAt = time.GetUtcNow() };
        await nodes.UpsertAsync(saved, cancellationToken);
        return saved;
    }

    private static void ThrowIfFolder(NoteNode node)
    {
        if (node.Kind == NoteNode.Folder)
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["id"] = ["Klasörlerin içeriği yoktur."] });
        }
    }

    /// <summary>Every node under <paramref name="id"/>, parents before their children.</summary>
    private static IEnumerable<NoteNode> Descendants(IReadOnlyList<NoteNode> all, string id)
    {
        foreach (var child in all.Where(n => n.ParentId == id))
        {
            yield return child;
            foreach (var grandchild in Descendants(all, child.Id))
            {
                yield return grandchild;
            }
        }
    }

    private static int NextOrder(IReadOnlyList<NoteNode> all, string? parentId) =>
        all.Where(n => n.ParentId == parentId).Select(n => n.Order + 1).DefaultIfEmpty(0).Max();

    private static void AddTitleError(Dictionary<string, string[]> errors, string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            errors["title"] = ["Başlık gerekli."];
        }
        else if (title.Trim().Length > MaxTitleLength)
        {
            errors["title"] = ["Başlık en fazla 200 karakter olabilir."];
        }
    }

    private static void ThrowIfAny(Dictionary<string, string[]> errors)
    {
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }
    }

    private const string ParentMissing = "Üst öğe bulunamadı.";
}

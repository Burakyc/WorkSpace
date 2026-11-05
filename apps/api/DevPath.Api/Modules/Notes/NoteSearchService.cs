using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Notes;

/// <summary>A marked part of a snippet.</summary>
public sealed record Highlight(int Start, int Length);

/// <summary>A found page: where it is (ancestor titles, top first) and a piece of its text with the matches marked.</summary>
public sealed record NoteSearchResult(
    string Id,
    string Title,
    IReadOnlyList<string> Path,
    string Snippet,
    IReadOnlyList<Highlight> Highlights);

/// <summary>
/// Finds pages whose title or text holds every word of the query, ignoring case and Turkish letters.
/// Title matches come first, then the rest; newest edit first inside each group.
/// </summary>
public sealed class NoteSearchService(IRepository<NoteNode> nodes, NoteService notes)
{
    public const int MaxResults = 50;
    public const int SnippetLength = 120;
    private const int SnippetLead = 30;

    // ponytail: reads every page file per search; fine for hundreds of pages, add an index if it gets slow.
    public async Task<IReadOnlyList<NoteSearchResult>> SearchAsync(string? query, CancellationToken cancellationToken)
    {
        var trimmed = query?.Trim() ?? "";
        if (trimmed.Length is < 2 or > 200)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["q"] = ["Arama 2 ile 200 karakter arasında olmalı."],
            });
        }

        var words = SearchText.Words(trimmed);
        var all = await nodes.GetAllAsync(cancellationToken);
        var byId = all.ToDictionary(n => n.Id);
        var found = new List<(NoteNode Page, bool InTitle, string Text)>();

        foreach (var page in all.Where(n => n.Kind == NoteNode.Page))
        {
            var content = await notes.GetContentAsync(page.Id, cancellationToken);
            var text = content is null ? "" : NoteText.Extract(content.Blocks);
            var title = SearchText.Fold(page.Title);
            var folded = title + "\n" + SearchText.Fold(text);
            if (words.All(w => folded.Contains(w, StringComparison.Ordinal)))
            {
                found.Add((page, words.All(w => title.Contains(w, StringComparison.Ordinal)), text));
            }
        }

        return [.. found
            .OrderByDescending(f => f.InTitle)
            .ThenByDescending(f => f.Page.UpdatedAt)
            .Take(MaxResults)
            .Select(f => ToResult(f.Page, f.Text, words, byId))];
    }

    private static NoteSearchResult ToResult(
        NoteNode page, string text, IReadOnlyList<string> words, Dictionary<string, NoteNode> byId)
    {
        var path = new List<string>();
        for (var parentId = page.ParentId;
             parentId is not null && byId.TryGetValue(parentId, out var parent) && path.Count < byId.Count;
             parentId = parent.ParentId)
        {
            path.Insert(0, parent.Title);
        }

        var (snippet, highlights) = Snippet(text.Replace('\n', ' '), words);
        return new NoteSearchResult(page.Id, page.Title, path, snippet, highlights);
    }

    /// <summary>About 120 characters around the first match (the start of the text when none), with every match marked.</summary>
    private static (string Snippet, IReadOnlyList<Highlight> Highlights) Snippet(string text, IReadOnlyList<string> words)
    {
        var folded = SearchText.Fold(text);
        var first = words
            .Select(w => folded.IndexOf(w, StringComparison.Ordinal))
            .Where(i => i >= 0)
            .DefaultIfEmpty(0)
            .Min();
        var start = Math.Max(0, first - SnippetLead);
        var end = Math.Min(text.Length, start + SnippetLength);
        var prefix = start > 0 ? "…" : "";
        var suffix = end < text.Length ? "…" : "";
        var window = folded[start..end];

        // Ranges in snippet positions (after the prefix), sorted; overlapping or touching ones are merged.
        var ranges = words
            .SelectMany(w => Occurrences(window, w).Select(i => (Start: i + prefix.Length, End: i + prefix.Length + w.Length)))
            .OrderBy(r => r.Start);
        var merged = new List<(int Start, int End)>();
        foreach (var range in ranges)
        {
            if (merged.Count > 0 && range.Start <= merged[^1].End)
            {
                merged[^1] = (merged[^1].Start, Math.Max(merged[^1].End, range.End));
            }
            else
            {
                merged.Add(range);
            }
        }

        return (prefix + text[start..end] + suffix, [.. merged.Select(r => new Highlight(r.Start, r.End - r.Start))]);
    }

    private static IEnumerable<int> Occurrences(string text, string word)
    {
        for (var i = text.IndexOf(word, StringComparison.Ordinal); i >= 0; i = text.IndexOf(word, i + 1, StringComparison.Ordinal))
        {
            yield return i;
        }
    }
}

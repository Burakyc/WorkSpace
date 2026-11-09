using System.Net;
using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Posts;

public sealed record PageMeta(string? Title, string? Author, string? Description)
{
    public static readonly PageMeta Empty = new(null, null, null);
}

/// <summary>
/// Reads the title and meta tags of an HTML page. Only these few tags are needed, so there is no HTML parser;
/// every expression has a timeout and hostile markup gives empty fields, never an error.
/// </summary>
public static partial class HtmlMeta
{
    [GeneratedRegex(@"<title\b[^>]*>(?<text>.*?)</title\s*>", RegexOptions.Singleline | RegexOptions.IgnoreCase, 1000)]
    private static partial Regex TitleTag();

    [GeneratedRegex(@"<meta\b(?:[^>""']|""[^""]*""|'[^']*')*>", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex MetaTag();

    [GeneratedRegex(@"(?<![\w-])(?<name>name|property|content)\s*=\s*(?:""(?<value>[^""]*)""|'(?<value>[^']*)'|(?<value>[^\s>""']+))", RegexOptions.IgnoreCase, 1000)]
    private static partial Regex Attribute();

    public static PageMeta Parse(string html)
    {
        var end = html.IndexOf("</head", StringComparison.OrdinalIgnoreCase);
        var head = end >= 0 ? html[..end] : html;
        try
        {
            var meta = ReadMetaTags(head);
            var titleTag = TitleTag().Match(head);
            return new PageMeta(
                First(meta, "og:title", "twitter:title") ?? (titleTag.Success ? Clean(titleTag.Groups["text"].Value) : null),
                First(meta, "author", "og:site_name"),
                First(meta, "og:description", "description", "twitter:description"));
        }
        catch (RegexMatchTimeoutException)
        {
            return PageMeta.Empty;
        }
    }

    private static Dictionary<string, string> ReadMetaTags(string head)
    {
        var found = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match tag in MetaTag().Matches(head))
        {
            string? name = null, content = null;
            foreach (Match attribute in Attribute().Matches(tag.Value))
            {
                var value = attribute.Groups["value"].Value;
                if (attribute.Groups["name"].Value.Equals("content", StringComparison.OrdinalIgnoreCase))
                {
                    content = value;
                }
                else
                {
                    name ??= value;
                }
            }

            if (name is not null && Clean(content) is { } text)
            {
                found.TryAdd(name, text);
            }
        }

        return found;
    }

    private static string? First(Dictionary<string, string> meta, params string[] names) =>
        names.Select(meta.GetValueOrDefault).FirstOrDefault(value => value is not null);

    /// <summary>Entities decoded, whitespace collapsed; null when nothing is left.</summary>
    private static string? Clean(string? value)
    {
        var text = string.Join(' ', WebUtility.HtmlDecode(value ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return text.Length == 0 ? null : text;
    }
}

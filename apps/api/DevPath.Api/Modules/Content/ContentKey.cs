using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using DevPath.Api.Modules.Notes;

namespace DevPath.Api.Modules.Content;

/// <summary>How imported content is matched: item merge keys and topic slugs.</summary>
public static partial class ContentKey
{
    public const int MaxSlugLength = 80;

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NotSlug();

    /// <summary>"  Follow  up ON " → "follow up on": trimmed, one space between words, case and Turkish letters ignored.</summary>
    public static string Key(string value) => SearchText.Fold(Whitespace().Replace(value.Trim(), " "));

    /// <summary>"Phrasal verbs — İş toplantıları" → "phrasal-verbs-is-toplantilari"; empty when nothing is left.</summary>
    public static string Slug(string topic)
    {
        var plain = new StringBuilder(topic.Length);
        foreach (var c in SearchText.Fold(topic).Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                plain.Append(c);
            }
        }

        var slug = NotSlug().Replace(plain.ToString(), "-").Trim('-');
        return slug.Length <= MaxSlugLength ? slug : slug[..MaxSlugLength].TrimEnd('-');
    }
}

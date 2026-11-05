using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Pomodoro;

/// <summary>
/// Session tags: "#DI " → "di", "EF Core" → "ef-core", "#İngilizce" → "ingilizce". The renderer's
/// normalizeTag (src/modules/pomodoro/tags.ts) applies the same rules.
/// </summary>
public static partial class Tags
{
    public const int MaxLength = 30;
    public const int MaxCount = 10;

    public const string InvalidMessage =
        "Etiketler en fazla 30 karakter olabilir ve yalnızca harf, rakam, - ve _ içerebilir.";

    public const string TooManyMessage = "En fazla 10 etiket eklenebilir.";

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    [GeneratedRegex(@"^[\p{L}\p{N}_-]{1,30}$")]
    private static partial Regex Allowed();

    /// <summary>Trim, drop leading '#', '\u0130' → 'i', lower-case (invariant), drop U+0307, whitespace runs → '-'.</summary>
    public static string Normalize(string raw)
    {
        // .NET's invariant lower-casing leaves '\u0130' as it is, while JavaScript turns it into 'i' + U+0307:
        // map it to 'i' here and drop U+0307, so both sides agree.
        var tag = raw.Trim().TrimStart('#').Trim().Replace('\u0130', 'i').ToLowerInvariant().Replace("\u0307", "");
        return Whitespace().Replace(tag, "-");
    }

    public static bool IsValid(string tag) => Allowed().IsMatch(tag);

    /// <summary>Normalized tags without duplicates, in their first order; <paramref name="error"/> is set when any is invalid or there are too many.</summary>
    public static IReadOnlyList<string> NormalizeAll(IEnumerable<string?>? raw, out string? error)
    {
        error = null;
        var tags = new List<string>();
        foreach (var value in raw ?? [])
        {
            var tag = Normalize(value ?? "");
            if (!IsValid(tag))
            {
                error = InvalidMessage;
                return [];
            }
            if (!tags.Contains(tag))
            {
                tags.Add(tag);
            }
        }

        if (tags.Count > MaxCount)
        {
            error = TooManyMessage;
            return [];
        }

        return tags;
    }
}

namespace DevPath.Api.Modules.Notes;

/// <summary>
/// Folds text for matching: lower case with Turkish letters mapped to their plain forms (ı/I/İ → i, ş → s, ç → c,
/// ğ → g, ö → o, ü → u). One character in, one out, so positions in the folded text are positions in the original.
/// </summary>
public static class SearchText
{
    public static string Fold(string text) =>
        string.Create(text.Length, text, static (span, source) =>
        {
            for (var i = 0; i < source.Length; i++)
            {
                span[i] = source[i] switch
                {
                    'ı' or 'I' or 'İ' => 'i',
                    'ş' or 'Ş' => 's',
                    'ç' or 'Ç' => 'c',
                    'ğ' or 'Ğ' => 'g',
                    'ö' or 'Ö' => 'o',
                    'ü' or 'Ü' => 'u',
                    var c => char.ToLowerInvariant(c),
                };
            }
        });

    /// <summary>The folded, distinct words of a query.</summary>
    public static IReadOnlyList<string> Words(string query) =>
        [.. Fold(query).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Distinct()];
}

namespace DevPath.Api.Modules.Opportunities;

/// <summary>Turns what the user types into an https site URL: a bare domain gets <c>https://</c>, anything else must already be https.</summary>
public static class OpportunitySiteUrl
{
    public const int MaxLength = 2000;
    public const string RequiredError = "Adres gerekli.";
    public const string HttpsError = "Sadece https adresleri eklenebilir.";
    public const string FormatError = "Geçerli bir adres gir.";
    public const string LengthError = "Adres en fazla 2.000 karakter olabilir.";

    /// <summary>The parsed URL, or null with the Turkish reason in <paramref name="error"/>.</summary>
    public static Uri? Parse(string? input, out string error)
    {
        var text = (input ?? "").Trim();
        error = "";

        if (text.Length == 0)
        {
            error = RequiredError;
            return null;
        }
        if (text.Length > MaxLength)
        {
            error = LengthError;
            return null;
        }
        if (!text.Contains("://", StringComparison.Ordinal))
        {
            text = "https://" + text;
        }
        if (!Uri.TryCreate(text, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            error = HttpsError;
            return null;
        }
        if (!uri.Host.Contains('.') || uri.UserInfo.Length > 0 || !uri.IsDefaultPort)
        {
            error = FormatError;
            return null;
        }
        return uri;
    }

    /// <summary>The site's id: the host in lower case without a leading <c>www.</c>.</summary>
    public static string Id(Uri url)
    {
        var host = url.Host.ToLowerInvariant();
        return host.StartsWith("www.", StringComparison.Ordinal) ? host[4..] : host;
    }
}

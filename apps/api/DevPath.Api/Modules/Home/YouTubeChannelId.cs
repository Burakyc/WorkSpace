using System.Text.RegularExpressions;

namespace DevPath.Api.Modules.Home;

/// <summary>Reads a channel ID from what the user types: a bare <c>UC…</c> ID or a youtube.com/channel/ URL.</summary>
public static partial class YouTubeChannelId
{
    public const string FormatError = "Kanal ID'si (UC ile başlar) ya da youtube.com/channel/… adresi gir.";
    public const string HandleError = "@kullanıcı adresleri desteklenmiyor. Kanal sayfasındaki kanal ID'sini (UC…) gir.";

    /// <summary>The channel ID, or null with the Turkish reason in <paramref name="error"/>.</summary>
    public static string? Parse(string? input, out string error)
    {
        var text = (input ?? "").Trim();
        error = "";

        if (IdPattern().IsMatch(text))
        {
            return text;
        }

        var match = UrlPattern().Match(text);
        if (match.Success)
        {
            return match.Groups["id"].Value;
        }

        error = HandlePattern().IsMatch(text) ? HandleError : FormatError;
        return null;
    }

    [GeneratedRegex("^UC[A-Za-z0-9_-]{22}$")]
    private static partial Regex IdPattern();

    [GeneratedRegex(@"^(https?://)?((www|m)\.)?youtube\.com/channel/(?<id>UC[A-Za-z0-9_-]{22})([/?#].*)?$", RegexOptions.IgnoreCase)]
    private static partial Regex UrlPattern();

    [GeneratedRegex(@"^((https?://)?((www|m)\.)?youtube\.com/)?@", RegexOptions.IgnoreCase)]
    private static partial Regex HandlePattern();
}

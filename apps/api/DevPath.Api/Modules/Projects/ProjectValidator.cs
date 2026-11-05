namespace DevPath.Api.Modules.Projects;

/// <summary>Field rules for projects. The goal checks need storage and live in <see cref="ProjectService"/>.</summary>
public static class ProjectValidator
{
    public const int TitleMaxLength = 120;
    public const int UrlMaxLength = 2048;

    public static Dictionary<string, string[]> ValidateFields(string? title, string? url)
    {
        var errors = new Dictionary<string, string[]>();

        var trimmedTitle = title?.Trim() ?? "";
        if (trimmedTitle.Length == 0)
        {
            errors["title"] = ["Başlık gerekli."];
        }
        else if (trimmedTitle.Length > TitleMaxLength)
        {
            errors["title"] = [$"Başlık en fazla {TitleMaxLength} karakter olabilir."];
        }

        var trimmedUrl = url?.Trim() ?? "";
        if (trimmedUrl.Length > UrlMaxLength)
        {
            errors["url"] = [$"Bağlantı en fazla {UrlMaxLength} karakter olabilir."];
        }
        else if (trimmedUrl.Length > 0 && !IsHttpsUrl(trimmedUrl))
        {
            errors["url"] = ["Bağlantı https:// ile başlayan geçerli bir adres olmalı."];
        }

        return errors;
    }

    /// <summary>The same rule Electron main applies before opening a link.</summary>
    public static bool IsHttpsUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        uri.Host.Length > 0;
}

namespace DevPath.Api.Modules.Ai;

/// <summary>A provider's answer: the text (null when there is none), the tokens billed and a Turkish <see cref="Error"/> when it can't be used.</summary>
public sealed record AiAnswer(string? Text, int InputTokens, int OutputTokens, string? Error);

/// <summary>Sends one prompt to one provider: exactly one HTTP call, because every call costs money and needs a confirmation.</summary>
public interface IAiProviderClient
{
    string ProviderId { get; }

    Task<AiAnswer> AskAsync(string prompt, CancellationToken cancellationToken);
}

/// <summary>What the clients share: the Turkish errors, and the stub server used to validate the real app without a paid call.</summary>
public static class AiConnection
{
    public const string StubUrlSetting = "DEVPATH_AI_STUB_URL";
    public const string Unreachable = "Yapay zekâya ulaşılamadı.";
    public const string Unreadable = "Yapay zekâ yanıtı okunamadı.";
    public const string CutOff = "Cevap çıktı sınırında kesildi; prompt'u küçült.";
    public const string Refused = "Yapay zekâ bu isteği yanıtlamadı.";
    public const string NoKey = "API anahtarı kayıtlı değil. Ayarlar'dan ekle.";

    public static string ErrorFor(int status) => status switch
    {
        401 or 403 => "API anahtarı geçersiz.",
        429 => "İstek sınırına ulaşıldı. Biraz sonra tekrar dene.",
        _ => $"Yapay zekâ isteği başarısız oldu ({status}).",
    };

    /// <summary>The stub server's URL in Development; null elsewhere, so a key can only ever go to the real provider.</summary>
    public static string? StubUrl(IConfiguration configuration, IHostEnvironment environment) =>
        environment.IsDevelopment() && !string.IsNullOrWhiteSpace(configuration[StubUrlSetting]) ? configuration[StubUrlSetting] : null;
}

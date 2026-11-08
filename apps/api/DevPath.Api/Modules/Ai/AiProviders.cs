namespace DevPath.Api.Modules.Ai;

/// <summary>One AI provider: its model, its prices in dollars per million tokens and the setting that holds its key.</summary>
public sealed record AiProvider(string Id, string Label, string Model, decimal InputPerMillion, decimal OutputPerMillion, string KeySetting);

/// <summary>What the page may know about a provider. The key is only <see cref="HasKey"/>.</summary>
public sealed record AiProviderInfo(string Id, string Label, string Model, decimal InputPerMillion, decimal OutputPerMillion, int MaxOutputTokens, bool HasKey);

/// <summary>The AI providers of the API mode. A model change is one line here.</summary>
public static class AiProviders
{
    public const string Claude = "claude";
    public const string Gemini = "gemini";
    public const int MaxOutputTokens = 16_000;

    public static readonly IReadOnlyList<AiProvider> All =
    [
        new(Claude, "Claude Opus 5.5", "claude-opus-5-5", 4m, 20m, "DEVPATH_ANTHROPIC_API_KEY"),
        new(Gemini, "Gemini 3.1 Pro", "gemini-3.1-pro-preview", 2m, 12m, "DEVPATH_GEMINI_API_KEY"),
    ];

    public static AiProvider? Find(string? id) => All.FirstOrDefault(provider => provider.Id == id);
}

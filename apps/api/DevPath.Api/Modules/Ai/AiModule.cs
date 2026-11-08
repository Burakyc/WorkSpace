namespace DevPath.Api.Modules.Ai;

/// <summary>The API mode: the provider clients with their named HTTP clients, whose logs redact every header so a key never reaches a log.</summary>
public static class AiModule
{
    /// <summary>An answer of 16,000 tokens can take minutes.</summary>
    public static readonly TimeSpan Timeout = TimeSpan.FromMinutes(5);

    public static IServiceCollection AddAi(this IServiceCollection services)
    {
        services.AddHttpClient(ClaudeClient.ClientName, client => client.Timeout = Timeout).RedactLoggedHeaders(_ => true);
        services.AddHttpClient(GeminiClient.ClientName, client => client.Timeout = Timeout).RedactLoggedHeaders(_ => true);
        services.AddSingleton<IAiProviderClient, ClaudeClient>();
        services.AddSingleton<IAiProviderClient, GeminiClient>();
        services.AddSingleton<AiService>();
        return services;
    }
}

using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Ai;

public sealed record AiRunInput(string? Provider, string? Type, string? Prompt);

[ApiController]
[Route("api/ai")]
public sealed class AiController(AiService ai, IConfiguration configuration) : ControllerBase
{
    [HttpGet("providers")]
    public IEnumerable<AiProviderInfo> Providers() => AiProviders.All.Select(provider => new AiProviderInfo(
        provider.Id, provider.Label, provider.Model, provider.InputPerMillion, provider.OutputPerMillion, AiProviders.MaxOutputTokens,
        !string.IsNullOrWhiteSpace(configuration[provider.KeySetting])));

    /// <summary>One paid call. Only the page's confirmation ever sends this; nothing in the API does.</summary>
    [HttpPost("run")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public Task<AiRunResult> Run(AiRunInput input, CancellationToken cancellationToken) =>
        ai.RunAsync(input.Provider, input.Type, input.Prompt, cancellationToken);
}

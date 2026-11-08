using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Modules.Ai;

public sealed record AiUsage(int InputTokens, int OutputTokens, decimal CostUsd);

/// <summary>
/// What a run did. <see cref="Error"/>: the call or its answer failed. <see cref="Errors"/>: the answer is invalid, nothing saved.
/// <see cref="Report"/>: saved. <see cref="Usage"/> and the raw <see cref="Output"/> are there whenever the provider answered.
/// </summary>
public sealed record AiRunResult(string? Error, IReadOnlyList<ImportError> Errors, ImportReport? Report, AiUsage? Usage, string? Output);

/// <summary>Runs one prompt through one provider and feeds the answer through the import validator and merge, like any import.</summary>
public sealed class AiService(IEnumerable<IAiProviderClient> clients, ImportService imports, IConfiguration configuration)
{
    public const int MaxPromptLength = 200_000;

    public async Task<AiRunResult> RunAsync(string? providerId, string? type, string? prompt, CancellationToken cancellationToken)
    {
        var provider = AiProviders.Find(providerId) ?? throw new ValidationException(new Dictionary<string, string[]>
        {
            ["provider"] = ["Bilinmeyen sağlayıcı."],
        });
        ContentType.Require(type);
        if (string.IsNullOrWhiteSpace(prompt) || prompt.Length > MaxPromptLength)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["prompt"] = [$"Prompt 1 ile {MaxPromptLength} karakter arasında olmalı."],
            });
        }
        if (string.IsNullOrWhiteSpace(configuration[provider.KeySetting]))
        {
            return new AiRunResult(AiConnection.NoKey, [], null, null, null);
        }

        var answer = await clients.Single(client => client.ProviderId == provider.Id).AskAsync(prompt, cancellationToken);
        var usage = answer.Text is null && answer.InputTokens == 0 && answer.OutputTokens == 0 ? null : new AiUsage(
            answer.InputTokens,
            answer.OutputTokens,
            (answer.InputTokens * provider.InputPerMillion + answer.OutputTokens * provider.OutputPerMillion) / 1_000_000m);
        if (answer.Error is not null || answer.Text is null)
        {
            return new AiRunResult(answer.Error, [], null, usage, Capped(answer.Text));
        }

        var result = await imports.ImportAsync(type, answer.Text, cancellationToken);
        return new AiRunResult(null, result.Errors, result.Report, usage, Capped(answer.Text));
    }

    private static string? Capped(string? text) =>
        text is { Length: > ImportValidator.MaxBytes } ? text[..ImportValidator.MaxBytes] : text;
}

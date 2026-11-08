using System.Text.Json;
using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;

namespace DevPath.Api.Modules.Ai;

/// <summary>Claude through the official SDK, on the named <c>claude</c> client. The SDK's retries are off: a retry would be a paid call nobody confirmed.</summary>
public sealed class ClaudeClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<ClaudeClient> logger) : IAiProviderClient
{
    public const string ClientName = "claude";

    private static readonly AiProvider Provider = AiProviders.Find(AiProviders.Claude)!;

    public string ProviderId => Provider.Id;

    public async Task<AiAnswer> AskAsync(string prompt, CancellationToken cancellationToken)
    {
        using var http = httpClientFactory.CreateClient(ClientName);
        var client = new AnthropicClient
        {
            ApiKey = configuration[Provider.KeySetting],
            HttpClient = http,
            MaxRetries = 0,
            Timeout = AiModule.Timeout,
            BaseUrl = AiConnection.StubUrl(configuration, environment) ?? "https://api.anthropic.com",
        };

        try
        {
            var message = await client.Messages.Create(new MessageCreateParams
            {
                Model = Provider.Model,
                MaxTokens = AiProviders.MaxOutputTokens,
                OutputConfig = new OutputConfig { Effort = Effort.Medium },
                Messages = [new UserMessageParam { Content = prompt }],
            }, cancellationToken);

            var text = string.Concat(message.Content.Select(block => block.Value).OfType<TextBlock>().Select(block => block.Text));
            var input = (int)message.Usage.InputTokens;
            var output = (int)message.Usage.OutputTokens;
            var stop = message.StopReason?.Raw();
            var error = stop == "max_tokens" ? AiConnection.CutOff : stop == "refusal" ? AiConnection.Refused : null;
            return new AiAnswer(text, input, output, error);
        }
        catch (AnthropicApiException ex)
        {
            logger.LogWarning("Claude answered {Status}.", (int)ex.StatusCode);
            return new AiAnswer(null, 0, 0, AiConnection.ErrorFor((int)ex.StatusCode));
        }
        catch (Exception ex) when (ex is AnthropicIOException or HttpRequestException || (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("Claude could not be reached: {Reason}", ex.GetType().Name);
            return new AiAnswer(null, 0, 0, AiConnection.Unreachable);
        }
        catch (Exception ex) when (ex is AnthropicException or JsonException or InvalidOperationException)
        {
            logger.LogWarning("Claude answered with unexpected JSON: {Reason}", ex.GetType().Name);
            return new AiAnswer(null, 0, 0, AiConnection.Unreadable);
        }
    }
}

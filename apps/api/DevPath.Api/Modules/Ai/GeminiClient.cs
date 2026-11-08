using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Modules.Ai;

/// <summary>Gemini's generateContent over the named <c>gemini</c> client. The key goes in a header, never the URL, which logs show.</summary>
public sealed class GeminiClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<GeminiClient> logger) : IAiProviderClient
{
    public const string ClientName = "gemini";

    private static readonly AiProvider Provider = AiProviders.Find(AiProviders.Gemini)!;

    public string ProviderId => Provider.Id;

    public async Task<AiAnswer> AskAsync(string prompt, CancellationToken cancellationToken)
    {
        var baseUrl = AiConnection.StubUrl(configuration, environment) ?? "https://generativelanguage.googleapis.com";
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/v1beta/models/{Provider.Model}:generateContent")
        {
            Content = JsonContent.Create(new
            {
                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                generationConfig = new { maxOutputTokens = AiProviders.MaxOutputTokens, responseMimeType = "application/json" },
            }),
        };
        request.Headers.Add("x-goog-api-key", configuration[Provider.KeySetting]);

        try
        {
            using var client = httpClientFactory.CreateClient(ClientName);
            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Gemini answered {Status}.", (int)response.StatusCode);
                return new AiAnswer(null, 0, 0, AiConnection.ErrorFor((int)response.StatusCode));
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            return Read(document.RootElement);
        }
        catch (Exception ex) when (ex is HttpRequestException || (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("Gemini could not be reached: {Reason}", ex.GetType().Name);
            return new AiAnswer(null, 0, 0, AiConnection.Unreachable);
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException)
        {
            logger.LogWarning("Gemini answered with unexpected JSON: {Reason}", ex.GetType().Name);
            return new AiAnswer(null, 0, 0, AiConnection.Unreadable);
        }
    }

    private static AiAnswer Read(JsonElement root)
    {
        var (input, output) = ReadUsage(root);
        if (root.TryGetProperty("promptFeedback", out var feedback) && feedback.TryGetProperty("blockReason", out _))
        {
            return new AiAnswer(null, input, output, AiConnection.Refused);
        }

        var candidate = root.GetProperty("candidates")[0];
        var text = candidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts)
            ? string.Concat(parts.EnumerateArray()
                .Where(part => !part.TryGetProperty("thought", out var thought) || !thought.GetBoolean())
                .Select(part => part.TryGetProperty("text", out var value) ? value.GetString() : null))
            : "";
        var finish = candidate.TryGetProperty("finishReason", out var reason) ? reason.GetString() : null;
        var error = finish switch
        {
            null or "STOP" => text.Length > 0 ? null : AiConnection.Unreadable,
            "MAX_TOKENS" => AiConnection.CutOff,
            _ => AiConnection.Refused,
        };
        return new AiAnswer(text, input, output, error);
    }

    /// <summary>Google bills thinking tokens as output.</summary>
    private static (int Input, int Output) ReadUsage(JsonElement root)
    {
        if (!root.TryGetProperty("usageMetadata", out var usage))
        {
            return (0, 0);
        }

        int Count(string name) => usage.TryGetProperty(name, out var value) ? value.GetInt32() : 0;
        return (Count("promptTokenCount"), Count("candidatesTokenCount") + Count("thoughtsTokenCount"));
    }
}

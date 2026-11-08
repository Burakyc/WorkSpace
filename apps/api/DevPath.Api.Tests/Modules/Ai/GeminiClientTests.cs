using System.Net;
using System.Text;
using System.Text.Json;
using DevPath.Api.Modules.Ai;
using DevPath.Api.Tests.Modules.Home;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging;

namespace DevPath.Api.Tests.Modules.Ai;

public class GeminiClientTests
{
    private const string Key = "gemini-secret-key-value";

    private static string Answer(string finish = "STOP") => $$"""
        {
          "candidates": [ {
            "content": { "role": "model", "parts": [ { "text": "gizli", "thought": true }, { "text": "mer" }, { "text": "haba" } ] },
            "finishReason": "{{finish}}"
          } ],
          "usageMetadata": { "promptTokenCount": 100, "candidatesTokenCount": 200, "thoughtsTokenCount": 50 }
        }
        """;

    private static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private static (GeminiClient Client, CapturingLoggerProvider Logs, ServiceProvider Services) Create(StubHttpHandler handler, string environment = "Production")
    {
        var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection()
            .AddLogging(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(logs))
            .AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DEVPATH_GEMINI_API_KEY"] = Key,
                [AiConnection.StubUrlSetting] = "http://127.0.0.1:9",
            }).Build())
            .AddSingleton<IHostEnvironment>(new HostingEnvironment { EnvironmentName = environment })
            .AddAi();
        services.AddHttpClient(GeminiClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => handler);
        var provider = services.BuildServiceProvider();
        return (provider.GetServices<IAiProviderClient>().OfType<GeminiClient>().Single(), logs, provider);
    }

    [Fact]
    public async Task Sends_the_prompt_once_with_the_key_in_a_header_and_reads_the_answer()
    {
        string? body = null;
        string? header = null;
        var handler = new StubHttpHandler(request =>
        {
            body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            header = request.Headers.GetValues("x-goog-api-key").Single();
            return Json(Answer());
        });
        var (client, logs, services) = Create(handler);
        await using var _ = services;

        var answer = await client.AskAsync("Bir konu yaz.", default);

        Assert.Null(answer.Error);
        Assert.Equal("merhaba", answer.Text);
        Assert.Equal(100, answer.InputTokens);
        Assert.Equal(250, answer.OutputTokens);
        var uri = Assert.Single(handler.Requests).RequestUri!;
        Assert.Equal("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent", uri.ToString());
        Assert.Equal(Key, header);
        var sent = JsonDocument.Parse(body!).RootElement;
        Assert.Equal("Bir konu yaz.", sent.GetProperty("contents")[0].GetProperty("parts")[0].GetProperty("text").GetString());
        Assert.Equal(16000, sent.GetProperty("generationConfig").GetProperty("maxOutputTokens").GetInt32());
        Assert.DoesNotContain(logs.Messages, message => message.Contains(Key, StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(401, "API anahtarı geçersiz.")]
    [InlineData(403, "API anahtarı geçersiz.")]
    [InlineData(429, "İstek sınırına ulaşıldı. Biraz sonra tekrar dene.")]
    [InlineData(503, "Yapay zekâ isteği başarısız oldu (503).")]
    public async Task A_failed_call_gives_a_turkish_error_and_is_never_retried(int status, string expected)
    {
        var handler = new StubHttpHandler(_ => Json($$"""{ "error": { "message": "provider text with {{Key}}" } }""", (HttpStatusCode)status));
        var (client, logs, services) = Create(handler);
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(expected, answer.Error);
        Assert.Single(handler.Requests);
        Assert.DoesNotContain(logs.Messages, message => message.Contains(Key, StringComparison.Ordinal));
    }

    [Fact]
    public async Task An_unreachable_provider_is_not_retried()
    {
        var handler = new StubHttpHandler(_ => throw new HttpRequestException("offline"));
        var (client, _, services) = Create(handler);
        await using var _ = services;

        Assert.Equal(AiConnection.Unreachable, (await client.AskAsync("p", default)).Error);
        Assert.Single(handler.Requests);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{ "candidates": [] }""")]
    [InlineData("""{ "candidates": [ { "finishReason": "STOP" } ] }""")]
    public async Task An_unreadable_answer_is_an_error(string body)
    {
        var (client, _, services) = Create(new StubHttpHandler(_ => Json(body)));
        await using var _ = services;

        Assert.Equal(AiConnection.Unreadable, (await client.AskAsync("p", default)).Error);
    }

    [Theory]
    [InlineData("MAX_TOKENS", AiConnection.CutOff)]
    [InlineData("SAFETY", AiConnection.Refused)]
    [InlineData("RECITATION", AiConnection.Refused)]
    public async Task A_cut_off_or_refused_answer_is_an_error_with_its_usage(string finish, string expected)
    {
        var (client, _, services) = Create(new StubHttpHandler(_ => Json(Answer(finish))));
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(expected, answer.Error);
        Assert.Equal(250, answer.OutputTokens);
    }

    [Fact]
    public async Task A_blocked_prompt_is_a_refusal()
    {
        var (client, _, services) = Create(new StubHttpHandler(_ => Json("""{ "promptFeedback": { "blockReason": "SAFETY" } }""")));
        await using var _ = services;

        Assert.Equal(AiConnection.Refused, (await client.AskAsync("p", default)).Error);
    }

    [Fact]
    public async Task Uses_the_stub_server_in_development_only()
    {
        var handler = new StubHttpHandler(_ => Json(Answer()));
        var (client, _, services) = Create(handler, "Development");
        await using var _ = services;

        await client.AskAsync("p", default);

        Assert.StartsWith("http://127.0.0.1:9/v1beta/", handler.Requests[0].RequestUri!.ToString());
    }
}

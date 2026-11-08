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

public class ClaudeClientTests
{
    private const string Key = "sk-ant-secret-key-value";

    private static string Message(string text = "merhaba", string stop = "end_turn") => $$"""
        {
          "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-opus-5-5",
          "content": [ { "type": "text", "text": "{{text}}" } ],
          "stop_reason": "{{stop}}", "stop_sequence": null,
          "usage": { "input_tokens": 120, "output_tokens": 450, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0 }
        }
        """;

    private static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private static (ClaudeClient Client, CapturingLoggerProvider Logs, ServiceProvider Services) Create(StubHttpHandler handler, string? stubUrl = null)
    {
        var logs = new CapturingLoggerProvider();
        var services = new ServiceCollection()
            .AddLogging(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(logs))
            .AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DEVPATH_ANTHROPIC_API_KEY"] = Key,
                [AiConnection.StubUrlSetting] = stubUrl,
            }).Build())
            .AddSingleton<IHostEnvironment>(new HostingEnvironment { EnvironmentName = Environments.Production })
            .AddAi();
        services.AddHttpClient(ClaudeClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => handler);
        var provider = services.BuildServiceProvider();
        return (provider.GetServices<IAiProviderClient>().OfType<ClaudeClient>().Single(), logs, provider);
    }

    [Fact]
    public async Task Sends_the_prompt_once_and_reads_text_and_usage()
    {
        string? body = null;
        var headers = new List<string>();
        var handler = new StubHttpHandler(request =>
        {
            body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            headers.AddRange(request.Headers.Select(header => $"{header.Key}: {string.Join(",", header.Value)}"));
            return Json(Message());
        });
        var (client, _, services) = Create(handler);
        await using var _ = services;

        var answer = await client.AskAsync("Bir konu yaz.", default);

        Assert.Null(answer.Error);
        Assert.Equal("merhaba", answer.Text);
        Assert.Equal(120, answer.InputTokens);
        Assert.Equal(450, answer.OutputTokens);
        var request = Assert.Single(handler.Requests);
        Assert.EndsWith("/v1/messages", request.RequestUri!.AbsolutePath);
        Assert.Equal("api.anthropic.com", request.RequestUri.Host);
        // SDK 13.x sends an API key this way (ClientOptions.ApiKey).
        Assert.Contains($"Authorization: Bearer {Key}", headers);
        var sent = JsonDocument.Parse(body!).RootElement;
        Assert.Equal("claude-opus-5-5", sent.GetProperty("model").GetString());
        Assert.Equal(16000, sent.GetProperty("max_tokens").GetInt32());
        Assert.Equal("Bir konu yaz.", sent.GetProperty("messages")[0].GetProperty("content").GetString());
    }

    [Theory]
    [InlineData(401, "API anahtarı geçersiz.")]
    [InlineData(403, "API anahtarı geçersiz.")]
    [InlineData(429, "İstek sınırına ulaşıldı. Biraz sonra tekrar dene.")]
    [InlineData(500, "Yapay zekâ isteği başarısız oldu (500).")]
    [InlineData(529, "Yapay zekâ isteği başarısız oldu (529).")]
    public async Task A_failed_call_gives_a_turkish_error_and_is_never_retried(int status, string expected)
    {
        var handler = new StubHttpHandler(_ => Json($$"""{ "type": "error", "error": { "type": "x", "message": "provider text with {{Key}}" } }""", (HttpStatusCode)status));
        var (client, logs, services) = Create(handler);
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(expected, answer.Error);
        Assert.Null(answer.Text);
        Assert.Single(handler.Requests);
        Assert.DoesNotContain(logs.Messages, message => message.Contains(Key, StringComparison.Ordinal));
    }

    [Fact]
    public async Task An_unreachable_provider_is_not_retried()
    {
        var handler = new StubHttpHandler(_ => throw new HttpRequestException("offline"));
        var (client, _, services) = Create(handler);
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(AiConnection.Unreachable, answer.Error);
        Assert.Single(handler.Requests);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{ "content": "x" }""")]
    public async Task An_unreadable_answer_is_an_error(string body)
    {
        var (client, _, services) = Create(new StubHttpHandler(_ => Json(body)));
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(AiConnection.Unreadable, answer.Error);
    }

    [Theory]
    [InlineData("max_tokens", AiConnection.CutOff)]
    [InlineData("refusal", AiConnection.Refused)]
    public async Task A_cut_off_or_refused_answer_is_an_error_with_its_usage(string stop, string expected)
    {
        var (client, _, services) = Create(new StubHttpHandler(_ => Json(Message(stop: stop))));
        await using var _ = services;

        var answer = await client.AskAsync("p", default);

        Assert.Equal(expected, answer.Error);
        Assert.Equal(450, answer.OutputTokens);
    }

    [Fact]
    public async Task The_stub_server_is_ignored_outside_development()
    {
        var handler = new StubHttpHandler(_ => Json(Message()));
        var (client, _, services) = Create(handler, stubUrl: "http://127.0.0.1:9");
        await using var _ = services;

        await client.AskAsync("p", default);

        Assert.Equal("api.anthropic.com", handler.Requests[0].RequestUri!.Host);
    }
}

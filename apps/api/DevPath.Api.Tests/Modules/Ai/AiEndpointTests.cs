using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DevPath.Api.Modules.Ai;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace DevPath.Api.Tests.Modules.Ai;

public class AiEndpointTests
{
    private const string Key = "sk-ant-secret-key-value";

    [Fact]
    public async Task Lists_the_providers_with_prices_and_only_whether_a_key_exists()
    {
        await using var factory = new ApiFactory();
        var client = factory.WithWebHostBuilder(builder => builder.UseSetting("DEVPATH_ANTHROPIC_API_KEY", Key)).CreateClient();

        var body = await client.GetStringAsync("/api/ai/providers");

        Assert.DoesNotContain(Key, body);
        var providers = JsonDocument.Parse(body).RootElement;
        var claude = providers[0];
        Assert.Equal(AiProviders.Claude, claude.GetProperty("id").GetString());
        Assert.Equal("claude-opus-5-5", claude.GetProperty("model").GetString());
        Assert.Equal(4m, claude.GetProperty("inputPerMillion").GetDecimal());
        Assert.Equal(20m, claude.GetProperty("outputPerMillion").GetDecimal());
        Assert.Equal(16000, claude.GetProperty("maxOutputTokens").GetInt32());
        Assert.True(claude.GetProperty("hasKey").GetBoolean());
        var gemini = providers[1];
        Assert.Equal("gemini-3.1-pro-preview", gemini.GetProperty("model").GetString());
        Assert.False(gemini.GetProperty("hasKey").GetBoolean());
    }

    [Theory]
    [InlineData("openai", "vocab", "p", "provider")]
    [InlineData("claude", "x", "p", "type")]
    [InlineData("claude", "vocab", " ", "prompt")]
    public async Task Bad_input_is_refused_on_its_field_without_a_call(string provider, string type, string prompt, string field)
    {
        var handler = new StubHttpHandler(_ => throw new InvalidOperationException("No call was expected."));
        await using var factory = new ApiFactory();
        var client = Client(factory, handler);

        var response = await client.PostAsJsonAsync("/api/ai/run", new { provider, type, prompt });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("errors").TryGetProperty(field, out _));
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task An_oversized_prompt_is_refused()
    {
        var handler = new StubHttpHandler(_ => throw new InvalidOperationException("No call was expected."));
        await using var factory = new ApiFactory();

        var response = await Client(factory, handler).PostAsJsonAsync("/api/ai/run", new { provider = "claude", type = "vocab", prompt = new string('x', AiService.MaxPromptLength + 1) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Without_a_key_it_answers_with_an_error_and_no_call()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/ai/run", new { provider = "gemini", type = "vocab", prompt = "p" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(AiConnection.NoKey, body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Runs_the_prompt_once_and_keeps_the_key_out_of_the_answer()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests) { Content = new StringContent($$"""{ "type": "error", "error": { "type": "x", "message": "{{Key}}" } }""", Encoding.UTF8, "application/json") });
        await using var factory = new ApiFactory();

        var response = await Client(factory, handler).PostAsJsonAsync("/api/ai/run", new { provider = "claude", type = "vocab", prompt = "p" });

        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(Key, text);
        Assert.Equal("İstek sınırına ulaşıldı. Biraz sonra tekrar dene.", JsonDocument.Parse(text).RootElement.GetProperty("error").GetString());
        Assert.Single(handler.Requests);
    }

    private static HttpClient Client(ApiFactory factory, StubHttpHandler handler) => factory.WithWebHostBuilder(builder =>
    {
        builder.UseSetting("DEVPATH_ANTHROPIC_API_KEY", Key);
        builder.ConfigureTestServices(services =>
            services.AddHttpClient(ClaudeClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => handler));
    }).CreateClient();
}

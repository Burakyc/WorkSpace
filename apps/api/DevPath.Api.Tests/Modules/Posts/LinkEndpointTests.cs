using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DevPath.Api.Modules.Posts;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;

namespace DevPath.Api.Tests.Modules.Posts;

public class LinkEndpointTests
{
    private static JsonElement Body(string text) => JsonDocument.Parse(text).RootElement;

    [Theory]
    [InlineData("http://example.com/")]
    [InlineData("https://127.0.0.1/")]
    [InlineData(null)]
    public async Task A_bad_address_is_a_validation_problem(string? url)
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/posts/link/read", new { url });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(LinkAddress.Error, Body(await response.Content.ReadAsStringAsync()).GetProperty("errors").GetProperty("url")[0].GetString());
    }

    [Fact]
    public async Task The_reader_answers_what_it_read_through_the_named_client()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<head><title>Page</title></head>", Encoding.UTF8, "text/html"),
        });
        await using var factory = new ApiFactory();
        var client = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.Configure<HttpClientFactoryOptions>(LinkReader.ClientName, options =>
                options.HttpMessageHandlerBuilderActions.Add(b => b.PrimaryHandler = handler)))).CreateClient();

        var response = await client.PostAsJsonAsync("/api/posts/link/read", new { url = "https://example.com/a" });

        var read = Body(await response.Content.ReadAsStringAsync());
        Assert.Equal("Page", read.GetProperty("title").GetString());
        Assert.Equal("page", read.GetProperty("source").GetString());
        Assert.Equal(JsonValueKind.Null, read.GetProperty("error").ValueKind);
    }

    [Fact]
    public async Task A_failed_read_is_a_normal_answer_with_an_error()
    {
        await using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsJsonAsync("/api/posts/link/read", new { url = "https://example.com/a" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Bağlantı okunamadı. Alanları elle doldurabilirsin.", Body(await response.Content.ReadAsStringAsync()).GetProperty("error").GetString());
    }
}

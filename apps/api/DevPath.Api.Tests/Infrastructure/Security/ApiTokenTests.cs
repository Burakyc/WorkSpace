using System.Net;
using DevPath.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevPath.Api.Tests.Infrastructure.Security;

public class ApiTokenTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Valid_token_is_accepted()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Missing_header_returns_401_problem_details()
    {
        var response = await ClientWithToken(null).GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("test-token-0123456789abcdefghijklmnopqrstuX")]
    [InlineData("short")]
    public async Task Wrong_token_returns_401(string wrong)
    {
        var response = await ClientWithToken(wrong).GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Rejection_does_not_leak_the_token()
    {
        var response = await ClientWithToken("wrong").GetAsync("/api/health");

        Assert.DoesNotContain(ApiFactory.Token, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Without_token_setting_development_runs_without_check()
    {
        using var dev = WithoutTokenSetting("Development");
        var client = dev.CreateClient();
        client.DefaultRequestHeaders.Remove(ApiTokenMiddleware.HeaderName);

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public void Without_token_setting_production_refuses_to_start()
    {
        using var production = WithoutTokenSetting("Production");

        var ex = Assert.ThrowsAny<Exception>(() => production.CreateClient());

        Assert.Contains("DEVPATH_TOKEN", ex.ToString());
    }

    private HttpClient ClientWithToken(string? value)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(ApiTokenMiddleware.HeaderName);
        if (value is not null)
        {
            client.DefaultRequestHeaders.Add(ApiTokenMiddleware.HeaderName, value);
        }
        return client;
    }

    private static WebApplicationFactory<Program> WithoutTokenSetting(string environment) =>
        new ApiFactory().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("DEVPATH_TOKEN", "");
        });
}

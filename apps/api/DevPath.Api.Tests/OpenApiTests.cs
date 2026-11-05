using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevPath.Api.Tests;

public class OpenApiTests
{
    [Fact]
    public async Task Document_is_served_in_development()
    {
        using var factory = CreateFactory("Development");

        var response = await factory.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("/api/health", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Document_is_not_served_in_production()
    {
        using var factory = CreateFactory("Production");

        var response = await factory.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory(string environment) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment(environment));
}

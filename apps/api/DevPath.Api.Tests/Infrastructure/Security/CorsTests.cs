using System.Net;
using DevPath.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevPath.Api.Tests.Infrastructure.Security;

public class CorsTests
{
    private const string DevServer = "http://localhost:5173";

    [Fact]
    public async Task Preflight_from_allowed_origin_passes_without_token()
    {
        using var factory = WithOrigin(DevServer);

        var response = await Preflight(factory, DevServer);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(DevServer, AllowOrigin(response));
        Assert.Contains(
            ApiTokenMiddleware.HeaderName,
            string.Join(",", response.Headers.GetValues("Access-Control-Allow-Headers")),
            StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Null_origin_of_file_pages_can_be_allowed()
    {
        using var factory = WithOrigin("null");

        var response = await Preflight(factory, "null");

        Assert.Equal("null", AllowOrigin(response));
    }

    [Fact]
    public async Task Other_origin_gets_no_cors_headers()
    {
        using var factory = WithOrigin(DevServer);

        var response = await Preflight(factory, "https://evil.example");

        Assert.Null(AllowOrigin(response));
    }

    [Fact]
    public async Task Without_origin_setting_no_origin_is_allowed()
    {
        using var factory = new ApiFactory();

        var response = await Preflight(factory, DevServer);

        Assert.Null(AllowOrigin(response));
    }

    private static WebApplicationFactory<Program> WithOrigin(string origin) =>
        new ApiFactory().WithWebHostBuilder(builder => builder.UseSetting("DEVPATH_ORIGIN", origin));

    private static Task<HttpResponseMessage> Preflight(WebApplicationFactory<Program> factory, string origin)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(ApiTokenMiddleware.HeaderName);

        var request = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "x-devpath-token");
        return client.SendAsync(request);
    }

    private static string? AllowOrigin(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values) ? values.Single() : null;
}

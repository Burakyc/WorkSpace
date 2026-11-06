using System.Net;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.System;

public class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Get_returns_ok_json()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Get_returns_status_and_version_in_camel_case()
    {
        var json = await factory.CreateClient().GetStringAsync("/api/health");
        var root = JsonDocument.Parse(json).RootElement;

        Assert.Equal("ok", root.GetProperty("status").GetString());
        Assert.Equal("0.1.0", root.GetProperty("version").GetString());
    }

    [Fact]
    public async Task Version_has_no_source_revision_suffix()
    {
        var json = await factory.CreateClient().GetStringAsync("/api/health");
        var version = JsonDocument.Parse(json).RootElement.GetProperty("version").GetString();

        Assert.DoesNotContain("+", version);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Infrastructure.Security;
using DevPath.Api.Modules.Opportunities;

namespace DevPath.Api.Tests.Modules.Opportunities;

public class OpportunityEndpointTests
{
    private static async Task<JsonElement> Sites(HttpClient client) =>
        JsonDocument.Parse(await client.GetStringAsync("/api/opportunities/sites")).RootElement;

    [Fact]
    public async Task Sites_round_trip()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        Assert.Equal(4, (await Sites(client)).GetArrayLength());

        var added = await client.PostAsJsonAsync("/api/opportunities/sites", new { name = "", url = "kariyer.net" });
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var site = JsonDocument.Parse(await added.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("kariyer.net", site.GetProperty("id").GetString());
        Assert.Equal("https://kariyer.net/", site.GetProperty("url").GetString());
        Assert.Equal(5, (await Sites(client)).GetArrayLength());

        var bad = await client.PostAsJsonAsync("/api/opportunities/sites", new { name = "", url = "http://example.com" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        var errors = JsonDocument.Parse(await bad.Content.ReadAsStringAsync()).RootElement.GetProperty("errors");
        Assert.Equal(OpportunitySiteUrl.HttpsError, errors.GetProperty("url")[0].GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/opportunities/sites/kariyer.net")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync("/api/opportunities/sites/kariyer.net")).StatusCode);
        Assert.Equal(4, (await Sites(client)).GetArrayLength());
    }

    [Fact]
    public async Task Sites_need_the_token()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Remove(ApiTokenMiddleware.HeaderName);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/opportunities/sites")).StatusCode);
    }
}

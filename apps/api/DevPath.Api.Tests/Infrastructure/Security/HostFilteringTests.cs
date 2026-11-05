using System.Net;

namespace DevPath.Api.Tests.Infrastructure.Security;

public class HostFilteringTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Loopback_ip_host_is_accepted()
    {
        var response = await factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("http://evil.example/api/health")]
    [InlineData("http://localhost/api/health")]
    public async Task Other_hosts_are_rejected(string url)
    {
        var response = await factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

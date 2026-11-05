using DevPath.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DevPath.Api.Tests;

/// <summary>Test host whose clients call the API the way Electron does: on 127.0.0.1 with the token header.</summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string Token = "test-token-0123456789abcdefghijklmnopqrstuv";

    public ApiFactory()
    {
        ClientOptions.BaseAddress = new Uri("http://127.0.0.1");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("DEVPATH_TOKEN", Token);
    }

    protected override void ConfigureClient(HttpClient client)
    {
        client.DefaultRequestHeaders.Add(ApiTokenMiddleware.HeaderName, Token);
    }
}

using DevPath.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;

namespace DevPath.Api.Tests;

/// <summary>
/// Test host whose clients call the API the way Electron does: on 127.0.0.1 with the token header,
/// with a temp data folder so tests never touch %APPDATA%, and with outgoing HTTP refused.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string Token = "test-token-0123456789abcdefghijklmnopqrstuv";

    public ApiFactory()
    {
        ClientOptions.BaseAddress = new Uri("http://127.0.0.1");
    }

    public string DataDir { get; } = Path.Combine(Path.GetTempPath(), "devpath-tests", Guid.NewGuid().ToString("N"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("DEVPATH_TOKEN", Token);
        builder.UseSetting("DEVPATH_DATA_DIR", DataDir);
        // Every named HttpClient fails unless a test installs a stub after this (ConfigureTestServices).
        builder.ConfigureServices(services => services.ConfigureAll<HttpClientFactoryOptions>(options =>
            options.HttpMessageHandlerBuilderActions.Add(handler => handler.PrimaryHandler = new NoNetworkHandler())));
    }

    protected override void ConfigureClient(HttpClient client)
    {
        client.DefaultRequestHeaders.Add(ApiTokenMiddleware.HeaderName, Token);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        if (Directory.Exists(DataDir))
        {
            Directory.Delete(DataDir, recursive: true);
        }
        GC.SuppressFinalize(this);
    }
}

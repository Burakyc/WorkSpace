using Microsoft.AspNetCore.Mvc.Testing;

namespace DevPath.Api.Tests;

/// <summary>Test host whose clients call the API the way Electron does: on 127.0.0.1.</summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory()
    {
        ClientOptions.BaseAddress = new Uri("http://127.0.0.1");
    }
}

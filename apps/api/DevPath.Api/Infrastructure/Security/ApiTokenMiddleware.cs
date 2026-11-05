using System.Security.Cryptography;
using System.Text;

namespace DevPath.Api.Infrastructure.Security;

/// <summary>Rejects every request that does not carry the per-launch token Electron passed in DEVPATH_TOKEN.</summary>
public sealed class ApiTokenMiddleware(RequestDelegate next, string token)
{
    public const string HeaderName = "X-DevPath-Token";

    private readonly byte[] _expected = Encoding.UTF8.GetBytes(token);

    public async Task InvokeAsync(HttpContext context)
    {
        var actual = Encoding.UTF8.GetBytes(context.Request.Headers[HeaderName].ToString());

        if (!CryptographicOperations.FixedTimeEquals(actual, _expected))
        {
            await Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Missing or invalid API token.")
                .ExecuteAsync(context);
            return;
        }

        await next(context);
    }
}

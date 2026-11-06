using DevPath.Api.Infrastructure.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.Logging;

namespace DevPath.Api.Tests.Infrastructure.Diagnostics;

public sealed class ErrorBufferTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 7, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Keeps_only_the_last_50_newest_first()
    {
        var buffer = new ErrorBuffer();
        for (var i = 0; i < 60; i++)
        {
            buffer.Add(new ErrorEntry(Start.AddSeconds(i), "S", $"K{i}", null));
        }

        var recent = buffer.Recent();

        Assert.Equal(50, recent.Count);
        Assert.Equal("K59", recent[0].Kind);
        Assert.Equal("K10", recent[^1].Kind);
    }

    [Fact]
    public async Task Records_errors_with_the_throwing_type_and_no_message()
    {
        var (buffer, logger, _) = Setup();
        try
        {
            await NoteLikeService.FailAsync();
        }
        catch (InvalidOperationException ex)
        {
            logger.LogError(ex, "Could not save {Title}", "Secret note title");
        }
        logger.LogWarning("Only a warning");
        logger.LogCritical("No exception");

        var recent = buffer.Recent();
        Assert.Equal(2, recent.Count);
        Assert.Equal(new ErrorEntry(Start, "Logger", "Log", null), recent[0]);
        Assert.Equal(new ErrorEntry(Start, nameof(NoteLikeService), nameof(InvalidOperationException), null), recent[1]);
    }

    [Fact]
    public void Records_the_route_template_not_the_path()
    {
        var (buffer, logger, http) = Setup();
        var context = new DefaultHttpContext();
        context.Request.Method = "PUT";
        context.Request.Path = "/api/notes/0f8f6d3e-1111-2222-3333-444455556666/content";
        context.SetEndpoint(new RouteEndpoint(_ => Task.CompletedTask, RoutePatternFactory.Parse("api/notes/{id}/content"), 0, null, null));
        http.HttpContext = context;

        logger.LogError("Failed");

        Assert.Equal("PUT api/notes/{id}/content", buffer.Recent()[0].Path);
    }

    private static (ErrorBuffer, ILogger, HttpContextAccessor) Setup()
    {
        var buffer = new ErrorBuffer();
        var http = new HttpContextAccessor();
        var provider = new ErrorBufferLoggerProvider(buffer, http, new FixedTimeProvider(Start));
        return (buffer, provider.CreateLogger("DevPath.Api.Tests.Logger"), http);
    }

    private static class NoteLikeService
    {
        public static async Task FailAsync()
        {
            await Task.Yield();
            throw new InvalidOperationException("Secret note title");
        }
    }
}

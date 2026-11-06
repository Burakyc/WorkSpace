using System.Diagnostics;
using Microsoft.AspNetCore.Routing;

namespace DevPath.Api.Infrastructure.Diagnostics;

/// <summary>Copies every Error/Critical log entry into the <see cref="ErrorBuffer"/>: source, kind and route only.</summary>
public sealed class ErrorBufferLoggerProvider(ErrorBuffer buffer, IHttpContextAccessor http, TimeProvider time) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new ErrorLogger(this, categoryName);

    public void Dispose()
    {
    }

    private void Record(string category, Exception? exception)
    {
        var source = exception is null ? null : ThrowingType(exception);
        buffer.Add(new ErrorEntry(
            time.GetUtcNow(),
            source ?? category[(category.LastIndexOf('.') + 1)..],
            exception?.GetType().Name ?? "Log",
            CurrentRoute()));
    }

    /// <summary>The first DevPath type on the stack (outside compiler-generated state machines), or null.</summary>
    private static string? ThrowingType(Exception exception)
    {
        foreach (var frame in new StackTrace(exception).GetFrames())
        {
            var type = frame.GetMethod()?.DeclaringType;
            while (type is { DeclaringType: not null } && type.Name.StartsWith('<'))
            {
                type = type.DeclaringType;
            }
            if (type?.Namespace?.StartsWith("DevPath.", StringComparison.Ordinal) == true)
            {
                return type.Name;
            }
        }
        return null;
    }

    /// <summary>"METHOD template" of the matched route, so ids and queries are never kept.</summary>
    private string? CurrentRoute()
    {
        var context = http.HttpContext;
        return context?.GetEndpoint() is RouteEndpoint { RoutePattern.RawText: { } template }
            ? $"{context.Request.Method} {template}"
            : null;
    }

    private sealed class ErrorLogger(ErrorBufferLoggerProvider provider, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (IsEnabled(logLevel))
            {
                provider.Record(category, exception);
            }
        }
    }
}

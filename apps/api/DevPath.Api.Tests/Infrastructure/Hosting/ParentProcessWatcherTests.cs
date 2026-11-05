using System.Diagnostics;
using DevPath.Api.Infrastructure.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevPath.Api.Tests.Infrastructure.Hosting;

public class ParentProcessWatcherTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task Stops_the_app_when_the_parent_exits()
    {
        using var parent = Process.Start(new ProcessStartInfo("cmd.exe", "/c ping -n 2 127.0.0.1 >nul")
        {
            CreateNoWindow = true,
            UseShellExecute = false,
        })!;
        var lifetime = new FakeLifetime();
        using var watcher = CreateWatcher(parent.Id.ToString(), lifetime);

        await watcher.StartAsync(CancellationToken.None);

        Assert.False(lifetime.Stopped.Task.IsCompleted);
        await lifetime.Stopped.Task.WaitAsync(Timeout);
        Assert.True(parent.HasExited);
    }

    [Fact]
    public async Task Stops_at_once_when_the_parent_is_not_running()
    {
        var lifetime = new FakeLifetime();
        using var watcher = CreateWatcher(int.MaxValue.ToString(), lifetime);

        await watcher.StartAsync(CancellationToken.None);

        await lifetime.Stopped.Task.WaitAsync(Timeout);
    }

    [Fact]
    public async Task Does_nothing_without_the_setting()
    {
        var lifetime = new FakeLifetime();
        using var watcher = CreateWatcher(null, lifetime);

        await watcher.StartAsync(CancellationToken.None);
        await (watcher.ExecuteTask ?? Task.CompletedTask).WaitAsync(Timeout);

        Assert.False(lifetime.Stopped.Task.IsCompleted);
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("0")]
    [InlineData("-5")]
    public void Invalid_setting_stops_api_startup(string value)
    {
        using var factory = new ApiFactory().WithWebHostBuilder(builder => builder.UseSetting("DEVPATH_PARENT_PID", value));

        var ex = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("DEVPATH_PARENT_PID", ex.ToString());
    }

    private static ParentProcessWatcher CreateWatcher(string? pid, IHostApplicationLifetime lifetime)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["DEVPATH_PARENT_PID"] = pid })
            .Build();
        return new ParentProcessWatcher(configuration, lifetime, NullLogger<ParentProcessWatcher>.Instance);
    }

    private sealed class FakeLifetime : IHostApplicationLifetime
    {
        public TaskCompletionSource Stopped { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public CancellationToken ApplicationStarted => CancellationToken.None;

        public CancellationToken ApplicationStopping => CancellationToken.None;

        public CancellationToken ApplicationStopped => CancellationToken.None;

        public void StopApplication() => Stopped.TrySetResult();
    }
}

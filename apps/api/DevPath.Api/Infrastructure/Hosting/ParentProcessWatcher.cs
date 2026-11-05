using System.Diagnostics;
using System.Globalization;

namespace DevPath.Api.Infrastructure.Hosting;

/// <summary>Stops the API when the process in DEVPATH_PARENT_PID (Electron) exits, so a crash leaves no orphan.</summary>
public sealed class ParentProcessWatcher(
    IConfiguration configuration,
    IHostApplicationLifetime lifetime,
    ILogger<ParentProcessWatcher> logger) : BackgroundService
{
    private int? _parentPid;

    public override Task StartAsync(CancellationToken cancellationToken)
    {
        _parentPid = ParsePid(configuration["DEVPATH_PARENT_PID"]);
        return base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_parentPid is not { } pid)
        {
            return;
        }

        try
        {
            using var parent = Process.GetProcessById(pid);
            await parent.WaitForExitAsync(stoppingToken);
        }
        catch (ArgumentException)
        {
            // Not running any more.
        }
        catch (OperationCanceledException)
        {
            return;
        }

        logger.LogInformation("Parent process {Pid} exited. Stopping the API.", pid);
        lifetime.StopApplication();
    }

    public static int? ParsePid(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var pid) && pid > 0)
        {
            return pid;
        }

        throw new ArgumentException($"DEVPATH_PARENT_PID must be a positive whole number, but was '{value}'.", nameof(value));
    }
}

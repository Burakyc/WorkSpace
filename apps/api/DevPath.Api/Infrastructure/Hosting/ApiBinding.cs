using System.Net;

namespace DevPath.Api.Infrastructure.Hosting;

/// <summary>
/// The address Kestrel listens on: 127.0.0.1, except inside the Docker container (DEVPATH_IN_CONTAINER=1),
/// where Docker's port mapping needs 0.0.0.0. The container's port is still published on 127.0.0.1 only.
/// </summary>
public static class ApiBinding
{
    public static IPAddress Resolve(string? inContainer) =>
        inContainer == "1" ? IPAddress.Any : IPAddress.Loopback;
}

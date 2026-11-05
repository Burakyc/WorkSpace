using System.Reflection;

namespace DevPath.Api.Modules.System;

public static class AppInfo
{
    public static string Version { get; } =
        typeof(AppInfo).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? "unknown";
}

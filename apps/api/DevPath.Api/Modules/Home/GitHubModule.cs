namespace DevPath.Api.Modules.Home;

/// <summary>
/// GitHub stats: the named HTTP client (header values redacted in its logs, so the token never reaches a log), the service,
/// and the background refresh of the home data (YouTube and GitHub).
/// </summary>
public static class GitHubModule
{
    public static IServiceCollection AddGitHub(this IServiceCollection services)
    {
        services.AddHttpClient(GitHubClient.ClientName, client => client.Timeout = TimeSpan.FromSeconds(10))
            .RedactLoggedHeaders(_ => true);
        services.AddSingleton<GitHubClient>();
        services.AddSingleton<GitHubService>();
        services.AddSingleton<VisitService>();
        services.AddHostedService<HomeRefresher>();
        return services;
    }
}

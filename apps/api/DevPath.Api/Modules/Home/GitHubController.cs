using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Home;

[ApiController]
[Route("api/github")]
public sealed class GitHubController(GitHubService github) : ControllerBase
{
    [HttpGet("settings")]
    public Task<GitHubSettings> GetSettings(CancellationToken cancellationToken) => github.GetSettingsAsync(cancellationToken);

    [HttpPut("settings")]
    public Task<GitHubStatus> SaveSettings(GitHubSettingsInput input, CancellationToken cancellationToken) =>
        github.SaveSettingsAsync(input, cancellationToken);

    [HttpGet("stats")]
    public Task<GitHubStatus> GetStats(CancellationToken cancellationToken) => github.GetStatusAsync(cancellationToken);

    [HttpPost("refresh")]
    public Task<GitHubStatus> Refresh(CancellationToken cancellationToken) => github.RefreshAsync(cancellationToken);
}

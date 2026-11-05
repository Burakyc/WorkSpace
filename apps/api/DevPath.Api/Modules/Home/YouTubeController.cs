using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Home;

[ApiController]
[Route("api/youtube")]
public sealed class YouTubeController(YouTubeService youTube) : ControllerBase
{
    [HttpGet("channels")]
    public Task<IReadOnlyList<YouTubeChannel>> ListChannels(CancellationToken cancellationToken) =>
        youTube.ListChannelsAsync(cancellationToken);

    [HttpPost("channels")]
    public async Task<ActionResult<YouTubeChannel>> AddChannel(YouTubeChannelInput input, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await youTube.AddChannelAsync(input, cancellationToken));

    [HttpDelete("channels/{id}")]
    public async Task<IActionResult> RemoveChannel(string id, CancellationToken cancellationToken) =>
        await youTube.RemoveChannelAsync(id, cancellationToken) ? NoContent() : NotFound();

    [HttpGet("videos")]
    public Task<YouTubeVideos> GetVideos(CancellationToken cancellationToken) => youTube.GetVideosAsync(cancellationToken);

    [HttpPost("refresh")]
    public Task<YouTubeVideos> Refresh(CancellationToken cancellationToken) => youTube.RefreshAsync(cancellationToken);
}

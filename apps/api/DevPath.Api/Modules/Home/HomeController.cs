using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Home;

[ApiController]
[Route("api/home")]
public sealed class HomeController(FeedService feed) : ControllerBase
{
    [HttpGet("feed")]
    public Task<FeedResponse> GetFeed(CancellationToken cancellationToken) => feed.GetAsync(cancellationToken);
}

using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Home;

[ApiController]
[Route("api/home")]
public sealed class HomeController(FeedService feed, VisitService visits) : ControllerBase
{
    [HttpGet("feed")]
    public Task<FeedResponse> GetFeed(CancellationToken cancellationToken) => feed.GetAsync(cancellationToken);

    /// <summary>Records a visit of Ana Sayfa and answers what changed since the previous app session.</summary>
    [HttpPost("visit")]
    public Task<VisitChanges> RecordVisit([FromQuery] string? timeZone, CancellationToken cancellationToken) =>
        visits.RecordAsync(timeZone, cancellationToken);
}

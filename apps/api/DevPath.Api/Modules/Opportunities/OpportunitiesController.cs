using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Opportunities;

[ApiController]
[Route("api/opportunities")]
public sealed class OpportunitiesController(OpportunityService opportunities) : ControllerBase
{
    [HttpGet("sites")]
    public Task<IReadOnlyList<OpportunitySite>> ListSites(CancellationToken cancellationToken) =>
        opportunities.ListSitesAsync(cancellationToken);

    [HttpPost("sites")]
    public async Task<ActionResult<OpportunitySite>> AddSite(OpportunitySiteInput input, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await opportunities.AddSiteAsync(input, cancellationToken));

    [HttpDelete("sites/{id}")]
    public async Task<IActionResult> RemoveSite(string id, CancellationToken cancellationToken) =>
        await opportunities.RemoveSiteAsync(id, cancellationToken) ? NoContent() : NotFound();
}

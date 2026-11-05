using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.System;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthResponse> Get() => Ok(new HealthResponse("ok", AppInfo.Version));
}

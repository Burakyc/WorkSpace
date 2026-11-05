using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Pomodoro;

[ApiController]
[Route("api/sessions")]
public sealed class SessionsController(SessionService sessions) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<Session>> Create(SessionInput input, CancellationToken cancellationToken)
    {
        var session = await sessions.CreateAsync(input, cancellationToken);
        return Created($"/api/sessions/{Uri.EscapeDataString(session.Id)}", session);
    }
}

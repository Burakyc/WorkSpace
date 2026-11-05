using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Calendar;

[ApiController]
[Route("api/calendar")]
public sealed class CalendarController(CalendarService calendar) : ControllerBase
{
    [HttpGet]
    public Task<CalendarMonth> Get([FromQuery] string? month, [FromQuery] string? timeZone, CancellationToken cancellationToken) =>
        calendar.GetMonthAsync(month, timeZone, cancellationToken);
}

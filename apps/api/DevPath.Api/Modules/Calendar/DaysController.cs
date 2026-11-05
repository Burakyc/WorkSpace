using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Calendar;

[ApiController]
[Route("api/days/{date}")]
public sealed class DaysController(DayService days) : ControllerBase
{
    [HttpGet]
    public Task<DayDetail> Get(string date, [FromQuery] string? timeZone, CancellationToken cancellationToken) =>
        days.GetAsync(date, timeZone, cancellationToken);

    [HttpPut("log")]
    public Task<DayLog> SaveLog(string date, DayLogInput input, CancellationToken cancellationToken) =>
        days.SaveLogAsync(date, input, cancellationToken);
}

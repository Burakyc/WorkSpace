using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Settings;

[ApiController]
[Route("api/settings")]
public sealed class SettingsController(SettingsService settings) : ControllerBase
{
    [HttpGet]
    public Task<AppSettings> Get(CancellationToken cancellationToken) => settings.GetAsync(cancellationToken);

    [HttpPut("pomodoro")]
    public Task<PomodoroSettings> SavePomodoro(PomodoroSettingsInput input, CancellationToken cancellationToken) =>
        settings.SavePomodoroAsync(input, cancellationToken);
}

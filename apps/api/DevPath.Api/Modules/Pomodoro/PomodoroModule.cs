using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Pomodoro;

/// <summary>Storage and services of the Pomodoro module. A missing sessions.json means no sessions.</summary>
public static class PomodoroModule
{
    public const string SessionsFileName = "sessions.json";

    public static readonly DocumentSchema SessionsSchema = new(1, []);

    public static IServiceCollection AddPomodoro(this IServiceCollection services)
    {
        services.AddSingleton<IRepository<Session>>(provider =>
            new JsonRepository<Session>(provider.GetRequiredService<JsonFileStore>(), SessionsFileName, SessionsSchema));
        services.AddSingleton<SessionService>();
        return services;
    }
}

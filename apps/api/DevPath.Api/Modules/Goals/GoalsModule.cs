using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Goals;

/// <summary>Storage and services of the Goals module.</summary>
public static class GoalsModule
{
    public const string FileName = "goals.json";

    public static readonly DocumentSchema Schema = new(1, []);

    public static IServiceCollection AddGoals(this IServiceCollection services)
    {
        services.AddSingleton<IRepository<Goal>>(provider =>
            new JsonRepository<Goal>(provider.GetRequiredService<JsonFileStore>(), FileName, Schema));
        services.AddSingleton<GoalService>();
        return services;
    }
}

using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Projects;

/// <summary>Storage and services of the Projects module.</summary>
public static class ProjectsModule
{
    public const string FileName = "projects.json";

    public static readonly DocumentSchema Schema = new(1, []);

    public static IServiceCollection AddProjects(this IServiceCollection services)
    {
        services.AddSingleton<IRepository<Project>>(provider =>
            new JsonRepository<Project>(provider.GetRequiredService<JsonFileStore>(), FileName, Schema));
        services.AddSingleton<ProjectService>();
        return services;
    }
}

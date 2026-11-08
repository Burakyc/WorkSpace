using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Posts;

/// <summary>Storage and services of the post assistant.</summary>
public static class PostsModule
{
    public const string StyleFileName = "style.json";

    public static readonly DocumentSchema StyleSchema = new(1, []);

    public static IServiceCollection AddPosts(this IServiceCollection services)
    {
        services.AddSingleton<StyleService>();
        return services;
    }
}

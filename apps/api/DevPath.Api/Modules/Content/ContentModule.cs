using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Content;

/// <summary>Storage and services of the content modules: one file per topic in content/&lt;module folder&gt;/&lt;slug&gt;.json.</summary>
public static class ContentModule
{
    public static readonly DocumentSchema TopicSchema = new(1, []);

    public static string TopicPath(ContentType type, string slug) => $"content/{type.Folder}/{slug}.json";

    public static IServiceCollection AddContent(this IServiceCollection services)
    {
        services.AddSingleton<ImportService>();
        services.AddSingleton<ContentService>();
        services.AddSingleton<InboxService>();
        return services;
    }
}

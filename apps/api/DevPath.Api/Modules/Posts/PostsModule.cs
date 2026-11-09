using System.Net;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Modules.System;

namespace DevPath.Api.Modules.Posts;

/// <summary>Storage and services of the post assistant.</summary>
public static class PostsModule
{
    public const string StyleFileName = "style.json";

    public static readonly DocumentSchema StyleSchema = new(1, []);

    public const string DraftsFileName = "posts.json";

    public static readonly DocumentSchema DraftsSchema = new(1, []);

    public static IServiceCollection AddPosts(this IServiceCollection services)
    {
        services.AddSingleton<StyleService>();
        services.AddSingleton<IRepository<PostDraft>>(provider =>
            new JsonRepository<PostDraft>(provider.GetRequiredService<JsonFileStore>(), DraftsFileName, DraftsSchema));
        services.AddSingleton<PostDraftService>();
        services.AddSingleton<PostContextService>();
        services.AddSingleton<LinkReader>();
        services.AddHttpClient(LinkReader.ClientName, client =>
        {
            client.Timeout = LinkReader.Timeout;
            client.DefaultRequestHeaders.UserAgent.ParseAdd($"DevPath/{AppInfo.Version}");
        }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseCookies = false,
            UseProxy = false,
            AutomaticDecompression = DecompressionMethods.All,
            ConnectCallback = LinkReader.ConnectPublicAsync,
        });
        return services;
    }
}

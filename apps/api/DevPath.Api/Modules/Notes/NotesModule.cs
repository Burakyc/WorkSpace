using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Notes;

/// <summary>Storage and services of the Notes module: the tree in notes/index.json, one file per page in notes/pages/.</summary>
public static class NotesModule
{
    public const string IndexFileName = "notes/index.json";

    public static readonly DocumentSchema IndexSchema = new(1, []);

    public static readonly DocumentSchema PageSchema = new(1, []);

    public static string PagePath(string id) => $"notes/pages/{id}.json";

    public static IServiceCollection AddNotes(this IServiceCollection services)
    {
        services.AddSingleton<IRepository<NoteNode>>(provider =>
            new JsonRepository<NoteNode>(provider.GetRequiredService<JsonFileStore>(), IndexFileName, IndexSchema));
        services.AddSingleton<NoteService>();
        services.AddSingleton<NoteSearchService>();
        return services;
    }
}

using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevPath.Api.Infrastructure.Storage;

/// <summary>Stores entities in one file shaped <c>{ "schemaVersion": n, "items": [ ... ] }</c>.</summary>
public sealed class JsonRepository<T>(JsonFileStore store, string path, DocumentSchema schema) : IRepository<T>
    where T : IEntity
{
    private const string ItemsProperty = "items";

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken) =>
        ReadItems(await store.ReadAsync(path, schema, cancellationToken));

    public async Task<T?> GetAsync(string id, CancellationToken cancellationToken) =>
        (await GetAllAsync(cancellationToken)).FirstOrDefault(item => item.Id == id);

    public Task UpsertAsync(T entity, CancellationToken cancellationToken) =>
        store.UpdateAsync(path, schema, document =>
        {
            var items = ReadItems(document);
            var index = items.FindIndex(item => item.Id == entity.Id);
            if (index >= 0)
            {
                items[index] = entity;
            }
            else
            {
                items.Add(entity);
            }

            return WriteItems(document, items);
        }, cancellationToken);

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var deleted = false;
        await store.UpdateAsync(path, schema, document =>
        {
            var items = ReadItems(document);
            deleted = items.RemoveAll(item => item.Id == id) > 0;
            return deleted ? WriteItems(document, items) : null;
        }, cancellationToken);
        return deleted;
    }

    private static List<T> ReadItems(JsonObject? document) =>
        document?[ItemsProperty]?.Deserialize<List<T>>(StorageJson.Options) ?? [];

    private static JsonObject WriteItems(JsonObject? document, List<T> items)
    {
        document ??= new JsonObject();
        document[ItemsProperty] = JsonSerializer.SerializeToNode(items, StorageJson.Options);
        return document;
    }
}

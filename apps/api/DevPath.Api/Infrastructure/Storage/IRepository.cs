namespace DevPath.Api.Infrastructure.Storage;

/// <summary>
/// A list of entities. JSON files are the only implementation; the interface exists because SQLite is the
/// likely next store (README), and it is the one documented exception to "no abstraction without a second use".
/// </summary>
public interface IRepository<T> where T : IEntity
{
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken);

    Task<T?> GetAsync(string id, CancellationToken cancellationToken);

    /// <summary>Replaces the entity with the same id in place, or appends it.</summary>
    Task UpsertAsync(T entity, CancellationToken cancellationToken);

    /// <summary>Returns false when no entity has this id.</summary>
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
}

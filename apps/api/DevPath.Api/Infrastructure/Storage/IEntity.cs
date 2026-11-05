namespace DevPath.Api.Infrastructure.Storage;

/// <summary>Anything stored in a repository: identified by a GUID string.</summary>
public interface IEntity
{
    string Id { get; }
}

using DevPath.Api.Infrastructure.Storage;

namespace DevPath.Api.Modules.Projects;

/// <summary>A piece of work under one goal (e.g. "Todo API" under "Learn ASP.NET Core"). Its goal never changes.</summary>
public sealed record Project(
    string Id,
    string GoalId,
    string Title,
    string? Url,
    bool Archived,
    DateTimeOffset CreatedAt) : IEntity;

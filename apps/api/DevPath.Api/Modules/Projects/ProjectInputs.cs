namespace DevPath.Api.Modules.Projects;

/// <summary>What a client sends to create a project.</summary>
public sealed record ProjectCreateInput(string? GoalId, string? Title, string? Url);

/// <summary>What a client may change on a project. There is no goal id: a project never moves.</summary>
public sealed record ProjectUpdateInput(string? Title, string? Url);

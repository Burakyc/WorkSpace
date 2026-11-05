using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;

namespace DevPath.Api.Modules.Projects;

public sealed class ProjectService(IRepository<Project> projects, IRepository<Goal> goals, TimeProvider time)
{
    /// <summary>All projects in creation order; archived ones only with <paramref name="includeArchived"/>.</summary>
    public async Task<IReadOnlyList<Project>> ListAsync(bool includeArchived, CancellationToken cancellationToken)
    {
        var all = await projects.GetAllAsync(cancellationToken);
        return [.. all.Where(project => includeArchived || !project.Archived).OrderBy(project => project.CreatedAt)];
    }

    public async Task<Project> CreateAsync(ProjectCreateInput input, CancellationToken cancellationToken)
    {
        var errors = ProjectValidator.ValidateFields(input.Title, input.Url);
        var goalError = await CheckGoalAsync(input.GoalId, cancellationToken);
        if (goalError is not null)
        {
            errors["goalId"] = [goalError];
        }
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var project = new Project(
            Guid.NewGuid().ToString(),
            input.GoalId!,
            input.Title!.Trim(),
            CleanUrl(input.Url),
            Archived: false,
            time.GetUtcNow());
        await projects.UpsertAsync(project, cancellationToken);
        return project;
    }

    /// <summary>Changes title and url only. Returns null when no project has this id.</summary>
    public async Task<Project?> UpdateAsync(string id, ProjectUpdateInput input, CancellationToken cancellationToken)
    {
        var errors = ProjectValidator.ValidateFields(input.Title, input.Url);
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var existing = await projects.GetAsync(id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        var updated = existing with { Title = input.Title!.Trim(), Url = CleanUrl(input.Url) };
        await projects.UpsertAsync(updated, cancellationToken);
        return updated;
    }

    /// <summary>Archives or restores a project. Returns null when no project has this id; does not write when nothing changes.</summary>
    public async Task<Project?> SetArchivedAsync(string id, bool archived, CancellationToken cancellationToken)
    {
        var existing = await projects.GetAsync(id, cancellationToken);
        if (existing is null || existing.Archived == archived)
        {
            return existing;
        }

        var updated = existing with { Archived = archived };
        await projects.UpsertAsync(updated, cancellationToken);
        return updated;
    }

    private async Task<string?> CheckGoalAsync(string? goalId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(goalId))
        {
            return "Hedef gerekli.";
        }

        var goal = await goals.GetAsync(goalId, cancellationToken);
        return goal switch
        {
            null => "Hedef bulunamadı.",
            { Archived: true } => "Arşivlenmiş bir hedefe proje eklenemez.",
            _ => null,
        };
    }

    private static string? CleanUrl(string? url) => string.IsNullOrWhiteSpace(url) ? null : url.Trim();
}

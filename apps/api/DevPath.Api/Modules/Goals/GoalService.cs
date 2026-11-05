using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Modules.Goals;

public sealed class GoalService(IRepository<Goal> goals, IRepository<Session> sessions, TimeProvider time)
{
    /// <summary>Progress of every goal (archived included), in the order of <see cref="ListAsync"/> with archived goals.</summary>
    public async Task<IReadOnlyList<GoalProgress>> ListProgressAsync(CancellationToken cancellationToken)
    {
        var all = await ListAsync(includeArchived: true, cancellationToken);
        var allSessions = await sessions.GetAllAsync(cancellationToken);
        return [.. all.Select(goal => GoalProgress.Calculate(goal, allSessions))];
    }

    /// <summary>Active goals newest first; with <paramref name="includeArchived"/>, archived goals follow, newest first.</summary>
    public async Task<IReadOnlyList<Goal>> ListAsync(bool includeArchived, CancellationToken cancellationToken)
    {
        var all = await goals.GetAllAsync(cancellationToken);
        var active = all.Where(goal => !goal.Archived).OrderByDescending(goal => goal.CreatedAt);
        var archived = includeArchived
            ? all.Where(goal => goal.Archived).OrderByDescending(goal => goal.CreatedAt)
            : Enumerable.Empty<Goal>();
        return [.. active, .. archived];
    }

    public async Task<Goal> CreateAsync(GoalInput input, CancellationToken cancellationToken)
    {
        ThrowIfInvalid(input);
        var goal = new Goal(
            Guid.NewGuid().ToString(),
            input.Title!.Trim(),
            CleanDescription(input.Description),
            input.TargetPomodoros,
            Archived: false,
            time.GetUtcNow());
        await goals.UpsertAsync(goal, cancellationToken);
        return goal;
    }

    /// <summary>Returns null when no goal has this id.</summary>
    public async Task<Goal?> UpdateAsync(string id, GoalInput input, CancellationToken cancellationToken)
    {
        ThrowIfInvalid(input);
        var existing = await goals.GetAsync(id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        var updated = existing with
        {
            Title = input.Title!.Trim(),
            Description = CleanDescription(input.Description),
            TargetPomodoros = input.TargetPomodoros,
        };
        await goals.UpsertAsync(updated, cancellationToken);
        return updated;
    }

    /// <summary>Archives or restores a goal. Returns null when no goal has this id; does not write when nothing changes.</summary>
    public async Task<Goal?> SetArchivedAsync(string id, bool archived, CancellationToken cancellationToken)
    {
        var existing = await goals.GetAsync(id, cancellationToken);
        if (existing is null || existing.Archived == archived)
        {
            return existing;
        }

        var updated = existing with { Archived = archived };
        await goals.UpsertAsync(updated, cancellationToken);
        return updated;
    }

    private static void ThrowIfInvalid(GoalInput input)
    {
        var errors = GoalValidator.Validate(input);
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }
    }

    private static string? CleanDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();
}

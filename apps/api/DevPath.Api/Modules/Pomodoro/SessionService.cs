using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Projects;

namespace DevPath.Api.Modules.Pomodoro;

public sealed class SessionService(
    IRepository<Session> sessions,
    IRepository<Goal> goals,
    IRepository<Project> projects,
    TimeProvider time)
{
    public const int MaxDurationMinutes = 600;
    public const int NoteMaxLength = 500;

    /// <summary>The end time may be at most this far ahead of the server clock (clock differences, rounding).</summary>
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(1);

    public async Task<Session> CreateAsync(SessionInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        await CheckGoalAndProjectAsync(input, errors, cancellationToken);

        var timesValid = input.StartedAt is { } started &&
            input.EndedAt is { } ended &&
            ended >= started &&
            ended <= time.GetUtcNow() + FutureTolerance;
        if (!timesValid)
        {
            errors["endedAt"] = ["Başlangıç ve bitiş zamanı geçersiz."];
        }
        else
        {
            var spanMinutes = (int)Math.Ceiling((input.EndedAt!.Value - input.StartedAt!.Value).TotalMinutes);
            if (input.DurationMinutes is not { } minutes || minutes < 1 || minutes > MaxDurationMinutes || minutes > spanMinutes)
            {
                errors["durationMinutes"] = ["Süre geçersiz."];
            }
        }

        if (input.Completed is null)
        {
            errors["completed"] = ["Tamamlandı bilgisi gerekli."];
        }

        if ((input.Note?.Trim().Length ?? 0) > NoteMaxLength)
        {
            errors["note"] = [$"Not en fazla {NoteMaxLength} karakter olabilir."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var session = new Session(
            Guid.NewGuid().ToString(),
            input.GoalId!,
            string.IsNullOrWhiteSpace(input.ProjectId) ? null : input.ProjectId,
            [],
            input.StartedAt!.Value.ToUniversalTime(),
            input.EndedAt!.Value.ToUniversalTime(),
            input.DurationMinutes!.Value,
            input.Completed!.Value,
            string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim());
        await sessions.UpsertAsync(session, cancellationToken);
        return session;
    }

    private async Task CheckGoalAndProjectAsync(
        SessionInput input,
        Dictionary<string, string[]> errors,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.GoalId))
        {
            errors["goalId"] = ["Hedef gerekli."];
            return;
        }

        // An archived goal still exists: a session that ran while it was archived is kept.
        if (await goals.GetAsync(input.GoalId, cancellationToken) is null)
        {
            errors["goalId"] = ["Hedef bulunamadı."];
            return;
        }

        if (string.IsNullOrWhiteSpace(input.ProjectId))
        {
            return;
        }

        var project = await projects.GetAsync(input.ProjectId, cancellationToken);
        if (project is null)
        {
            errors["projectId"] = ["Proje bulunamadı."];
        }
        else if (project.GoalId != input.GoalId)
        {
            errors["projectId"] = ["Proje bu hedefe ait değil."];
        }
    }
}

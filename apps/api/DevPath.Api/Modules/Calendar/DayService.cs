using System.Globalization;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;

namespace DevPath.Api.Modules.Calendar;

public sealed record DaySession(
    string Id,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    int DurationMinutes,
    bool Completed,
    string GoalId,
    string? GoalTitle,
    string? ProjectId,
    string? ProjectTitle,
    IReadOnlyList<string> Tags,
    string? Note);

public sealed record DayGoal(string GoalId, string? Title, int CompletedSessions, int TotalMinutes);

/// <summary>A page created (<paramref name="Created"/>) or edited on the day.</summary>
public sealed record DayNote(string Id, string Title, bool Created);

public sealed record DayDetail(
    DateOnly Date,
    string TimeZone,
    int CompletedSessions,
    int TotalMinutes,
    IReadOnlyList<DaySession> Sessions,
    IReadOnlyList<DayGoal> Goals,
    IReadOnlyList<DayNote> Notes,
    string Log);

public sealed record DayLogInput(string? Text);

public sealed record DayLog(string Text);

/// <summary>
/// What happened on one local day: its sessions, the goals they belong to, the pages created or edited, and the free-text daily log
/// stored in daily/YYYY-MM-DD.json ({ "schemaVersion": 1, "date", "text" }).
/// </summary>
public sealed class DayService(
    IRepository<Session> sessions,
    IRepository<Goal> goals,
    IRepository<Project> projects,
    IRepository<NoteNode> notes,
    JsonFileStore store)
{
    public const int MaxLogLength = 10_000;
    public static readonly DocumentSchema LogSchema = new(1, []);

    public static string LogPath(DateOnly day) => $"daily/{day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}.json";

    public async Task<DayDetail> GetAsync(string? date, string? timeZone, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (!CalendarGrid.TryParseDate(date, out var day))
        {
            errors["date"] = [DateError];
        }

        var zone = CalendarService.FindZone(timeZone);
        if (zone is null)
        {
            errors["timeZone"] = ["Saat dilimi tanınmadı."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var goalTitles = (await goals.GetAllAsync(cancellationToken)).ToDictionary(g => g.Id, g => g.Title);
        var projectTitles = (await projects.GetAllAsync(cancellationToken)).ToDictionary(p => p.Id, p => p.Title);
        var ofDay = (await sessions.GetAllAsync(cancellationToken))
            .Where(s => CalendarService.LocalDate(s.StartedAt, zone!) == day)
            .OrderBy(s => s.StartedAt)
            .Select(s => new DaySession(
                s.Id, s.StartedAt, s.EndedAt, s.DurationMinutes, s.Completed,
                s.GoalId, goalTitles.GetValueOrDefault(s.GoalId),
                s.ProjectId, s.ProjectId is null ? null : projectTitles.GetValueOrDefault(s.ProjectId),
                s.Tags, s.Note))
            .ToList();

        var dayGoals = ofDay
            .GroupBy(s => s.GoalId)
            .Select(g => new DayGoal(
                g.Key,
                g.First().GoalTitle,
                g.Count(s => s.Completed),
                g.Where(s => s.Completed).Sum(s => s.DurationMinutes)))
            .OrderByDescending(g => g.CompletedSessions)
            .ThenBy(g => g.Title, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        var dayNotes = (await notes.GetAllAsync(cancellationToken))
            .Where(n => n.Kind == NoteNode.Page)
            .Select(n => (Node: n, Created: CalendarService.LocalDate(n.CreatedAt, zone!) == day))
            .Where(n => n.Created || CalendarService.LocalDate(n.Node.UpdatedAt, zone!) == day)
            .OrderBy(n => n.Node.UpdatedAt)
            .Select(n => new DayNote(n.Node.Id, n.Node.Title, n.Created))
            .ToList();

        return new DayDetail(
            day,
            timeZone!,
            dayGoals.Sum(g => g.CompletedSessions),
            dayGoals.Sum(g => g.TotalMinutes),
            ofDay,
            dayGoals,
            dayNotes,
            await ReadLogAsync(day, cancellationToken));
    }

    public async Task<DayLog> SaveLogAsync(string? date, DayLogInput input, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();
        if (!CalendarGrid.TryParseDate(date, out var day))
        {
            errors["date"] = [DateError];
        }

        var text = (input.Text ?? "").TrimEnd();
        if (text.Length > MaxLogLength)
        {
            errors["text"] = ["Günlük en fazla 10.000 karakter olabilir."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var document = new JsonObject { ["date"] = date, ["text"] = text };
        await store.WriteAsync(LogPath(day), LogSchema, document, cancellationToken);
        return new DayLog(text);
    }

    private async Task<string> ReadLogAsync(DateOnly day, CancellationToken cancellationToken)
    {
        var document = await store.ReadAsync(LogPath(day), LogSchema, cancellationToken);
        return document?["text"]?.GetValue<string>() ?? "";
    }

    private const string DateError = "Tarih YYYY-AA-GG biçiminde olmalı.";
}

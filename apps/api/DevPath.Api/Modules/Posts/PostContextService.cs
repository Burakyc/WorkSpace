using System.Globalization;
using System.Text;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Goals;
using DevPath.Api.Modules.Notes;
using DevPath.Api.Modules.Pomodoro;
using DevPath.Api.Modules.Projects;

namespace DevPath.Api.Modules.Posts;

public sealed record ProjectContextInput(string? ProjectId, IReadOnlyList<string>? NoteIds);

/// <summary>What a draft is written from: <see cref="Topic"/> for the prompt's first line and the source <see cref="Text"/>.</summary>
public sealed record DraftContext(string Topic, string Text);

/// <summary>Turns a project, its sessions and the chosen note pages into the source text of a draft prompt.</summary>
public sealed class PostContextService(
    IRepository<Project> projects,
    IRepository<Goal> goals,
    IRepository<Session> sessions,
    IRepository<NoteNode> notes,
    NoteService noteContents)
{
    public const int MaxPages = 10;
    public const int MaxPageText = 5_000;
    public const int MaxSessionNotes = 50;

    public async Task<DraftContext> BuildAsync(ProjectContextInput input, CancellationToken cancellationToken)
    {
        var project = input.ProjectId is null ? null : await projects.GetAsync(input.ProjectId, cancellationToken);
        var pages = await FindPagesAsync(input.NoteIds ?? [], cancellationToken);
        if (project is null)
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["projectId"] = ["Proje bulunamadı."] });
        }

        var goal = await goals.GetAsync(project.GoalId, cancellationToken);
        var ofProject = (await sessions.GetAllAsync(cancellationToken)).Where(s => s.ProjectId == project.Id).ToList();

        var text = new StringBuilder();
        text.AppendLine($"Project: {project.Title}");
        if (goal is not null) text.AppendLine($"Goal: {goal.Title}");
        if (project.Url is not null) text.AppendLine($"Project link: {project.Url}");
        AddNumbers(text, ofProject);

        var withNotes = ofProject
            .Where(s => !string.IsNullOrWhiteSpace(s.Note))
            .OrderByDescending(s => s.StartedAt)
            .Take(MaxSessionNotes)
            .ToList();
        if (withNotes.Count > 0)
        {
            text.AppendLine().AppendLine("Session notes, newest first:");
            foreach (var session in withNotes)
            {
                text.AppendLine($"- {LocalDate(session.StartedAt)}: {session.Note!.Trim()}");
            }
        }

        foreach (var page in pages)
        {
            var content = await noteContents.GetContentAsync(page.Id, cancellationToken);
            var pageText = content is null ? "" : NoteText.Extract(content.Blocks);
            text.AppendLine().AppendLine($"Note page \"{page.Title}\":");
            text.AppendLine(pageText.Length > MaxPageText ? pageText[..MaxPageText] + "…" : pageText);
        }

        return new DraftContext(project.Title, text.ToString().TrimEnd());
    }

    private async Task<List<NoteNode>> FindPagesAsync(IReadOnlyList<string> ids, CancellationToken cancellationToken)
    {
        var all = await notes.GetAllAsync(cancellationToken);
        var found = ids.Distinct().Select(id => all.FirstOrDefault(n => n.Id == id && n.Kind == NoteNode.Page)).ToList();
        if (found.Count > MaxPages || found.Contains(null))
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["noteIds"] = [$"En fazla {MaxPages} not sayfası seçilebilir ve hepsi var olmalı."],
            });
        }

        return found!;
    }

    private static void AddNumbers(StringBuilder text, List<Session> ofProject)
    {
        var completed = ofProject.Where(s => s.Completed).ToList();
        if (completed.Count > 0)
        {
            var minutes = completed.Sum(s => s.DurationMinutes);
            text.AppendLine(CultureInfo.InvariantCulture,
                $"Completed sessions: {completed.Count} ({minutes} minutes), {LocalDate(completed.Min(s => s.StartedAt))} to {LocalDate(completed.Max(s => s.StartedAt))}");
        }

        var tags = ofProject
            .SelectMany(s => s.Tags)
            .GroupBy(tag => tag)
            .OrderByDescending(group => group.Count())
            .ThenBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => $"{group.Key} ({group.Count()})")
            .ToList();
        if (tags.Count > 0) text.AppendLine($"Tags: {string.Join(", ", tags)}");
    }

    private static string LocalDate(DateTimeOffset at) =>
        at.ToLocalTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}

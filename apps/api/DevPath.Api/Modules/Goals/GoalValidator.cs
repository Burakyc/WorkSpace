namespace DevPath.Api.Modules.Goals;

/// <summary>Rules for <see cref="GoalInput"/>. Messages are Turkish because the UI shows them as they are.</summary>
public static class GoalValidator
{
    public const int TitleMaxLength = 120;
    public const int DescriptionMaxLength = 1000;
    public const int MinTargetPomodoros = 1;
    public const int MaxTargetPomodoros = 10_000;

    /// <summary>Errors keyed by camelCase field name; empty when the input is valid. Lengths are checked after trimming.</summary>
    public static IReadOnlyDictionary<string, string[]> Validate(GoalInput input)
    {
        var errors = new Dictionary<string, string[]>();

        var title = input.Title?.Trim() ?? "";
        if (title.Length == 0)
        {
            errors["title"] = ["Başlık gerekli."];
        }
        else if (title.Length > TitleMaxLength)
        {
            errors["title"] = [$"Başlık en fazla {TitleMaxLength} karakter olabilir."];
        }

        if ((input.Description?.Trim().Length ?? 0) > DescriptionMaxLength)
        {
            errors["description"] = [$"Açıklama en fazla {DescriptionMaxLength} karakter olabilir."];
        }

        if (input.TargetPomodoros is < MinTargetPomodoros or > MaxTargetPomodoros)
        {
            errors["targetPomodoros"] = [$"Hedef pomodoro sayısı {MinTargetPomodoros} ile {MaxTargetPomodoros} arasında olmalı."];
        }

        return errors;
    }
}

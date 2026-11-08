namespace DevPath.Api.Modules.Settings;

/// <summary>How a module gets AI content (settings.json, "aiModes"). A later module adds its name to <see cref="Modules"/>.</summary>
public static class AiModes
{
    public const string CopyPaste = "copyPaste";

    public static readonly IReadOnlyList<string> Modules = ["english", "learning", "interview"];

    /// <summary>The modes that work; anything else is refused on save and reads as <see cref="CopyPaste"/>.</summary>
    public static readonly IReadOnlyList<string> Available = [CopyPaste];
}

/// <summary>PUT /api/settings/ai-modes/{module}.</summary>
public sealed record AiModeInput(string? Mode);

/// <summary>PUT /api/settings/ai-inbox/{module}. Null or empty clears the folder.</summary>
public sealed record AiInboxInput(string? Folder);

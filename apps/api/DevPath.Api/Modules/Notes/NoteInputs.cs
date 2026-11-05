using System.Text.Json.Nodes;

namespace DevPath.Api.Modules.Notes;

public sealed record NoteCreateInput(string? ParentId, string? Kind, string? Title);

public sealed record NoteRenameInput(string? Title);

public sealed record NoteMoveInput(string? ParentId);

public sealed record NoteShiftInput(int Offset);

/// <summary>A page's BlockNote document. The blocks are stored as they are.</summary>
public sealed record NoteContentInput(JsonNode? Blocks);

public sealed record NoteContent(JsonArray Blocks);

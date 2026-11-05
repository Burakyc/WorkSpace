namespace DevPath.Api.Modules.Notes;

public sealed record NoteCreateInput(string? ParentId, string? Kind, string? Title);

public sealed record NoteRenameInput(string? Title);

public sealed record NoteMoveInput(string? ParentId);

public sealed record NoteShiftInput(int Offset);

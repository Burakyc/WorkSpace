using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Notes;

[ApiController]
[Route("api/notes")]
public sealed class NotesController(NoteService notes, NoteSearchService search) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<NoteNode>> List(CancellationToken cancellationToken) => notes.ListAsync(cancellationToken);

    [HttpGet("search")]
    public Task<IReadOnlyList<NoteSearchResult>> Search([FromQuery] string? q, CancellationToken cancellationToken) =>
        search.SearchAsync(q, cancellationToken);

    [HttpPost]
    public async Task<ActionResult<NoteNode>> Create(NoteCreateInput input, CancellationToken cancellationToken)
    {
        var node = await notes.CreateAsync(input, cancellationToken);
        return Created($"/api/notes/{Uri.EscapeDataString(node.Id)}", node);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteNode>> Rename(string id, NoteRenameInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await notes.RenameAsync(id, input, cancellationToken));

    [HttpPost("{id}/move")]
    public async Task<ActionResult<NoteNode>> Move(string id, NoteMoveInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await notes.MoveAsync(id, input, cancellationToken));

    [HttpPost("{id}/shift")]
    public async Task<ActionResult<NoteNode>> Shift(string id, NoteShiftInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await notes.ShiftAsync(id, input, cancellationToken));

    [HttpGet("{id}/content")]
    public async Task<ActionResult<NoteContent>> GetContent(string id, CancellationToken cancellationToken) =>
        await notes.GetContentAsync(id, cancellationToken) is { } content ? Ok(content) : NotFound();

    [HttpPut("{id}/content")]
    [RequestSizeLimit(MaxContentBytes)]
    public async Task<ActionResult<NoteNode>> SaveContent(string id, NoteContentInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await notes.SaveContentAsync(id, input, cancellationToken));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken) =>
        await notes.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();

    private const long MaxContentBytes = 5 * 1024 * 1024;

    private ActionResult<NoteNode> OkOrNotFound(NoteNode? node) => node is null ? NotFound() : Ok(node);
}

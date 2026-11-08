using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Posts;

[ApiController]
[Route("api/posts")]
public sealed class PostsController(StyleService style, PostDraftService drafts, PostContextService contexts) : ControllerBase
{
    [HttpPost("project-context")]
    public Task<DraftContext> ProjectContext(ProjectContextInput input, CancellationToken cancellationToken) =>
        contexts.BuildAsync(input, cancellationToken);

    [HttpGet("style")]
    public Task<StylePrompt> GetStyle(CancellationToken cancellationToken) => style.GetAsync(cancellationToken);

    [HttpPut("style")]
    public Task<StylePrompt> SaveStyle(StyleInput input, CancellationToken cancellationToken) =>
        style.SaveAsync(input, cancellationToken);

    [HttpGet("drafts")]
    public Task<IReadOnlyList<PostDraft>> ListDrafts(CancellationToken cancellationToken) =>
        drafts.ListAsync(cancellationToken);

    [HttpPut("drafts/{id}")]
    public async Task<ActionResult<PostDraft>> UpdateDraft(string id, PostDraftInput input, CancellationToken cancellationToken) =>
        await drafts.UpdateAsync(id, input, cancellationToken) is { } draft ? draft : NotFound();

    [HttpDelete("drafts/{id}")]
    public async Task<IActionResult> DeleteDraft(string id, CancellationToken cancellationToken) =>
        await drafts.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
}

using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Posts;

[ApiController]
[Route("api/posts")]
public sealed class PostsController(StyleService style) : ControllerBase
{
    [HttpGet("style")]
    public Task<StylePrompt> GetStyle(CancellationToken cancellationToken) => style.GetAsync(cancellationToken);

    [HttpPut("style")]
    public Task<StylePrompt> SaveStyle(StyleInput input, CancellationToken cancellationToken) =>
        style.SaveAsync(input, cancellationToken);
}

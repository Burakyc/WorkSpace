using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Content;

/// <summary>One of the type's marks, or null to remove the mark.</summary>
public sealed record MarkInput(string? Mark);

[ApiController]
[Route("api/content/{type}")]
public sealed class ContentController(ContentService content) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<TopicSummary>> List(string type, CancellationToken cancellationToken) =>
        content.ListAsync(type, cancellationToken);

    [HttpGet("{slug}")]
    public async Task<ActionResult<JsonObject>> Get(string type, string slug, CancellationToken cancellationToken) =>
        await content.GetAsync(type, slug, cancellationToken) is { } topic ? Ok(topic) : NotFound();

    [HttpPut("{slug}/items/{id}/mark")]
    public async Task<ActionResult<JsonObject>> Mark(
        string type, string slug, string id, MarkInput input, CancellationToken cancellationToken) =>
        await content.MarkAsync(type, slug, id, input.Mark, cancellationToken) is { } item ? Ok(item) : NotFound();
}

using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Projects;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(ProjectService projects) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<Project>> List([FromQuery] bool includeArchived, CancellationToken cancellationToken) =>
        projects.ListAsync(includeArchived, cancellationToken);

    [HttpPost]
    public async Task<ActionResult<Project>> Create(ProjectCreateInput input, CancellationToken cancellationToken)
    {
        var project = await projects.CreateAsync(input, cancellationToken);
        return Created($"/api/projects/{Uri.EscapeDataString(project.Id)}", project);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Project>> Update(string id, ProjectUpdateInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await projects.UpdateAsync(id, input, cancellationToken));

    [HttpPost("{id}/archive")]
    public async Task<ActionResult<Project>> Archive(string id, CancellationToken cancellationToken) =>
        OkOrNotFound(await projects.SetArchivedAsync(id, true, cancellationToken));

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<Project>> Restore(string id, CancellationToken cancellationToken) =>
        OkOrNotFound(await projects.SetArchivedAsync(id, false, cancellationToken));

    private ActionResult<Project> OkOrNotFound(Project? project) => project is null ? NotFound() : Ok(project);
}

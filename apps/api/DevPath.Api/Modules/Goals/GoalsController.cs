using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Goals;

[ApiController]
[Route("api/goals")]
public sealed class GoalsController(GoalService goals) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<Goal>> List([FromQuery] bool includeArchived, CancellationToken cancellationToken) =>
        goals.ListAsync(includeArchived, cancellationToken);

    [HttpGet("progress")]
    public Task<IReadOnlyList<GoalProgress>> Progress(CancellationToken cancellationToken) =>
        goals.ListProgressAsync(cancellationToken);

    [HttpPost]
    public async Task<ActionResult<Goal>> Create(GoalInput input, CancellationToken cancellationToken)
    {
        var goal = await goals.CreateAsync(input, cancellationToken);
        return Created($"/api/goals/{Uri.EscapeDataString(goal.Id)}", goal);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Goal>> Update(string id, GoalInput input, CancellationToken cancellationToken) =>
        OkOrNotFound(await goals.UpdateAsync(id, input, cancellationToken));

    [HttpPost("{id}/archive")]
    public async Task<ActionResult<Goal>> Archive(string id, CancellationToken cancellationToken) =>
        OkOrNotFound(await goals.SetArchivedAsync(id, true, cancellationToken));

    [HttpPost("{id}/restore")]
    public async Task<ActionResult<Goal>> Restore(string id, CancellationToken cancellationToken) =>
        OkOrNotFound(await goals.SetArchivedAsync(id, false, cancellationToken));

    private ActionResult<Goal> OkOrNotFound(Goal? goal) => goal is null ? NotFound() : Ok(goal);
}

using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Content;

public sealed record InboxScanInput(string? Type);

[ApiController]
[Route("api/inbox/{module}")]
public sealed class InboxController(InboxService inbox) : ControllerBase
{
    /// <summary>POST because it writes and removes error reports.</summary>
    [HttpPost("scan")]
    public Task<InboxScan> Scan(string module, InboxScanInput input, CancellationToken cancellationToken) =>
        inbox.ScanAsync(module, input.Type, cancellationToken);
}

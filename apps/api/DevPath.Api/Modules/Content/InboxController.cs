using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Content;

public sealed record InboxScanInput(string? Type);

public sealed record InboxImportInput(string? Type, IReadOnlyList<string>? Names);

[ApiController]
[Route("api/inbox/{module}")]
public sealed class InboxController(InboxService inbox) : ControllerBase
{
    /// <summary>POST because it writes and removes error reports.</summary>
    [HttpPost("scan")]
    public Task<InboxScan> Scan(string module, InboxScanInput input, CancellationToken cancellationToken) =>
        inbox.ScanAsync(module, input.Type, cancellationToken);

    [HttpPost("import")]
    public Task<InboxImport> Import(string module, InboxImportInput input, CancellationToken cancellationToken) =>
        inbox.ImportAsync(module, input.Type, input.Names ?? [], cancellationToken);
}

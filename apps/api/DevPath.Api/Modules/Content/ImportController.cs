using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.Content;

/// <summary><paramref name="Type"/> is the module's content type; <paramref name="Text"/> is the pasted or uploaded JSON as it is.</summary>
public sealed record ImportInput(string? Type, string? Text);

public sealed record ImportValidation(IReadOnlyList<ImportError> Errors);

[ApiController]
[Route("api/import")]
public sealed class ImportController(ImportService imports) : ControllerBase
{
    // Room for JSON escaping around a 2 MB text; the text itself is limited by the validator.
    private const long MaxRequestBytes = 8 * 1024 * 1024;

    [HttpPost("validate")]
    [RequestSizeLimit(MaxRequestBytes)]
    public ImportValidation Validate(ImportInput input) => new(imports.Validate(input.Type, input.Text));

    [HttpPost]
    [RequestSizeLimit(MaxRequestBytes)]
    public Task<ImportResult> Import(ImportInput input, CancellationToken cancellationToken) =>
        imports.ImportAsync(input.Type, input.Text, cancellationToken);
}

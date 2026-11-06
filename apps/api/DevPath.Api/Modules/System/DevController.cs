using DevPath.Api.Infrastructure.Diagnostics;
using DevPath.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Mvc;

namespace DevPath.Api.Modules.System;

/// <summary>GET /api/dev: what the developer panel shows. No messages, real paths or names inside folders.</summary>
public sealed record DevStatus(IReadOnlyList<ErrorEntry> Errors, IReadOnlyList<DataFileSize> Files, long TotalBytes);

[ApiController]
[Route("api/dev")]
public sealed class DevController(ErrorBuffer errors, DataDirectory dataDirectory) : ControllerBase
{
    [HttpGet]
    public DevStatus Get()
    {
        var files = DataFileSizes.Measure(dataDirectory.Path);
        return new DevStatus(errors.Recent(), files, files.Sum(f => f.Bytes));
    }
}

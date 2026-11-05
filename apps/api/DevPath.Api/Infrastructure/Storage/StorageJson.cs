using System.Text.Json;

namespace DevPath.Api.Infrastructure.Storage;

/// <summary>The one set of JSON options for data files: camelCase and indented, so files stay readable.</summary>
public static class StorageJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };
}

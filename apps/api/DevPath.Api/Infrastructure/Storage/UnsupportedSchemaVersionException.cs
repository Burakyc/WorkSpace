namespace DevPath.Api.Infrastructure.Storage;

/// <summary>A data file was written by a newer app version. It is never changed, so no data is lost.</summary>
public sealed class UnsupportedSchemaVersionException(string path, int version, int supportedVersion)
    : Exception($"'{path}' has schemaVersion {version}, but this app supports up to {supportedVersion}. It was written by a newer app version.")
{
    public string FilePath { get; } = path;

    public int Version { get; } = version;

    public int SupportedVersion { get; } = supportedVersion;
}

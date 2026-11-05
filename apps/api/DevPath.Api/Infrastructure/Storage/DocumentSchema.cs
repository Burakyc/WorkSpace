using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevPath.Api.Infrastructure.Storage;

/// <summary>The current <c>schemaVersion</c> of one file type and the steps that upgrade older files to it.</summary>
public sealed record DocumentSchema(int CurrentVersion, IReadOnlyList<Migration> Migrations)
{
    public const string VersionProperty = "schemaVersion";

    /// <summary>Upgrades <paramref name="document"/> to <see cref="CurrentVersion"/>. A missing <c>schemaVersion</c> counts as 0.</summary>
    public (JsonObject Document, bool Changed) Migrate(JsonObject document, string path)
    {
        var version = ReadVersion(document, path);

        if (version > CurrentVersion)
        {
            throw new UnsupportedSchemaVersionException(path, version, CurrentVersion);
        }

        if (version == CurrentVersion)
        {
            return (document, false);
        }

        for (var from = version; from < CurrentVersion; from++)
        {
            var step = Migrations.SingleOrDefault(migration => migration.FromVersion == from)
                ?? throw new InvalidOperationException($"No migration from schemaVersion {from} for '{path}'.");
            document = step.Upgrade(document);
        }

        return (Stamp(document), true);
    }

    /// <summary>Sets <c>schemaVersion</c> to the current version, as the first property.</summary>
    public JsonObject Stamp(JsonObject document)
    {
        document.Remove(VersionProperty);
        document.Insert(0, VersionProperty, CurrentVersion);
        return document;
    }

    private static int ReadVersion(JsonObject document, string path)
    {
        if (!document.TryGetPropertyValue(VersionProperty, out var node))
        {
            return 0;
        }

        if (node is JsonValue value &&
            value.GetValueKind() == JsonValueKind.Number &&
            value.TryGetValue<int>(out var version) &&
            version >= 0)
        {
            return version;
        }

        throw new InvalidDataException($"'{path}' has an invalid schemaVersion: {node?.ToJsonString() ?? "null"}.");
    }
}

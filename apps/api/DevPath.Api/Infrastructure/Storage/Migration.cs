using System.Text.Json.Nodes;

namespace DevPath.Api.Infrastructure.Storage;

/// <summary>Upgrades a document from <paramref name="FromVersion"/> to the next version. Works on raw JSON, so old C# types are never needed.</summary>
public sealed record Migration(int FromVersion, Func<JsonObject, JsonObject> Upgrade);

using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevPath.Api.Infrastructure.Storage;

/// <summary>
/// Reads and writes JSON documents under the data folder. Writes are atomic (temp file, flush, replace),
/// and every access to a file goes through that file's lock.
/// </summary>
public sealed class JsonFileStore(DataDirectory dataDirectory)
{
    // ponytail: one lock per file ever touched, never removed; fine for thousands of files.
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.OrdinalIgnoreCase);

    public async Task<JsonObject?> ReadAsync(string path, CancellationToken cancellationToken)
    {
        var fullPath = Resolve(path);
        var gate = _locks.GetOrAdd(fullPath, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await ReadFileAsync(fullPath, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task WriteAsync(string path, JsonObject document, CancellationToken cancellationToken)
    {
        await UpdateAsync(path, _ => document, cancellationToken);
    }

    /// <summary>Reads, applies <paramref name="update"/> and writes under one lock, so concurrent updates are never lost.</summary>
    public async Task<JsonObject> UpdateAsync(
        string path,
        Func<JsonObject?, JsonObject> update,
        CancellationToken cancellationToken)
    {
        var fullPath = Resolve(path);
        var gate = _locks.GetOrAdd(fullPath, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            var document = update(await ReadFileAsync(fullPath, cancellationToken));
            await WriteFileAsync(fullPath, document, cancellationToken);
            return document;
        }
        finally
        {
            gate.Release();
        }
    }

    private string Resolve(string path)
    {
        var root = dataDirectory.Path;
        var fullPath = Path.GetFullPath(Path.Combine(root, path));

        if (Path.IsPathRooted(path) ||
            !fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"'{path}' is not a path inside the data folder.", nameof(path));
        }

        return fullPath;
    }

    private static async Task<JsonObject?> ReadFileAsync(string fullPath, CancellationToken cancellationToken)
    {
        if (!File.Exists(fullPath))
        {
            return null;
        }

        await using var stream = File.OpenRead(fullPath);
        var node = await JsonNode.ParseAsync(stream, cancellationToken: cancellationToken);
        return node as JsonObject ?? throw new InvalidDataException($"'{fullPath}' does not hold a JSON object.");
    }

    private static async Task WriteFileAsync(string fullPath, JsonObject document, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        var tempPath = fullPath + ".tmp";

        try
        {
            await using (var stream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await JsonSerializer.SerializeAsync(stream, document, StorageJson.Options, cancellationToken);
                stream.Flush(flushToDisk: true);
            }

            File.Move(tempPath, fullPath, overwrite: true);
        }
        catch
        {
            TryDelete(tempPath);
            throw;
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            File.Delete(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // Best effort: a stale .tmp is ignored by reads and replaced by the next write.
        }
    }
}

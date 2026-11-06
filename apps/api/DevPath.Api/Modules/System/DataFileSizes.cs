namespace DevPath.Api.Modules.System;

/// <summary>A top-level file, or a top-level folder with its file count and total size (recursive).</summary>
public sealed record DataFileSize(string Name, bool Folder, int Files, long Bytes);

public static class DataFileSizes
{
    /// <summary>The top level of the data folder, sorted by name. Nothing inside a folder is named.</summary>
    public static IReadOnlyList<DataFileSize> Measure(string dataDir)
    {
        var root = new DirectoryInfo(dataDir);
        if (!root.Exists)
        {
            return [];
        }

        var result = new List<DataFileSize>();
        foreach (var folder in root.EnumerateDirectories())
        {
            var sizes = folder.EnumerateFiles("*", SearchOption.AllDirectories).Select(SizeOf).OfType<long>().ToList();
            result.Add(new DataFileSize(folder.Name, true, sizes.Count, sizes.Sum()));
        }
        foreach (var file in root.EnumerateFiles())
        {
            if (SizeOf(file) is { } bytes)
            {
                result.Add(new DataFileSize(file.Name, false, 1, bytes));
            }
        }
        return result.OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>Null when the file was replaced or deleted while we looked.</summary>
    private static long? SizeOf(FileInfo file)
    {
        try
        {
            return file.Length;
        }
        catch (FileNotFoundException)
        {
            return null;
        }
    }
}

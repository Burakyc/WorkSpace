namespace DevPath.Api.Infrastructure.Storage;

/// <summary>The folder that holds all JSON data files (DEVPATH_DATA_DIR).</summary>
public sealed record DataDirectory(string Path)
{
    public static DataDirectory Resolve(string? value, bool isDevelopment)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            if (!isDevelopment)
            {
                throw new InvalidOperationException("DEVPATH_DATA_DIR must be set outside Development.");
            }

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return new DataDirectory(System.IO.Path.Combine(appData, "DevPath", "dev-data"));
        }

        if (!System.IO.Path.IsPathFullyQualified(value))
        {
            throw new ArgumentException($"DEVPATH_DATA_DIR must be an absolute path, but was '{value}'.", nameof(value));
        }

        return new DataDirectory(System.IO.Path.TrimEndingDirectorySeparator(System.IO.Path.GetFullPath(value)));
    }
}

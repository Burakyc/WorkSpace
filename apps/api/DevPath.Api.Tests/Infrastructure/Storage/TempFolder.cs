namespace DevPath.Api.Tests.Infrastructure.Storage;

/// <summary>A fresh folder under %TEMP%\devpath-tests, deleted on dispose.</summary>
public sealed class TempFolder : IDisposable
{
    public string Path { get; } = System.IO.Path.Combine(
        System.IO.Path.GetTempPath(), "devpath-tests", Guid.NewGuid().ToString("N"));

    public TempFolder()
    {
        Directory.CreateDirectory(Path);
    }

    public string File(string relativePath) => System.IO.Path.Combine(Path, relativePath);

    public void Dispose()
    {
        if (Directory.Exists(Path))
        {
            Directory.Delete(Path, recursive: true);
        }
    }
}

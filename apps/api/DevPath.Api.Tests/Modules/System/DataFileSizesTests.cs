using DevPath.Api.Modules.System;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.System;

public sealed class DataFileSizesTests : IDisposable
{
    private readonly TempFolder _folder = new();

    public void Dispose() => _folder.Dispose();

    [Fact]
    public void Lists_top_level_files_and_folder_totals_sorted()
    {
        File.WriteAllText(_folder.File("sessions.json"), new string('x', 10));
        File.WriteAllText(_folder.File("Goals.json"), new string('x', 3));
        Directory.CreateDirectory(_folder.File(Path.Combine("notes", "pages")));
        File.WriteAllText(_folder.File(Path.Combine("notes", "index.json")), new string('x', 5));
        File.WriteAllText(_folder.File(Path.Combine("notes", "pages", "a.json")), new string('x', 7));
        Directory.CreateDirectory(_folder.File("cache"));

        var sizes = DataFileSizes.Measure(_folder.Path);

        Assert.Equal(
            [
                new DataFileSize("cache", true, 0, 0),
                new DataFileSize("Goals.json", false, 1, 3),
                new DataFileSize("notes", true, 2, 12),
                new DataFileSize("sessions.json", false, 1, 10),
            ],
            sizes);
    }

    [Fact]
    public void A_missing_folder_has_no_files()
    {
        Assert.Empty(DataFileSizes.Measure(_folder.File("missing")));
    }
}

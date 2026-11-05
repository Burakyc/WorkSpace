using DevPath.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Hosting;

namespace DevPath.Api.Tests.Infrastructure.Storage;

public class DataDirectoryTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Absolute_setting_is_used(bool isDevelopment)
    {
        Assert.Equal(@"C:\x\data", DataDirectory.Resolve(@"C:\x\data\", isDevelopment).Path);
    }

    [Theory]
    [InlineData("data")]
    [InlineData(@"..\data")]
    [InlineData(@"\data")]
    public void Relative_setting_is_rejected(string value)
    {
        var ex = Assert.Throws<ArgumentException>(() => DataDirectory.Resolve(value, isDevelopment: true));

        Assert.Contains("DEVPATH_DATA_DIR", ex.Message);
    }

    [Fact]
    public void Unset_in_development_uses_dev_data()
    {
        var expected = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevPath", "dev-data");

        Assert.Equal(expected, DataDirectory.Resolve(null, isDevelopment: true).Path);
    }

    [Fact]
    public void Unset_outside_development_is_rejected()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => DataDirectory.Resolve(" ", isDevelopment: false));

        Assert.Contains("DEVPATH_DATA_DIR", ex.Message);
    }

    [Fact]
    public async Task Api_creates_the_folder_at_startup()
    {
        await using var factory = new ApiFactory();
        Assert.False(Directory.Exists(factory.DataDir));

        factory.CreateClient();

        Assert.True(Directory.Exists(factory.DataDir));
    }

    [Fact]
    public async Task Api_refuses_to_start_in_production_without_setting()
    {
        await using var root = new ApiFactory();
        using var production = root.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("DEVPATH_DATA_DIR", "");
        });

        var ex = Assert.ThrowsAny<Exception>(() => production.CreateClient());

        Assert.Contains("DEVPATH_DATA_DIR", ex.ToString());
    }
}

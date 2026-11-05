using DevPath.Api.Infrastructure.Hosting;

namespace DevPath.Api.Tests.Infrastructure.Hosting;

public class ApiPortTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Resolve_returns_default_when_unset(string? value)
    {
        Assert.Equal(5180, ApiPort.Resolve(value));
    }

    [Theory]
    [InlineData("1", 1)]
    [InlineData("6000", 6000)]
    [InlineData("65535", 65535)]
    public void Resolve_returns_valid_port(string value, int expected)
    {
        Assert.Equal(expected, ApiPort.Resolve(value));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("65536")]
    [InlineData("70000")]
    [InlineData("5180.5")]
    [InlineData(" 6000")]
    public void Resolve_rejects_invalid_port(string value)
    {
        var ex = Assert.Throws<ArgumentException>(() => ApiPort.Resolve(value));

        Assert.Contains("DEVPATH_PORT", ex.Message);
        Assert.Contains($"'{value}'", ex.Message);
    }
}

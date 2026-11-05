using System.Net;
using DevPath.Api.Infrastructure.Hosting;

namespace DevPath.Api.Tests.Infrastructure.Hosting;

public class ApiBindingTests
{
    [Fact]
    public void Container_binds_all_interfaces()
    {
        Assert.Equal(IPAddress.Any, ApiBinding.Resolve("1"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("0")]
    [InlineData("true")]
    [InlineData("yes")]
    [InlineData(" 1")]
    public void Everywhere_else_binds_loopback_only(string? value)
    {
        Assert.Equal(IPAddress.Loopback, ApiBinding.Resolve(value));
    }
}

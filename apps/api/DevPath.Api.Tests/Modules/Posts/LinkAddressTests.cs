using System.Net;
using DevPath.Api.Modules.Posts;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class LinkAddressTests
{
    [Theory]
    [InlineData("https://example.com/a?b=c#d")]
    [InlineData("  https://www.youtube.com/watch?v=abc  ")]
    [InlineData("https://8.8.8.8/")]
    [InlineData("https://[2606:4700:4700::1111]/")]
    [InlineData("https://bücher.example/")]
    public void Public_https_addresses_pass(string input) => Assert.NotNull(LinkAddress.Parse(input));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("example.com")]
    [InlineData("http://example.com/")]
    [InlineData("ftp://example.com/")]
    [InlineData("file:///C:/secrets.txt")]
    [InlineData("https://example.com:8443/")]
    [InlineData("https://user:pass@example.com/")]
    [InlineData("https://localhost/")]
    [InlineData("https://LOCALHOST./")]
    [InlineData("https://api.localhost/")]
    [InlineData("https://printer.local/")]
    [InlineData("https://db.internal/")]
    [InlineData("https://intranet/")]
    [InlineData("https://127.0.0.1/")]
    [InlineData("https://127.1/")]
    [InlineData("https://2130706433/")]
    [InlineData("https://0x7f.0.0.1/")]
    [InlineData("https://0.0.0.0/")]
    [InlineData("https://10.1.2.3/")]
    [InlineData("https://100.64.0.1/")]
    [InlineData("https://169.254.169.254/latest/meta-data/")]
    [InlineData("https://172.16.0.1/")]
    [InlineData("https://172.31.255.255/")]
    [InlineData("https://192.168.1.1/")]
    [InlineData("https://192.0.2.1/")]
    [InlineData("https://198.18.0.1/")]
    [InlineData("https://198.51.100.1/")]
    [InlineData("https://203.0.113.1/")]
    [InlineData("https://224.0.0.1/")]
    [InlineData("https://[::1]/")]
    [InlineData("https://[::]/")]
    [InlineData("https://[fe80::1]/")]
    [InlineData("https://[fd00::1]/")]
    [InlineData("https://[ff02::1]/")]
    [InlineData("https://[2001:db8::1]/")]
    [InlineData("https://[2002:7f00:1::]/")]
    [InlineData("https://[64:ff9b::7f00:1]/")]
    [InlineData("https://[::ffff:127.0.0.1]/")]
    [InlineData("https://[::ffff:192.168.0.1]/")]
    public void Everything_else_is_refused(string? input) => Assert.Null(LinkAddress.Parse(input));

    [Fact]
    public void A_too_long_address_is_refused() =>
        Assert.Null(LinkAddress.Parse("https://example.com/" + new string('a', LinkAddress.MaxLength)));

    [Theory]
    [InlineData("172.15.0.1", true)]
    [InlineData("172.32.0.1", true)]
    [InlineData("100.63.0.1", true)]
    [InlineData("100.128.0.1", true)]
    [InlineData("192.169.0.1", true)]
    [InlineData("93.184.216.34", true)]
    [InlineData("127.0.0.1", false)]
    [InlineData("::ffff:10.0.0.1", false)]
    public void Addresses_are_judged_by_their_range(string address, bool expected) =>
        Assert.Equal(expected, LinkAddress.IsPublic(IPAddress.Parse(address)));

    [Fact]
    public async Task A_name_resolving_to_any_private_address_is_refused()
    {
        static Func<string, CancellationToken, Task<IPAddress[]>> Resolver(params string[] addresses) =>
            (_, _) => Task.FromResult(addresses.Select(IPAddress.Parse).ToArray());

        var good = await LinkAddress.ResolvePublicAsync("a.test", Resolver("93.184.216.34"), default);
        Assert.Single(good);

        await Assert.ThrowsAsync<HttpRequestException>(() => LinkAddress.ResolvePublicAsync("a.test", Resolver("93.184.216.34", "127.0.0.1"), default));
        await Assert.ThrowsAsync<HttpRequestException>(() => LinkAddress.ResolvePublicAsync("a.test", Resolver("::1"), default));
        await Assert.ThrowsAsync<HttpRequestException>(() => LinkAddress.ResolvePublicAsync("a.test", Resolver(), default));
    }
}

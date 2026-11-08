using System.Net;
using System.Net.Sockets;

namespace DevPath.Api.Modules.Posts;

/// <summary>Which links the API may read: public https addresses only. This is the trust boundary of the link reader, checked for the first URL and every redirect.</summary>
public static class LinkAddress
{
    public const int MaxLength = 2_000;
    public const string Error = "Yalnızca https:// ile başlayan herkese açık adresler okunabilir.";

    /// <summary>The checked address, or null when it may not be read. A name is checked only by its form here; see <see cref="ResolvePublicAsync"/>.</summary>
    public static Uri? Parse(string? input)
    {
        var text = input?.Trim() ?? "";
        if (text.Length is 0 or > MaxLength
            || !Uri.TryCreate(text, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !uri.IsDefaultPort
            || uri.UserInfo.Length > 0)
        {
            return null;
        }

        return uri.HostNameType switch
        {
            UriHostNameType.Dns when IsPublicName(uri.IdnHost) => uri,
            UriHostNameType.IPv4 or UriHostNameType.IPv6
                when IPAddress.TryParse(uri.Host, out var address) && IsPublic(address) => uri,
            _ => null,
        };
    }

    private static bool IsPublicName(string host)
    {
        var name = host.TrimEnd('.').ToLowerInvariant();
        return name.Contains('.')
            && !name.EndsWith(".localhost", StringComparison.Ordinal)
            && !name.EndsWith(".local", StringComparison.Ordinal)
            && !name.EndsWith(".internal", StringComparison.Ordinal);
    }

    public static bool IsPublic(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            return bytes[0] switch
            {
                0 or 10 or 127 or >= 224 => false,
                100 => bytes[1] is < 64 or >= 128,
                169 => bytes[1] != 254,
                172 => bytes[1] is < 16 or >= 32,
                192 => !(bytes[1] == 168 || (bytes[1] == 0 && bytes[2] is 0 or 2)),
                198 => !(bytes[1] is 18 or 19 || (bytes[1] == 51 && bytes[2] == 100)),
                203 => !(bytes[1] == 0 && bytes[2] == 113),
                _ => true,
            };
        }

        return !(IPAddress.IPv6Any.Equals(address)
            || IPAddress.IPv6Loopback.Equals(address)
            || address.IsIPv6LinkLocal
            || address.IsIPv6SiteLocal
            || address.IsIPv6UniqueLocal
            || address.IsIPv6Multicast
            || address.IsIPv6Teredo
            || (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0d && bytes[3] == 0xb8)
            || (bytes[0] == 0x20 && bytes[1] == 0x02)
            || (bytes[0] == 0x00 && bytes[1] == 0x64 && bytes[2] == 0xff && bytes[3] == 0x9b));
    }

    /// <summary>
    /// The addresses to connect to. Refuses a name when any address it resolves to isn't public, so a public name can't point inside
    /// the machine or network, and because the caller connects to exactly these, DNS rebinding can't change the answer afterwards.
    /// </summary>
    public static async Task<IPAddress[]> ResolvePublicAsync(
        string host, Func<string, CancellationToken, Task<IPAddress[]>> resolve, CancellationToken cancellationToken)
    {
        var addresses = await resolve(host, cancellationToken);
        if (addresses.Length == 0 || !addresses.All(IsPublic))
        {
            throw new HttpRequestException($"The address of {host} is not public.");
        }

        return addresses;
    }
}

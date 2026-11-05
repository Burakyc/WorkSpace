using System.Globalization;

namespace DevPath.Api.Infrastructure.Hosting;

public static class ApiPort
{
    public const int Default = 5180;

    public static int Resolve(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return Default;
        }

        if (int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var port) && port is >= 1 and <= 65535)
        {
            return port;
        }

        throw new ArgumentException($"DEVPATH_PORT must be a whole number from 1 to 65535, but was '{value}'.", nameof(value));
    }
}

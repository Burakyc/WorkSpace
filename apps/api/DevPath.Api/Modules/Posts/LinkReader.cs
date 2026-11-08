using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using DevPath.Api.Infrastructure.Validation;

namespace DevPath.Api.Modules.Posts;

public sealed record LinkReadInput(string? Url);

/// <summary>What could be read from a link. <see cref="Error"/> is set when nothing could; the user then fills in the fields.</summary>
public sealed record LinkRead(string Url, string Source, string? Title, string? Author, string? Description, string? Error);

/// <summary>Reads a link's title, author and description through the named <c>link</c> client. It only reads: nothing is sent to a site but the GET itself.</summary>
public sealed class LinkReader(IHttpClientFactory httpClientFactory, ILogger<LinkReader> logger)
{
    public const string ClientName = "link";
    public const int MaxBytes = 2 * 1024 * 1024;
    public const int MaxRedirects = 3;
    public const int MaxTitle = 300;
    public const int MaxAuthor = 200;
    public const int MaxDescription = 5_000;
    public const string SourceYouTube = "youtube";
    public const string SourcePage = "page";

    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    private const string ReadFailed = "Bağlantı okunamadı. Alanları elle doldurabilirsin.";
    private const string NotAPage = "Bu bağlantı bir web sayfası değil. Alanları elle doldurabilirsin.";

    private sealed record Fetched(string Text, string? MediaType);

    public async Task<LinkRead> ReadAsync(LinkReadInput input, CancellationToken cancellationToken)
    {
        var uri = LinkAddress.Parse(input.Url) ?? throw new ValidationException(new Dictionary<string, string[]>
        {
            ["url"] = [LinkAddress.Error],
        });

        return YouTubeLink.VideoId(uri) is { } videoId
            ? await ReadYouTubeAsync(videoId, cancellationToken)
            : await ReadPageAsync(uri, cancellationToken);
    }

    private async Task<LinkRead> ReadPageAsync(Uri uri, CancellationToken cancellationToken)
    {
        var url = uri.AbsoluteUri;
        var page = await FetchAsync(uri, cancellationToken);
        if (page is null)
        {
            return new LinkRead(url, SourcePage, null, null, null, ReadFailed);
        }

        if (!IsHtml(page))
        {
            return new LinkRead(url, SourcePage, null, null, null, NotAPage);
        }

        var meta = HtmlMeta.Parse(page.Text);
        return new LinkRead(url, SourcePage, Cut(meta.Title, MaxTitle), Cut(meta.Author, MaxAuthor), Cut(meta.Description, MaxDescription), null);
    }

    private async Task<LinkRead> ReadYouTubeAsync(string videoId, CancellationToken cancellationToken)
    {
        var url = YouTubeLink.WatchUrl(videoId);
        var embed = ReadOEmbed(await FetchAsync(YouTubeLink.OEmbedUrl(videoId), cancellationToken));
        var page = await FetchAsync(url, cancellationToken);
        var meta = page is not null && IsHtml(page) ? HtmlMeta.Parse(page.Text) : PageMeta.Empty;

        var title = embed.Title ?? meta.Title;
        return new LinkRead(
            url.AbsoluteUri,
            SourceYouTube,
            Cut(title, MaxTitle),
            Cut(embed.Author, MaxAuthor),
            Cut(meta.Description, MaxDescription),
            title is null ? ReadFailed : null);
    }

    private static PageMeta ReadOEmbed(Fetched? fetched)
    {
        if (fetched is null)
        {
            return PageMeta.Empty;
        }

        try
        {
            using var document = JsonDocument.Parse(fetched.Text);
            return document.RootElement.ValueKind == JsonValueKind.Object
                ? new PageMeta(Text(document.RootElement, "title"), Text(document.RootElement, "author_name"), null)
                : PageMeta.Empty;
        }
        catch (JsonException)
        {
            return PageMeta.Empty;
        }
    }

    private static string? Text(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString())
            ? value.GetString()!.Trim()
            : null;

    private static bool IsHtml(Fetched fetched) => fetched.MediaType is "text/html" or "application/xhtml+xml";

    private static string? Cut(string? text, int max) => text is { Length: var length } && length > max ? text[..max] : text;

    /// <summary>The body at most <see cref="MaxBytes"/> long, following redirects by hand so each target passes <see cref="LinkAddress"/>; null on any failure.</summary>
    private async Task<Fetched?> FetchAsync(Uri start, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(Timeout);
        try
        {
            using var client = httpClientFactory.CreateClient(ClientName);
            var current = start;
            for (var hop = 0; hop <= MaxRedirects; hop++)
            {
                using var response = await client.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                if ((int)response.StatusCode is >= 300 and < 400 && response.Headers.Location is { } location)
                {
                    var next = LinkAddress.Parse(new Uri(current, location).AbsoluteUri);
                    if (next is null)
                    {
                        logger.LogWarning("A link redirected to an address that may not be read.");
                        return null;
                    }

                    current = next;
                    continue;
                }

                if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength > MaxBytes)
                {
                    logger.LogWarning("A link answered {Status}.", (int)response.StatusCode);
                    return null;
                }

                var body = await ReadLimitedAsync(response.Content, timeout.Token);
                return body is null ? null : new Fetched(Decode(body, response.Content.Headers.ContentType), response.Content.Headers.ContentType?.MediaType);
            }

            logger.LogWarning("A link redirected too many times.");
            return null;
        }
        catch (Exception ex) when (
            ex is HttpRequestException or UriFormatException or InvalidOperationException ||
            (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("A link could not be read: {Kind}", ex.GetType().Name);
            return null;
        }
    }

    private static async Task<byte[]?> ReadLimitedAsync(HttpContent content, CancellationToken cancellationToken)
    {
        await using var stream = await content.ReadAsStreamAsync(cancellationToken);
        using var limited = new MemoryStream();
        var buffer = new byte[81920];
        int read;
        while ((read = await stream.ReadAsync(buffer, cancellationToken)) > 0)
        {
            if (limited.Length + read > MaxBytes)
            {
                return null;
            }

            limited.Write(buffer, 0, read);
        }

        return limited.ToArray();
    }

    // ponytail: only the header's charset and what .NET knows by default; reading <meta charset> and code pages waits for a real page that needs it.
    private static string Decode(byte[] body, MediaTypeHeaderValue? contentType)
    {
        Encoding encoding = Encoding.UTF8;
        try
        {
            if (contentType?.CharSet is { Length: > 0 } charset)
            {
                encoding = Encoding.GetEncoding(charset.Trim('"'));
            }
        }
        catch (ArgumentException)
        {
            // An unknown charset reads as UTF-8.
        }

        return encoding.GetString(body).TrimStart('﻿');
    }

    /// <summary>The real client's connection: only to public addresses, checked and used here so DNS can't answer differently later.</summary>
    public static async ValueTask<Stream> ConnectPublicAsync(SocketsHttpConnectionContext context, CancellationToken cancellationToken)
    {
        var addresses = await LinkAddress.ResolvePublicAsync(context.DnsEndPoint.Host, Dns.GetHostAddressesAsync, cancellationToken);
        var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(addresses, context.DnsEndPoint.Port, cancellationToken);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }
}

using System.Net;
using System.Text;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Posts;
using Microsoft.Extensions.Logging.Abstractions;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class LinkReaderTests
{
    private const string Url = "https://example.com/a";
    private const string Watch = "https://www.youtube.com/watch?v=abc123DEF_4";
    private const string Failed = "Bağlantı okunamadı. Alanları elle doldurabilirsin.";

    private static HttpResponseMessage Html(string html) =>
        new(HttpStatusCode.OK) { Content = new StringContent(html, Encoding.UTF8, "text/html") };

    private static HttpResponseMessage Redirect(string location) =>
        new(HttpStatusCode.Found) { Headers = { Location = new Uri(location, UriKind.RelativeOrAbsolute) } };

    private static (LinkReader Reader, StubHttpHandler Handler) Create(Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        var handler = new StubHttpHandler(respond);
        return (new LinkReader(new StubHttpClientFactory(handler), NullLogger<LinkReader>.Instance), handler);
    }

    private static Task<LinkRead> Read(LinkReader reader, string url = Url) =>
        reader.ReadAsync(new LinkReadInput(url), CancellationToken.None);

    [Fact]
    public async Task Reads_a_page()
    {
        var (reader, handler) = Create(_ => Html("""<head><title>T</title><meta name="author" content="A"><meta name="description" content="D"></head>"""));

        var read = await Read(reader);

        Assert.Equal(new LinkRead(Url, LinkReader.SourcePage, "T", "A", "D", null), read);
        Assert.Equal(Url, Assert.Single(handler.Requests).RequestUri!.AbsoluteUri);
    }

    [Fact]
    public async Task Fields_are_cut_to_the_schema_limits()
    {
        var long1 = new string('t', LinkReader.MaxTitle + 5);
        var long2 = new string('d', LinkReader.MaxDescription + 5);
        var (reader, _) = Create(_ => Html($"""<head><title>{long1}</title><meta name="description" content="{long2}"></head>"""));

        var read = await Read(reader);

        Assert.Equal(LinkReader.MaxTitle, read.Title!.Length);
        Assert.Equal(LinkReader.MaxDescription, read.Description!.Length);
    }

    [Fact]
    public async Task Something_that_is_not_a_page_says_so()
    {
        var (reader, _) = Create(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}", Encoding.UTF8, "application/pdf") });

        var read = await Read(reader);

        Assert.Equal("Bu bağlantı bir web sayfası değil. Alanları elle doldurabilirsin.", read.Error);
        Assert.Null(read.Title);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.InternalServerError)]
    public async Task An_error_status_is_a_failed_read_without_the_sites_text(HttpStatusCode status)
    {
        var (reader, _) = Create(_ => new HttpResponseMessage(status) { Content = new StringContent("site text") });

        Assert.Equal(new LinkRead(Url, LinkReader.SourcePage, null, null, null, Failed), await Read(reader));
    }

    [Fact]
    public async Task A_network_failure_is_a_failed_read()
    {
        var (reader, _) = Create(_ => throw new HttpRequestException("secret detail"));

        Assert.Equal(Failed, (await Read(reader)).Error);
    }

    [Fact]
    public async Task Too_large_a_body_is_a_failed_read()
    {
        var body = new byte[LinkReader.MaxBytes + 1];
        var (reader, _) = Create(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(new MemoryStream(body)) { Headers = { ContentType = new("text/html") } },
        });

        Assert.Equal(Failed, (await Read(reader)).Error);
    }

    [Fact]
    public async Task A_body_without_a_length_is_still_cut_off()
    {
        var body = new byte[LinkReader.MaxBytes + 1];
        var (reader, _) = Create(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new UnknownLengthContent(body) });

        Assert.Equal(Failed, (await Read(reader)).Error);
    }

    /// <summary>Content that doesn't say how long it is, like a chunked answer.</summary>
    private sealed class UnknownLengthContent(byte[] body) : HttpContent
    {
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => stream.WriteAsync(body).AsTask();

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }
    }

    [Fact]
    public async Task Follows_a_redirect_including_a_relative_one()
    {
        var (reader, handler) = Create(request => request.RequestUri!.AbsolutePath switch
        {
            "/a" => Redirect("/b"),
            "/b" => Redirect("https://other.example/c"),
            _ => Html("<head><title>End</title></head>"),
        });

        var read = await Read(reader);

        Assert.Equal("End", read.Title);
        Assert.Equal(Url, read.Url);
        Assert.Equal(["https://example.com/a", "https://example.com/b", "https://other.example/c"], handler.Requests.Select(r => r.RequestUri!.AbsoluteUri));
    }

    [Theory]
    [InlineData("https://127.0.0.1/")]
    [InlineData("https://localhost/admin")]
    [InlineData("https://169.254.169.254/latest/meta-data/")]
    [InlineData("http://example.com/")]
    [InlineData("https://example.com:8443/")]
    public async Task A_redirect_to_an_address_that_may_not_be_read_is_never_requested(string target)
    {
        var (reader, handler) = Create(_ => Redirect(target));

        Assert.Equal(Failed, (await Read(reader)).Error);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task Stops_after_three_redirects()
    {
        var count = 0;
        var (reader, handler) = Create(_ => Redirect($"https://example.com/{++count}"));

        Assert.Equal(Failed, (await Read(reader)).Error);
        Assert.Equal(LinkReader.MaxRedirects + 1, handler.Requests.Count);
    }

    [Theory]
    [InlineData("http://example.com/")]
    [InlineData("https://127.0.0.1/")]
    [InlineData("not a url")]
    [InlineData("")]
    public async Task A_bad_address_is_a_field_error_and_nothing_is_requested(string url)
    {
        var (reader, handler) = Create(_ => Html(""));

        var error = await Assert.ThrowsAsync<ValidationException>(() => Read(reader, url));

        Assert.Equal([LinkAddress.Error], error.Errors["url"]);
        Assert.Empty(handler.Requests);
    }

    private const string OEmbed = """{ "title": "Video title", "author_name": "Channel" }""";

    private static HttpResponseMessage Json(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static HttpResponseMessage Status(HttpStatusCode status) => new(status);

    private static bool IsOEmbed(HttpRequestMessage request) => request.RequestUri!.AbsolutePath == "/oembed";

    private const string WatchPage = """<head><title>Page title</title><meta property="og:description" content="Video description"></head>""";

    [Fact]
    public async Task A_video_gets_its_fields_from_oembed_and_the_page()
    {
        var (reader, handler) = Create(request => IsOEmbed(request) ? Json(OEmbed) : Html(WatchPage));

        var read = await Read(reader, "https://youtu.be/abc123DEF_4?t=3");

        Assert.Equal(new LinkRead(Watch, LinkReader.SourceYouTube, "Video title", "Channel", "Video description", null), read);
        Assert.Equal(2, handler.Requests.Count);
    }

    [Fact]
    public async Task A_failed_watch_page_is_not_an_error()
    {
        var (reader, _) = Create(request => IsOEmbed(request) ? Json(OEmbed) : Status(HttpStatusCode.Forbidden));

        Assert.Equal(new LinkRead(Watch, LinkReader.SourceYouTube, "Video title", "Channel", null, null), await Read(reader, Watch));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task A_failed_oembed_uses_the_pages_title(bool badJson)
    {
        var (reader, _) = Create(request => !IsOEmbed(request) ? Html(WatchPage) : badJson ? Json("[]") : Status(HttpStatusCode.NotFound));

        Assert.Equal(new LinkRead(Watch, LinkReader.SourceYouTube, "Page title", null, "Video description", null), await Read(reader, Watch));
    }

    [Fact]
    public async Task Both_failed_is_a_failed_read()
    {
        var (reader, _) = Create(_ => Status(HttpStatusCode.NotFound));

        Assert.Equal(new LinkRead(Watch, LinkReader.SourceYouTube, null, null, null, Failed), await Read(reader, Watch));
    }
}

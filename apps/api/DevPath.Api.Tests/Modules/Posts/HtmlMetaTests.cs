using DevPath.Api.Modules.Posts;

namespace DevPath.Api.Tests.Modules.Posts;

public sealed class HtmlMetaTests
{
    [Fact]
    public void Open_graph_wins_over_the_other_tags()
    {
        var meta = HtmlMeta.Parse("""
            <html><head><title>Tag title</title>
            <meta name="description" content="Plain description">
            <meta name="twitter:title" content="Twitter title">
            <meta property="og:title" content="OG title">
            <meta property="og:description" content="OG description">
            <meta property="og:site_name" content="Site">
            <meta name="author" content="Ada">
            </head></html>
            """);

        Assert.Equal(new PageMeta("OG title", "Ada", "OG description"), meta);
    }

    [Fact]
    public void Falls_back_along_the_order()
    {
        var meta = HtmlMeta.Parse("""
            <head><title>Tag title</title>
            <meta name="description" content="Plain description">
            <meta property="og:site_name" content="Site"></head>
            """);

        Assert.Equal(new PageMeta("Tag title", "Site", "Plain description"), meta);
    }

    [Theory]
    [InlineData("""<meta content="Yes" property="og:title">""")]
    [InlineData("""<meta property='og:title' content='Yes'>""")]
    [InlineData("""<META PROPERTY="og:title" CONTENT="Yes" />""")]
    [InlineData("""<meta property=og:title content=Yes>""")]
    [InlineData("""<meta data-name="x" property="og:title" data-content="No" content="Yes">""")]
    public void Reads_any_attribute_form(string tag) =>
        Assert.Equal("Yes", HtmlMeta.Parse($"<head>{tag}</head>").Title);

    [Fact]
    public void Decodes_entities_and_collapses_whitespace()
    {
        var meta = HtmlMeta.Parse("<head><title>\n  Tom &amp; Jerry\n  &#39;s  </title></head>");

        Assert.Equal("Tom & Jerry 's", meta.Title);
    }

    [Fact]
    public void A_closing_angle_bracket_in_a_quoted_value_is_fine() =>
        Assert.Equal("a > b", HtmlMeta.Parse("""<head><meta name="description" content="a > b"></head>""").Description);

    [Fact]
    public void Nothing_past_the_head_is_read()
    {
        var meta = HtmlMeta.Parse("""<head><title>T</title></head><body><meta name="description" content="Body"></body>""");

        Assert.Null(meta.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not html at all")]
    [InlineData("<head><title>   </title><meta name=\"description\" content=\"  \"><meta content=\"no name\"></head>")]
    public void Junk_gives_empty_fields(string html) => Assert.Equal(PageMeta.Empty, HtmlMeta.Parse(html));

    [Fact]
    public void Hostile_markup_ends_quickly()
    {
        var html = "<head>" + string.Concat(Enumerable.Repeat("<meta '", 50_000));

        Assert.Equal(PageMeta.Empty, HtmlMeta.Parse(html));
    }
}

using System.Text.Json.Nodes;
using DevPath.Api.Modules.Home;

namespace DevPath.Api.Tests.Modules.Home;

public class FeedValidatorTests
{
    private static FeedValidation Validate(string json) => FeedValidator.Validate(JsonNode.Parse(json));

    [Fact]
    public void Valid_feed_gives_trimmed_items()
    {
        var result = Validate("""
            {
              "schemaVersion": 1,
              "generatedAt": "2026-11-06T07:00:00Z",
              "items": [
                { "title": "  .NET 10 ", "summary": "Yeni sürüm.", "url": "https://x.com/a/1", "source": "dotnet", "publishedAt": "2026-11-05T20:00:00+03:00" },
                { "title": "Only required", "summary": "Kısa." }
              ]
            }
            """);

        Assert.Empty(result.Errors);
        Assert.Equal(new DateTimeOffset(2026, 11, 6, 7, 0, 0, TimeSpan.Zero), result.GeneratedAt);
        Assert.Equal(
            [
                new FeedItem(".NET 10", "Yeni sürüm.", "https://x.com/a/1", "dotnet", new DateTimeOffset(2026, 11, 5, 20, 0, 0, TimeSpan.FromHours(3))),
                new FeedItem("Only required", "Kısa.", null, null, null),
            ],
            result.Items);
    }

    [Fact]
    public void Each_broken_rule_gives_a_line_with_its_path()
    {
        var result = Validate($$"""
            {
              "schemaVersion": 2,
              "extra": true,
              "items": [
                { "summary": "x" },
                { "title": "a", "summary": "x", "url": "http://x.com" },
                { "title": " ", "summary": 5 },
                { "title": "{{new string('t', 201)}}", "summary": "x", "publishedAt": "2026-11-06" },
                "text",
                { "title": "a", "summary": "x", "image": "y" }
              ]
            }
            """);

        Assert.Equal(
            [
                "extra: Bilinmeyen alan.",
                "schemaVersion: 1 olmalı.",
                "generatedAt: Tarih-saat olmalı (ör. 2026-11-06T07:00:00Z).",
                "items[0].title: Başlık gerekli.",
                "items[1].url: https:// ile başlayan bir adres olmalı.",
                "items[2].title: Başlık boş olamaz.",
                "items[2].summary: Metin olmalı.",
                "items[3].title: Başlık en fazla 200 karakter olabilir.",
                "items[3].publishedAt: Tarih-saat olmalı (ör. 2026-11-06T07:00:00Z).",
                "items[4]: Bir nesne olmalı.",
                "items[5].image: Bilinmeyen alan.",
            ],
            result.Errors);
        Assert.Empty(result.Items);
        Assert.Null(result.GeneratedAt);
    }

    [Fact]
    public void Root_must_be_an_object_with_an_items_list()
    {
        Assert.Equal(["$: Dosya bir JSON nesnesi olmalı."], Validate("[]").Errors);
        Assert.Equal(
            ["items: Bir liste olmalı."],
            Validate("""{ "schemaVersion": 1, "generatedAt": "2026-11-06T07:00:00Z", "items": {} }""").Errors);
    }

    [Fact]
    public void Too_many_items_and_errors_are_capped()
    {
        var ok = string.Join(",", Enumerable.Repeat("""{ "title": "a", "summary": "b" }""", 201));
        var tooMany = Validate($$"""{ "schemaVersion": 1, "generatedAt": "2026-11-06T07:00:00Z", "items": [{{ok}}] }""");
        Assert.Equal(["items: En fazla 200 öğe olabilir."], tooMany.Errors);

        var broken = string.Join(",", Enumerable.Repeat("{}", 30));
        var many = Validate($$"""{ "schemaVersion": 1, "generatedAt": "2026-11-06T07:00:00Z", "items": [{{broken}}] }""");
        Assert.Equal(FeedValidator.MaxErrors, many.Errors.Count);
    }
}

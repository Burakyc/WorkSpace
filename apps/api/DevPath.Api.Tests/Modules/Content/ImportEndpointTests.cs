using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ImportEndpointTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    [Fact]
    public async Task Validate_lists_errors_with_lines()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/import/validate", new { type = "vocab", text = "{\n  \"schemaVersion\": 1,\n  \"x\": 1\n}" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var errors = (await Json(response)).GetProperty("errors").EnumerateArray().ToList();
        Assert.Contains(errors, e =>
            e.GetProperty("path").GetString() == "/x" &&
            e.GetProperty("line").GetInt32() == 3 &&
            e.GetProperty("message").GetString() == "Bilinmeyen alan: x");
        Assert.Empty((await Json(await client.PostAsJsonAsync("/api/import/validate", new { type = "vocab", text = ImportSamples.Vocab() })))
            .GetProperty("errors").EnumerateArray());
        Assert.False(Directory.Exists(Path.Combine(factory.DataDir, "content")));
    }

    [Fact]
    public async Task Import_saves_then_reports_skipped_items()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var first = await Json(await client.PostAsJsonAsync("/api/import", new { type = "vocab", text = ImportSamples.Vocab(terms: ["a", "b"]) }));
        var second = await Json(await client.PostAsJsonAsync("/api/import", new { type = "vocab", text = ImportSamples.Vocab(terms: ["b", "c"]) }));

        Assert.Equal(2, first.GetProperty("report").GetProperty("added").GetInt32());
        Assert.True(first.GetProperty("report").GetProperty("created").GetBoolean());
        var report = second.GetProperty("report");
        Assert.Equal((1, 1, false), (report.GetProperty("added").GetInt32(), report.GetProperty("skipped").GetInt32(), report.GetProperty("created").GetBoolean()));
        Assert.Equal("phrasal-verbs-for-meetings", report.GetProperty("slug").GetString());
        Assert.Empty(second.GetProperty("errors").EnumerateArray());
        Assert.True(File.Exists(Path.Combine(factory.DataDir, "content", "english", "phrasal-verbs-for-meetings.json")));
    }

    [Fact]
    public async Task Invalid_imports_answer_errors_and_no_report()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var body = await Json(await client.PostAsJsonAsync("/api/import", new { type = "vocab", text = "not json" }));

        Assert.Equal(JsonValueKind.Null, body.GetProperty("report").ValueKind);
        Assert.Equal(1, body.GetProperty("errors")[0].GetProperty("line").GetInt32());
    }

    [Fact]
    public async Task An_unknown_type_is_a_bad_request()
    {
        await using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/import", new { type = "x", text = "{}" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True((await Json(response)).GetProperty("errors").TryGetProperty("type", out _));
    }
}

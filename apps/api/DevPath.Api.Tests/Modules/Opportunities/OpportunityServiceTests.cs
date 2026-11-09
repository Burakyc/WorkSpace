using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Opportunities;
using DevPath.Api.Tests.Infrastructure.Storage;

namespace DevPath.Api.Tests.Modules.Opportunities;

public sealed class OpportunityServiceTests : IDisposable
{
    private readonly TempFolder _folder = new();
    private readonly OpportunityService _service;

    public OpportunityServiceTests() => _service = new OpportunityService(new JsonFileStore(new DataDirectory(_folder.Path)));

    public void Dispose() => _folder.Dispose();

    private string SettingsPath => _folder.File("settings.json");

    private Task<IReadOnlyList<OpportunitySite>> List() => _service.ListSitesAsync(CancellationToken.None);

    private Task<OpportunitySite> Add(string? url, string? name = null) =>
        _service.AddSiteAsync(new OpportunitySiteInput(name, url), CancellationToken.None);

    private Task<bool> Remove(string id) => _service.RemoveSiteAsync(id, CancellationToken.None);

    private async Task<string> AddError(string field, string? url, string? name = null)
    {
        var error = await Assert.ThrowsAsync<ValidationException>(() => Add(url, name));
        return Assert.Single(error.Errors[field]);
    }

    private JsonObject ReadSettings() => JsonNode.Parse(File.ReadAllText(SettingsPath))!.AsObject();

    private static string[] Ids(IEnumerable<OpportunitySite> sites) => sites.Select(s => s.Id).ToArray();

    private static readonly string[] DefaultIds = ["youthall.com", "anbean.com.tr", "coderspace.io", "patika.dev"];

    [Fact]
    public async Task Without_a_file_the_defaults_are_shown_and_nothing_is_written()
    {
        Assert.Equal(OpportunitySite.Defaults, await List());
        Assert.Equal(DefaultIds, Ids(await List()));
        Assert.False(File.Exists(SettingsPath));
    }

    [Fact]
    public async Task Without_a_section_the_defaults_are_shown_and_the_file_is_unchanged()
    {
        File.WriteAllText(SettingsPath, """{"schemaVersion":1,"theme":"dark"}""");

        Assert.Equal(DefaultIds, Ids(await List()));
        Assert.Equal("""{"schemaVersion":1,"theme":"dark"}""", File.ReadAllText(SettingsPath));
    }

    [Fact]
    public async Task Broken_entries_are_skipped()
    {
        File.WriteAllText(SettingsPath, """
            {"schemaVersion":1,"opportunities":{"sites":[
              {"id":"kariyer.net","name":"","url":"https://kariyer.net/"},
              42,
              {"id":"x.com","name":"X","url":"http://x.com/"},
              {"id":"other.com","name":"Y","url":"https://y.com/"},
              {"name":"no id"}
            ]}}
            """);

        var site = Assert.Single(await List());
        Assert.Equal(new OpportunitySite("kariyer.net", "", "https://kariyer.net/"), site);
    }

    [Fact]
    public async Task Adding_saves_the_defaults_and_the_new_site()
    {
        var site = await Add(" kariyer.net ");

        Assert.Equal(new OpportunitySite("kariyer.net", "", "https://kariyer.net/"), site);
        Assert.Equal(DefaultIds.Append("kariyer.net"), Ids(await List()));
        var saved = ReadSettings()["opportunities"]!["sites"]!.AsArray();
        Assert.Equal(5, saved.Count);
        Assert.Equal(["id", "name", "url"], saved[4]!.AsObject().Select(p => p.Key));

        var named = await Add("https://www.youthall.com.tr/jobs", "  Youthall TR ");
        Assert.Equal(new OpportunitySite("youthall.com.tr", "Youthall TR", "https://www.youthall.com.tr/jobs"), named);
    }

    [Fact]
    public async Task Adding_refuses_bad_urls_long_names_duplicates_and_the_31st_site()
    {
        Assert.Equal(OpportunitySiteUrl.HttpsError, await AddError("url", "http://example.com"));
        Assert.Equal("Ad en fazla 60 karakter olabilir.", await AddError("name", "example.com", new string('a', 61)));
        await Add("example.com", new string('a', 60));

        Assert.Equal("Bu site zaten ekli.", await AddError("url", "patika.dev"));
        Assert.Equal("Bu site zaten ekli.", await AddError("url", "https://www.patika.dev/kurslar"));

        for (var i = (await List()).Count; i < OpportunityService.MaxSites; i++)
        {
            await Add($"site{i}.com");
        }
        Assert.Equal("En fazla 30 site eklenebilir.", await AddError("url", "one-more.com"));
        Assert.Equal(30, (await List()).Count);
    }

    [Fact]
    public async Task Removing_a_default_saves_the_other_three()
    {
        Assert.True(await Remove("anbean.com.tr"));

        Assert.Equal(new[] { "youthall.com", "coderspace.io", "patika.dev" }, Ids(await List()));
        Assert.Equal(3, ReadSettings()["opportunities"]!["sites"]!.AsArray().Count);
    }

    [Fact]
    public async Task Removing_every_site_stays_empty()
    {
        foreach (var id in DefaultIds)
        {
            Assert.True(await Remove(id));
        }

        Assert.Empty(await List());
        Assert.Empty(ReadSettings()["opportunities"]!["sites"]!.AsArray());
        Assert.Empty(await List());
    }

    [Fact]
    public async Task Removing_an_unknown_id_is_false_and_writes_nothing()
    {
        Assert.False(await Remove("nope.com"));
        Assert.False(File.Exists(SettingsPath));
    }

    [Fact]
    public async Task Other_settings_sections_are_untouched()
    {
        File.WriteAllText(SettingsPath, """{"schemaVersion":1,"theme":"dark","youtube":{"channels":[{"id":"UC1","title":"T"}]}}""");

        await Add("kariyer.net");
        await Remove("patika.dev");

        var settings = ReadSettings();
        Assert.Equal("dark", settings["theme"]!.GetValue<string>());
        Assert.Equal("T", settings["youtube"]!["channels"]![0]!["title"]!.GetValue<string>());
    }
}

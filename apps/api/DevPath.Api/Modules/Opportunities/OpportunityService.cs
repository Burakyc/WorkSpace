using System.Text.Json;
using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Settings;

namespace DevPath.Api.Modules.Opportunities;

/// <summary>
/// The followed opportunity sites (settings.json, section "opportunities"). Links only: nothing here reads the sites.
/// Without a saved list the defaults are shown; the first add or remove saves the whole list.
/// </summary>
public sealed class OpportunityService(JsonFileStore store)
{
    public const int MaxSites = 30;
    public const int MaxNameLength = 60;
    private const string Section = "opportunities";

    public async Task<IReadOnlyList<OpportunitySite>> ListSitesAsync(CancellationToken cancellationToken) =>
        ReadSites(await store.ReadAsync(SettingsService.FileName, SettingsService.Schema, cancellationToken));

    public async Task<OpportunitySite> AddSiteAsync(OpportunitySiteInput input, CancellationToken cancellationToken)
    {
        var name = (input.Name ?? "").Trim();
        var url = OpportunitySiteUrl.Parse(input.Url, out var urlError);
        var errors = new Dictionary<string, string[]>();
        if (url is null)
        {
            errors["url"] = [urlError];
        }
        if (name.Length > MaxNameLength)
        {
            errors["name"] = [$"Ad en fazla {MaxNameLength} karakter olabilir."];
        }
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var site = new OpportunitySite(OpportunitySiteUrl.Id(url!), name, url!.AbsoluteUri);
        await store.UpdateAsync(SettingsService.FileName, SettingsService.Schema, document =>
        {
            var sites = ReadSites(document);
            if (sites.Any(s => s.Id == site.Id))
            {
                throw UrlError("Bu site zaten ekli.");
            }
            if (sites.Count >= MaxSites)
            {
                throw UrlError($"En fazla {MaxSites} site eklenebilir.");
            }
            return Save(document, [.. sites, site]);
        }, cancellationToken);
        return site;
    }

    /// <summary>Removes the site; false when no site has that id.</summary>
    public async Task<bool> RemoveSiteAsync(string id, CancellationToken cancellationToken)
    {
        var removed = false;
        await store.UpdateAsync(SettingsService.FileName, SettingsService.Schema, document =>
        {
            var sites = ReadSites(document);
            if (!sites.Any(s => s.Id == id))
            {
                return null;
            }
            removed = true;
            return Save(document, sites.Where(s => s.Id != id).ToList());
        }, cancellationToken);
        return removed;
    }

    private static JsonObject Save(JsonObject? document, IReadOnlyList<OpportunitySite> sites)
    {
        document ??= new JsonObject();
        document[Section] = new JsonObject { ["sites"] = JsonSerializer.SerializeToNode(sites, StorageJson.Options) };
        return document;
    }

    /// <summary>The saved sites, or the defaults when there is no readable list. Broken entries are skipped.</summary>
    private static List<OpportunitySite> ReadSites(JsonObject? settings)
    {
        if (settings?[Section] is not JsonObject section || section["sites"] is not JsonArray entries)
        {
            return [.. OpportunitySite.Defaults];
        }
        return entries.Select(ReadSite).OfType<OpportunitySite>().ToList();
    }

    private static OpportunitySite? ReadSite(JsonNode? entry)
    {
        try
        {
            var site = entry?.Deserialize<OpportunitySite>(StorageJson.Options);
            var url = OpportunitySiteUrl.Parse(site?.Url, out _);
            return site is null || url is null || site.Id != OpportunitySiteUrl.Id(url)
                ? null
                : site with { Name = site.Name ?? "" };
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException)
        {
            return null;
        }
    }

    private static ValidationException UrlError(string message) => new(new Dictionary<string, string[]> { ["url"] = [message] });
}

namespace DevPath.Api.Modules.Opportunities;

/// <summary>A followed opportunity site. <see cref="Id"/> is the lower-case host without <c>www.</c>; <see cref="Name"/> may be empty.</summary>
public sealed record OpportunitySite(string Id, string Name, string Url)
{
    /// <summary>Shown until the user first adds or removes a site.</summary>
    public static readonly IReadOnlyList<OpportunitySite> Defaults =
    [
        new("youthall.com", "Youthall", "https://youthall.com/"),
        new("anbean.com.tr", "Anbean", "https://anbean.com.tr/"),
        new("coderspace.io", "Coderspace", "https://coderspace.io/"),
        new("patika.dev", "Patika.dev", "https://patika.dev/"),
    ];
}

public sealed record OpportunitySiteInput(string? Name, string? Url);

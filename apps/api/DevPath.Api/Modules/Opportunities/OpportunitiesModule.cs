namespace DevPath.Api.Modules.Opportunities;

/// <summary>Opportunity sites: links only, so no HTTP client is registered.</summary>
public static class OpportunitiesModule
{
    public static IServiceCollection AddOpportunities(this IServiceCollection services) =>
        services.AddSingleton<OpportunityService>();
}

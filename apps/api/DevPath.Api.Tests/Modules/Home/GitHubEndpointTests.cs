using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DevPath.Api.Modules.Home;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace DevPath.Api.Tests.Modules.Home;

public class GitHubEndpointTests
{
    [Fact]
    public async Task Stats_round_trip_and_no_response_contains_the_token()
    {
        await using var factory = new ApiFactory();
        var github = new FakeGitHub();
        var client = factory.WithWebHostBuilder(builder =>
            {
                builder.UseSetting(GitHubClient.TokenSetting, FakeGitHub.Token);
                builder.ConfigureTestServices(services =>
                    services.AddHttpClient(GitHubClient.ClientName).ConfigurePrimaryHttpMessageHandler(() => github.Handler));
            })
            .CreateClient();
        var bodies = new List<string>();

        var saved = await client.PutAsJsonAsync("/api/github/settings", new { username = "octo" });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        bodies.Add(await saved.Content.ReadAsStringAsync());
        var stats = JsonDocument.Parse(bodies[^1]).RootElement;
        Assert.Equal("octo", stats.GetProperty("username").GetString());
        Assert.Equal(7, stats.GetProperty("stats").GetProperty("stars").GetInt32());
        Assert.Equal("octo/app", stats.GetProperty("stats").GetProperty("recentCommits")[0].GetProperty("repo").GetString());

        bodies.Add(await client.GetStringAsync("/api/github/settings"));
        bodies.Add(await client.GetStringAsync("/api/github/stats"));
        github.FailWith = HttpStatusCode.Unauthorized;
        var refreshed = await client.PostAsync("/api/github/refresh", null);
        bodies.Add(await refreshed.Content.ReadAsStringAsync());
        Assert.Equal("GitHub token geçersiz. Ayarlar'dan sil ya da yenile.", JsonDocument.Parse(bodies[^1]).RootElement.GetProperty("error").GetString());

        var invalid = await client.PutAsJsonAsync("/api/github/settings", new { username = "-bad" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        bodies.Add(await invalid.Content.ReadAsStringAsync());

        Assert.All(github.Handler.Requests, r => Assert.Equal($"Bearer {FakeGitHub.Token}", r.Headers.Authorization?.ToString()));
        Assert.All(bodies, body => Assert.DoesNotContain(FakeGitHub.Token, body, StringComparison.Ordinal));
        Assert.All(
            Directory.GetFiles(factory.DataDir, "*", SearchOption.AllDirectories),
            file => Assert.DoesNotContain(FakeGitHub.Token, File.ReadAllText(file), StringComparison.Ordinal));
    }
}

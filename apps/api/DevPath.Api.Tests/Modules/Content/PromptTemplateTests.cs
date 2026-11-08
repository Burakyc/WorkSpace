using System.Text.RegularExpressions;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Tests.Modules.Content;

/// <summary>Keeps prompts/&lt;type&gt;.md in step with schemas/: the example each template shows must import.</summary>
public sealed partial class PromptTemplateTests
{
    [GeneratedRegex("```json\\r?\\n(.*?)```", RegexOptions.Singleline)]
    private static partial Regex JsonBlock();

    [Theory]
    [InlineData("vocab")]
    [InlineData("lesson")]
    [InlineData("interview")]
    [InlineData("post")]
    public void The_example_in_each_template_passes_its_schema(string type)
    {
        var template = File.ReadAllText(Path.Combine(RepoRoot(), "prompts", $"{type}.md"));
        var example = JsonBlock().Match(template);

        Assert.StartsWith("Topic:", template, StringComparison.Ordinal);
        Assert.True(example.Success);
        Assert.Empty(ImportValidator.Validate(ContentType.Find(type)!, example.Groups[1].Value).Errors);
    }

    private static string RepoRoot()
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !Directory.Exists(Path.Combine(folder.FullName, "prompts")))
        {
            folder = folder.Parent;
        }

        return folder?.FullName ?? throw new DirectoryNotFoundException("No prompts/ folder above the test output.");
    }
}

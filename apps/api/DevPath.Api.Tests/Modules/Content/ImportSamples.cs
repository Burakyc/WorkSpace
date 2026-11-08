using System.Text.Json;

namespace DevPath.Api.Tests.Modules.Content;

/// <summary>Valid import documents for tests, written one property per line so line numbers are easy to check.</summary>
public static class ImportSamples
{
    public static string Vocab(string topic = "Phrasal verbs for meetings", string level = "B2", string[]? tags = null, params string[] terms) =>
        Indent(new
        {
            schemaVersion = 1,
            type = "vocab",
            topic,
            level,
            tags = tags ?? ["English", "#work"],
            items = (terms.Length == 0 ? ["follow up on"] : terms)
                .Select(term => new { term, meaning = $"{term} anlamı", example = $"Let's {term}." }),
        });

    public static string Post(string title = "What DI taught me", string body = "A post.") =>
        Indent(new
        {
            schemaVersion = 1,
            type = "post",
            topic = "Todo API",
            items = new[]
            {
                new
                {
                    title,
                    body,
                    hashtags = new[] { "#aspnetcore", "learning" },
                    sourceLink = "https://github.com/me/todo",
                    imageSuggestion = "A screenshot",
                },
            },
        });

    public static string Lesson() =>
        Indent(new
        {
            schemaVersion = 1,
            type = "lesson",
            topic = "Dependency injection",
            level = "beginner",
            items = new object[]
            {
                new { title = "Why DI", summary = "s", body = "b" },
                new { title = "Lifetimes", summary = "s", body = "b", exercises = new[] { "Register a scoped service." } },
            },
        });

    public static string Interview() =>
        Indent(new
        {
            schemaVersion = 1,
            type = "interview",
            topic = "ASP.NET Core",
            level = "intermediate",
            tags = new[] { "backend" },
            items = new object[]
            {
                new { question = "What is middleware?", answer = "a", difficulty = "easy" },
                new { question = "Scoped vs singleton?", answer = "a", difficulty = "medium", code = "services.AddScoped<X>();", tags = new[] { "DI" } },
            },
        });

    private static string Indent(object value) => JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true });
}

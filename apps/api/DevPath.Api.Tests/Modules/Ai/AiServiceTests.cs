using System.Text.Json.Nodes;
using DevPath.Api.Infrastructure.Storage;
using DevPath.Api.Modules.Ai;
using DevPath.Api.Modules.Content;
using DevPath.Api.Tests.Infrastructure.Storage;
using DevPath.Api.Tests.Modules.Content;
using Microsoft.Extensions.Configuration;

namespace DevPath.Api.Tests.Modules.Ai;

public sealed class AiServiceTests : IDisposable
{
    private const string TopicFile = "content/english/phrasal-verbs-for-meetings.json";

    private readonly TempFolder _data = new();
    private readonly FakeProvider _claude = new();
    private readonly AiService _service;

    public AiServiceTests()
    {
        var time = new FixedTimeProvider(new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero));
        _service = new AiService(
            [_claude],
            new ImportService(new JsonFileStore(new DataDirectory(_data.Path)), time),
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DEVPATH_ANTHROPIC_API_KEY"] = "k" }).Build());
    }

    public void Dispose() => _data.Dispose();

    private sealed class FakeProvider : IAiProviderClient
    {
        public AiAnswer Answer { get; set; } = new("", 0, 0, null);

        public List<string> Prompts { get; } = [];

        public string ProviderId => AiProviders.Claude;

        public Task<AiAnswer> AskAsync(string prompt, CancellationToken cancellationToken)
        {
            Prompts.Add(prompt);
            return Task.FromResult(Answer);
        }
    }

    [Fact]
    public async Task A_post_answer_is_saved_as_a_draft_and_an_invalid_one_is_not()
    {
        _claude.Answer = new AiAnswer("""{ "type": "post" }""", 1, 1, null);
        var invalid = await _service.RunAsync("claude", "post", "the prompt", default);
        Assert.NotEmpty(invalid.Errors);
        Assert.False(File.Exists(_data.File("posts.json")));

        _claude.Answer = new AiAnswer(ImportSamples.Post(), 1, 1, null);
        var valid = await _service.RunAsync("claude", "post", "the prompt", default);
        Assert.Equal(1, valid.Report!.Added);
        Assert.True(File.Exists(_data.File("posts.json")));
    }

    [Fact]
    public async Task A_valid_answer_is_saved_with_its_usage_and_cost()
    {
        _claude.Answer = new AiAnswer(ImportSamples.Vocab(terms: ["follow up on", "touch base"]), 1_000, 2_000, null);

        var result = await _service.RunAsync("claude", "vocab", "the prompt", default);

        Assert.Null(result.Error);
        Assert.Empty(result.Errors);
        Assert.Equal(2, result.Report!.Added);
        Assert.Equal(new AiUsage(1_000, 2_000, 0.044m), result.Usage);
        Assert.Equal(_claude.Answer.Text, result.Output);
        Assert.Equal(["the prompt"], _claude.Prompts);
        Assert.True(File.Exists(_data.File(TopicFile)));
    }

    [Fact]
    public async Task A_fenced_answer_is_handled_like_any_import()
    {
        _claude.Answer = new AiAnswer("```json\n" + ImportSamples.Vocab() + "\n```", 1, 1, null);

        var result = await _service.RunAsync("claude", "vocab", "p", default);

        Assert.NotNull(result.Report);
    }

    [Theory]
    [InlineData("Üzgünüm, JSON yazamıyorum.")]
    [InlineData("""{ "schemaVersion": 1, "type": "vocab", "topic": "T", "level": "B2", "items": [{ "term": "x" }] }""")]
    [InlineData("""{ "schemaVersion": 1, "type": "lesson", "topic": "T", "level": "beginner", "items": [{ "title": "t", "summary": "s", "body": "b" }] }""")]
    public async Task Invalid_output_is_never_saved(string text)
    {
        _claude.Answer = new AiAnswer(text, 10, 20, null);

        var result = await _service.RunAsync("claude", "vocab", "p", default);

        Assert.NotEmpty(result.Errors);
        Assert.Null(result.Report);
        Assert.Equal(text, result.Output);
        Assert.NotNull(result.Usage);
        Assert.False(Directory.Exists(_data.File("content")));
    }

    [Fact]
    public async Task A_cut_off_answer_is_reported_and_not_imported_even_when_it_is_valid()
    {
        _claude.Answer = new AiAnswer(ImportSamples.Vocab(), 10, 16_000, AiConnection.CutOff);

        var result = await _service.RunAsync("claude", "vocab", "p", default);

        Assert.Equal(AiConnection.CutOff, result.Error);
        Assert.Null(result.Report);
        Assert.NotNull(result.Usage);
        Assert.False(Directory.Exists(_data.File("content")));
    }

    [Fact]
    public async Task A_failed_call_has_no_usage()
    {
        _claude.Answer = new AiAnswer(null, 0, 0, AiConnection.Unreachable);

        var result = await _service.RunAsync("claude", "vocab", "p", default);

        Assert.Equal(AiConnection.Unreachable, result.Error);
        Assert.Null(result.Usage);
    }

    [Fact]
    public async Task An_existing_topic_merges_without_touching_old_items()
    {
        _claude.Answer = new AiAnswer(ImportSamples.Vocab(terms: ["follow up on"]), 1, 1, null);
        await _service.RunAsync("claude", "vocab", "p", default);
        var firstId = JsonNode.Parse(File.ReadAllText(_data.File(TopicFile)))!["items"]![0]!["id"]!.GetValue<string>();

        _claude.Answer = new AiAnswer(ImportSamples.Vocab(terms: ["follow up on", "touch base"]), 1, 1, null);
        var result = await _service.RunAsync("claude", "vocab", "p", default);

        Assert.Equal(1, result.Report!.Added);
        Assert.Equal(1, result.Report.Skipped);
        var items = JsonNode.Parse(File.ReadAllText(_data.File(TopicFile)))!["items"]!.AsArray();
        Assert.Equal(firstId, items[0]!["id"]!.GetValue<string>());
        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task Without_a_key_nothing_is_called()
    {
        var result = await _service.RunAsync("gemini", "vocab", "p", default);

        Assert.Equal(AiConnection.NoKey, result.Error);
        Assert.Empty(_claude.Prompts);
    }
}

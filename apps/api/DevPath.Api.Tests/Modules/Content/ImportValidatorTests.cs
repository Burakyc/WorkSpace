using DevPath.Api.Modules.Content;
using DevPath.Api.Modules.Pomodoro;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ImportValidatorTests
{
    private static readonly ContentType Vocab = ContentType.Find("vocab")!;

    [Fact]
    public void Valid_documents_of_each_type_have_no_errors()
    {
        Assert.Empty(ImportValidator.Validate(Vocab, ImportSamples.Vocab()).Errors);
        Assert.Empty(ImportValidator.Validate(ContentType.Find("lesson")!, ImportSamples.Lesson()).Errors);
        Assert.Empty(ImportValidator.Validate(ContentType.Find("interview")!, ImportSamples.Interview()).Errors);
    }

    [Fact]
    public void A_valid_document_is_returned_parsed()
    {
        var result = ImportValidator.Validate(Vocab, ImportSamples.Vocab());

        Assert.Equal("Phrasal verbs for meetings", result.Document!["topic"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("```json\n{0}\n```")]
    [InlineData("  ```\r\n{0}\r\n```  \n")]
    public void A_surrounding_code_fence_is_accepted(string format)
    {
        var result = ImportValidator.Validate(Vocab, string.Format(format, ImportSamples.Vocab()));

        Assert.Empty(result.Errors);
    }

    [Fact]
    public void Lines_stay_right_inside_a_code_fence()
    {
        var text = "```json\n{\n  \"schemaVersion\": 1,\n  \"x\": 1\n}\n```";

        var errors = ImportValidator.Validate(Vocab, text).Errors;

        Assert.Contains(new ImportError("/x", 4, "Bilinmeyen alan: x"), errors);
    }

    [Fact]
    public void Schema_errors_have_turkish_messages_and_lines()
    {
        const string text = """
            {
              "schemaVersion": 1,
              "type": "vocab",
              "topic": "Meetings",
              "level": "Z9",
              "items": [
                {
                  "term": "follow up on",
                  "example": "Let's follow up."
                },
                {
                  "term": "x",
                  "meaning": 5,
                  "example": "e",
                  "q": "extra"
                }
              ]
            }
            """;

        var result = ImportValidator.Validate(Vocab, text);

        Assert.Null(result.Document);
        Assert.Equal(
            [
                new ImportError("/level", 5, "Şunlardan biri olmalı: A1, A2, B1, B2, C1, C2."),
                new ImportError("/items/0", 7, "Eksik alan: meaning"),
                new ImportError("/items/1/meaning", 13, "Metin olmalı."),
                new ImportError("/items/1/q", 15, "Bilinmeyen alan: q"),
            ],
            result.Errors);
    }

    [Fact]
    public void Limits_are_named_in_the_messages()
    {
        var longTerm = ImportValidator.Validate(Vocab, ImportSamples.Vocab(terms: new string('a', 101))).Errors;
        var noItems = ImportValidator.Validate(Vocab, ImportSamples.Vocab().Replace("\"items\": [", "\"items\": [], \"old\": [")).Errors;
        var blankTopic = ImportValidator.Validate(Vocab, ImportSamples.Vocab(topic: "   ")).Errors;
        var missingAll = ImportValidator.Validate(Vocab, "{}").Errors;

        Assert.Contains(longTerm, e => e.Path == "/items/0/term" && e.Message == "En fazla 100 karakter olabilir.");
        Assert.Contains(noItems, e => e.Path == "/items" && e.Message == "En az 1 öğe olmalı.");
        Assert.Contains(blankTopic, e => e.Path == "/topic" && e.Message == "Yalnızca boşluktan oluşamaz.");
        Assert.Equal([new ImportError("", 1, "Eksik alan: schemaVersion, type, topic, level, items")], missingAll);
    }

    [Fact]
    public void Another_type_is_rejected()
    {
        var errors = ImportValidator.Validate(Vocab, ImportSamples.Interview()).Errors;

        Assert.Contains(errors, e => e.Path == "/type" && e.Message == "Değer \"vocab\" olmalı.");
        Assert.DoesNotContain(errors, e => e.Message.StartsWith("Some ", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("", null, "JSON metni boş.")]
    [InlineData("  \n ", null, "JSON metni boş.")]
    [InlineData("{\n  \"a\": 1,\n  \"b\" 2\n}", 3, "Geçerli JSON değil. Bu satırı kontrol et.")]
    [InlineData("{\n  \"a\": 1,\n}", 3, "Geçerli JSON değil. Bu satırı kontrol et.")]
    [InlineData("{ // comment\n}", 1, "Geçerli JSON değil. Bu satırı kontrol et.")]
    [InlineData("<script>alert(1)</script>", 1, "Geçerli JSON değil. Bu satırı kontrol et.")]
    [InlineData("[1, 2]", 1, "JSON bir nesne olmalı.")]
    public void Text_that_is_not_a_json_object_gives_one_error(string text, int? line, string message)
    {
        var result = ImportValidator.Validate(Vocab, text);

        Assert.Equal([new ImportError("", line, message)], result.Errors);
    }

    [Fact]
    public void Duplicate_properties_are_rejected()
    {
        var errors = ImportValidator.Validate(Vocab, "{ \"a\": 1, \"a\": 2 }").Errors;

        Assert.Equal("Aynı alan iki kez yazılmış.", Assert.Single(errors).Message);
    }

    [Fact]
    public void Text_over_2_mb_is_rejected()
    {
        var text = ImportSamples.Vocab(topic: new string('x', ImportValidator.MaxBytes));

        var errors = ImportValidator.Validate(Vocab, text).Errors;

        Assert.Equal([new ImportError("", null, "Dosya 2 MB'tan büyük olamaz.")], errors);
    }

    [Fact]
    public void Tags_must_be_valid_once_normalized()
    {
        var errors = ImportValidator.Validate(Vocab, ImportSamples.Vocab(tags: ["ok", "c#"])).Errors;

        var error = Assert.Single(errors);
        Assert.Equal(("/tags/1", Tags.InvalidMessage), (error.Path, error.Message));
        Assert.NotNull(error.Line);
    }

    [Fact]
    public void Question_tags_are_checked_too()
    {
        var text = ImportSamples.Interview().Replace("\"DI\"", "\"c#\"");

        var errors = ImportValidator.Validate(ContentType.Find("interview")!, text).Errors;

        Assert.Equal(("/items/1/tags/0", Tags.InvalidMessage), (Assert.Single(errors).Path, errors[0].Message));
    }

    [Fact]
    public void A_topic_without_letters_or_digits_is_rejected()
    {
        var errors = ImportValidator.Validate(Vocab, ImportSamples.Vocab(topic: "!!!")).Errors;

        Assert.Equal(("/topic", "Konu adı en az bir harf veya rakam içermeli."), (Assert.Single(errors).Path, errors[0].Message));
    }
}

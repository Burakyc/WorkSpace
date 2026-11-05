using DevPath.Api.Modules.Notes;

namespace DevPath.Api.Tests.Modules.Notes;

public class SearchTextTests
{
    [Fact]
    public void Folds_case_and_turkish_letters_keeping_the_length()
    {
        const string text = "İSTANBUL Işık şçğöü ŞÇĞÖÜ";

        var folded = SearchText.Fold(text);

        Assert.Equal("istanbul isik scgou scgou", folded);
        Assert.Equal(text.Length, folded.Length);
    }

    [Fact]
    public void Splits_a_query_into_distinct_folded_words()
    {
        Assert.Equal(["dependency", "inj"], SearchText.Words("  Dependency   INJ dependency "));
    }
}

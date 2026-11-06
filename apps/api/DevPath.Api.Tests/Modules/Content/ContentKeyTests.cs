using DevPath.Api.Modules.Content;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class ContentKeyTests
{
    [Theory]
    [InlineData("  Follow  up ON ", "follow up on")]
    [InlineData("follow\tup\non", "follow up on")]
    [InlineData("Dependency İnjection", "dependency injection")]
    public void Key_ignores_case_spacing_and_turkish_letters(string value, string expected) =>
        Assert.Equal(expected, ContentKey.Key(value));

    [Theory]
    [InlineData("Phrasal verbs — İş toplantıları", "phrasal-verbs-is-toplantilari")]
    [InlineData("Café crème", "cafe-creme")]
    [InlineData("  ASP.NET Core: DI  ", "asp-net-core-di")]
    [InlineData("!!!", "")]
    public void Slug_keeps_letters_and_digits(string topic, string expected) =>
        Assert.Equal(expected, ContentKey.Slug(topic));

    [Fact]
    public void Slug_is_capped_without_a_trailing_dash()
    {
        var topic = new string('a', 79) + " bcd";

        var slug = ContentKey.Slug(topic);

        Assert.Equal(new string('a', 79), slug);
    }
}

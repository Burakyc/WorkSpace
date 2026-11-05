using DevPath.Api.Modules.Projects;

namespace DevPath.Api.Tests.Modules.Projects;

public class ProjectValidatorTests
{
    [Theory]
    [InlineData(null, false)]
    [InlineData("  ", false)]
    [InlineData("Todo API", true)]
    public void Title_is_required(string? title, bool valid)
    {
        Assert.Equal(valid, !ProjectValidator.ValidateFields(title, null).ContainsKey("title"));
    }

    [Fact]
    public void Title_may_have_120_characters()
    {
        Assert.Empty(ProjectValidator.ValidateFields(new string('a', 120), null));
        Assert.True(ProjectValidator.ValidateFields(new string('a', 121), null).ContainsKey("title"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("https://github.com/x")]
    [InlineData("  https://github.com/x  ")]
    public void Url_is_optional_https(string? url)
    {
        Assert.Empty(ProjectValidator.ValidateFields("x", url));
    }

    [Theory]
    [InlineData("http://github.com/x")]
    [InlineData("javascript:alert(1)")]
    [InlineData("github.com/x")]
    [InlineData("file:///C:/Windows")]
    [InlineData("https:no-host")]
    public void Other_urls_are_rejected(string url)
    {
        Assert.Equal(
            ["Bağlantı https:// ile başlayan geçerli bir adres olmalı."],
            ProjectValidator.ValidateFields("x", url)["url"]);
    }

    [Fact]
    public void Url_may_have_2048_characters()
    {
        var prefix = "https://github.com/";
        Assert.Empty(ProjectValidator.ValidateFields("x", prefix + new string('a', 2048 - prefix.Length)));
        Assert.Equal(
            ["Bağlantı en fazla 2048 karakter olabilir."],
            ProjectValidator.ValidateFields("x", prefix + new string('a', 2049 - prefix.Length))["url"]);
    }
}

using DevPath.Api.Modules.Goals;

namespace DevPath.Api.Tests.Modules.Goals;

public class GoalValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Title_is_required(string? title)
    {
        var errors = GoalValidator.Validate(new GoalInput(title, null, null));

        Assert.Equal(["Başlık gerekli."], errors["title"]);
    }

    [Fact]
    public void Title_may_have_120_characters_after_trimming()
    {
        Assert.Empty(GoalValidator.Validate(new GoalInput($"  {new string('a', 120)}  ", null, null)));
        Assert.True(GoalValidator.Validate(new GoalInput(new string('a', 121), null, null)).ContainsKey("title"));
    }

    [Fact]
    public void Description_may_have_1000_characters()
    {
        Assert.Empty(GoalValidator.Validate(new GoalInput("x", null, null)));
        Assert.Empty(GoalValidator.Validate(new GoalInput("x", new string('d', 1000), null)));
        Assert.Equal(
            ["Açıklama en fazla 1000 karakter olabilir."],
            GoalValidator.Validate(new GoalInput("x", new string('d', 1001), null))["description"]);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(1, true)]
    [InlineData(10_000, true)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    [InlineData(10_001, false)]
    public void Target_is_optional_and_in_range(int? target, bool valid)
    {
        var errors = GoalValidator.Validate(new GoalInput("x", null, target));

        Assert.Equal(valid, !errors.ContainsKey("targetPomodoros"));
    }

    [Fact]
    public void All_errors_are_reported_together()
    {
        var errors = GoalValidator.Validate(new GoalInput("", null, 0));

        Assert.Equal(["targetPomodoros", "title"], errors.Keys.Order());
    }
}

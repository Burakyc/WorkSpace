using System.Text;
using DevPath.Api.Modules.Content;

namespace DevPath.Api.Tests.Modules.Content;

public sealed class JsonLinesTests
{
    [Fact]
    public void Maps_every_value_to_the_line_where_it_starts()
    {
        const string json = """
            {
              "topic": "Meetings",
              "tags": ["a", "b"],
              "items": [
                {
                  "term": "follow up"
                },
                { "term": "x", "meaning": "y" }
              ],
              "a/b~c": 1
            }
            """;

        var lines = JsonLines.Map(Encoding.UTF8.GetBytes(json.ReplaceLineEndings("\r\n")));

        Assert.Equal(1, lines[""]);
        Assert.Equal(2, lines["/topic"]);
        Assert.Equal(3, lines["/tags"]);
        Assert.Equal(3, lines["/tags/1"]);
        Assert.Equal(4, lines["/items"]);
        Assert.Equal(5, lines["/items/0"]);
        Assert.Equal(6, lines["/items/0/term"]);
        Assert.Equal(8, lines["/items/1"]);
        Assert.Equal(8, lines["/items/1/meaning"]);
        Assert.Equal(10, lines["/a~1b~0c"]);
        Assert.False(lines.ContainsKey("/items/2"));
    }
}

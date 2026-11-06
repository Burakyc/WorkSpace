using System.Text.Json;

namespace DevPath.Api.Modules.Content;

/// <summary>Maps the JSON pointer of every value in a document to the 1-based line where the value starts.</summary>
public static class JsonLines
{
    /// <summary>Expects valid JSON (parse it first); the root is <c>""</c>, properties are escaped (<c>~0</c>, <c>~1</c>).</summary>
    public static IReadOnlyDictionary<string, int> Map(ReadOnlySpan<byte> json)
    {
        var newlines = new List<int>();
        for (var i = 0; i < json.Length; i++)
        {
            if (json[i] == (byte)'\n')
            {
                newlines.Add(i);
            }
        }

        var lines = new Dictionary<string, int>(StringComparer.Ordinal);
        var frames = new Stack<Frame>();
        var reader = new Utf8JsonReader(json);
        while (reader.Read())
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.PropertyName:
                    frames.Peek().Property = Escape(reader.GetString()!);
                    break;
                case JsonTokenType.EndObject or JsonTokenType.EndArray:
                    frames.Pop();
                    break;
                default:
                    var pointer = frames.Count == 0 ? "" : frames.Peek().Child();
                    lines[pointer] = LineAt(newlines, (int)reader.TokenStartIndex);
                    if (reader.TokenType is JsonTokenType.StartObject or JsonTokenType.StartArray)
                    {
                        frames.Push(new Frame(pointer, reader.TokenType == JsonTokenType.StartArray));
                    }

                    break;
            }
        }

        return lines;
    }

    private static int LineAt(List<int> newlines, int offset)
    {
        var index = newlines.BinarySearch(offset);
        return (index < 0 ? ~index : index) + 1;
    }

    private static string Escape(string name) => name.Replace("~", "~0").Replace("/", "~1");

    private sealed class Frame(string pointer, bool isArray)
    {
        private int _nextIndex;

        public string? Property { get; set; }

        public string Child() => isArray ? $"{pointer}/{_nextIndex++}" : $"{pointer}/{Property}";
    }
}

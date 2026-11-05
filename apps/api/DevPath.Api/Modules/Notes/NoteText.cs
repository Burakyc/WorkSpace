using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevPath.Api.Modules.Notes;

/// <summary>Plain text of a BlockNote document: one line per block, depth first. Unknown shapes are skipped.</summary>
public static class NoteText
{
    public static string Extract(JsonArray blocks)
    {
        var lines = new List<string>();
        AddBlocks(blocks, lines);
        return string.Join('\n', lines);
    }

    private static void AddBlocks(JsonArray blocks, List<string> lines)
    {
        foreach (var block in blocks.OfType<JsonObject>())
        {
            var text = new StringBuilder();
            AddContent(block["content"], text);
            var line = text.ToString().Trim();
            if (line.Length > 0)
            {
                lines.Add(line);
            }

            if (block["children"] is JsonArray children)
            {
                AddBlocks(children, lines);
            }
        }
    }

    /// <summary>Inline content: a string, an array of text/link items, or table content.</summary>
    private static void AddContent(JsonNode? content, StringBuilder text)
    {
        switch (content)
        {
            case JsonValue value when value.GetValueKind() == JsonValueKind.String:
                text.Append(value.GetValue<string>());
                break;
            case JsonArray items:
                foreach (var item in items.OfType<JsonObject>())
                {
                    AddInline(item, text);
                }

                break;
            case JsonObject { } table when table["rows"] is JsonArray rows:
                foreach (var cell in rows.OfType<JsonObject>().SelectMany(r => r["cells"] as JsonArray ?? []))
                {
                    // A cell is either inline content or { type: "tableCell", content: [...] }.
                    AddContent(cell is JsonObject cellObject ? cellObject["content"] : cell, text);
                    text.Append(' ');
                }

                break;
        }
    }

    private static void AddInline(JsonObject item, StringBuilder text)
    {
        if (item["text"] is JsonValue value && value.GetValueKind() == JsonValueKind.String)
        {
            text.Append(value.GetValue<string>());
        }
        else if (item["content"] is { } inner)
        {
            AddContent(inner, text);
        }
    }
}

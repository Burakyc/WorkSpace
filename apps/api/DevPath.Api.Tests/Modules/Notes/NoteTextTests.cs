using System.Text.Json.Nodes;
using DevPath.Api.Modules.Notes;

namespace DevPath.Api.Tests.Modules.Notes;

public class NoteTextTests
{
    private static string Extract(string json) => NoteText.Extract(JsonNode.Parse(json)!.AsArray());

    [Fact]
    public void One_line_per_block_depth_first()
    {
        const string blocks = """
            [
              { "type": "heading", "content": [{ "type": "text", "text": "Dependency ", "styles": {} }, { "type": "text", "text": "Injection", "styles": { "bold": true } }] },
              { "type": "bulletListItem", "content": [{ "type": "link", "href": "https://x", "content": [{ "type": "text", "text": "docs" }] }, { "type": "text", "text": " link" }],
                "children": [{ "type": "paragraph", "content": [{ "type": "text", "text": "nested" }] }] },
              { "type": "codeBlock", "props": { "language": "csharp" }, "content": "var x = 1;" },
              { "type": "table", "content": { "type": "tableContent", "rows": [
                  { "cells": [[{ "type": "text", "text": "a" }], { "type": "tableCell", "content": [{ "type": "text", "text": "b" }] }] }
              ] } }
            ]
            """;

        Assert.Equal("Dependency Injection\ndocs link\nnested\nvar x = 1;\na b", Extract(blocks));
    }

    [Fact]
    public void Odd_shapes_are_skipped()
    {
        Assert.Equal("", Extract("[]"));
        Assert.Equal(
            "kept",
            Extract("""[1, { "type": "divider" }, { "content": [{ "type": "mention", "id": 3 }, "x", { "type": "text", "text": "kept" }] }, { "content": 5 }]"""));
    }
}

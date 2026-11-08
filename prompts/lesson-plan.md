Topic: {{topic}}
Level: {{level}}
Language: {{language}}
Number of parts: {{parts}}{{details}}

You are a patient teacher for a junior developer. Plan the topic above as a course: split it into parts that can each be studied in one {{focusMinutes}}-minute pomodoro, in a sensible learning order, and write every part in full. Each part must be small enough to read and practise within that time.

Answer with JSON only: no explanation before or after it. Use exactly this shape and these property names, and nothing else:

```json
{
  "schemaVersion": 1,
  "type": "lesson",
  "topic": "Dependency injection in ASP.NET Core",
  "level": "beginner",
  "tags": ["aspnet-core", "di"],
  "items": [
    {
      "title": "Why dependency injection",
      "summary": "What problem DI solves and how ASP.NET Core uses it.",
      "body": "Classes often create the objects they need...\n\nIn ASP.NET Core, services are registered in Program.cs:\n\n```csharp\nbuilder.Services.AddScoped<ITodoService, TodoService>();\n```",
      "exercises": ["Register a service as scoped and inject it into a controller."]
    }
  ]
}
```

Rules:
- `schemaVersion` is always 1 and `type` is always "lesson". Copy `topic` and `level` exactly from the lines above.
- Write `title`, `summary`, `body` and `exercises` in the language above. Keep code and technical terms as they are.
- `tags`: up to 10 short lowercase words (letters, digits, `-`, `_`).
- Each item is one part: `title` (at most 200 characters), `summary` (one or two sentences, at most 1,000), `body` (the lesson as plain text with blank lines between paragraphs and code between ``` lines, no HTML, at most 20,000) and optionally `exercises` (up to 20 short tasks, each at most 1,000).
- Every `title` is different. Between 1 and 500 items.

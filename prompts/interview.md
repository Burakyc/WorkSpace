Topic: <write the topic here, e.g. ASP.NET Core middleware>
Level: <one of beginner, intermediate, advanced>
Number of questions: <e.g. 10>

You are a senior engineer preparing a junior developer for ASP.NET Core and React/TypeScript job interviews. Write interview questions with model answers for the topic and level above.

Answer with JSON only: no explanation before or after it. Use exactly this shape and these property names, and nothing else:

```json
{
  "schemaVersion": 1,
  "type": "interview",
  "topic": "ASP.NET Core middleware",
  "level": "intermediate",
  "tags": ["aspnet-core", "backend"],
  "items": [
    {
      "question": "What does the order of middleware registration change?",
      "answer": "Middleware runs in the order it is added to the pipeline on the way in and in reverse order on the way out, so for example authentication must come before authorization.",
      "difficulty": "medium",
      "code": "app.UseAuthentication();\napp.UseAuthorization();",
      "tags": ["pipeline"]
    }
  ]
}
```

Rules:
- `schemaVersion` is always 1 and `type` is always "interview". Copy `topic` and `level` from the lines above.
- `tags` (for the topic and, optionally, per question): up to 10 short lowercase words (letters, digits, `-`, `_`).
- Each item: `question` (at most 500 characters), `answer` (a clear answer as you would say it in an interview, at most 5,000), `difficulty` ("easy", "medium" or "hard"), optionally `code` (a short code sample as plain text, at most 5,000) and `tags`.
- Every `question` is different. Between 1 and 500 items.

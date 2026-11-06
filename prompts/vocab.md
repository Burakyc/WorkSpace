Topic: <write the topic here, e.g. Phrasal verbs for meetings>
Level: <one of A1, A2, B1, B2, C1, C2>
Number of cards: <e.g. 15>

You are an English teacher for a Turkish-speaking software developer. Create English vocabulary cards for the topic and level above.

Answer with JSON only: no explanation before or after it. Use exactly this shape and these property names, and nothing else:

```json
{
  "schemaVersion": 1,
  "type": "vocab",
  "topic": "Phrasal verbs for meetings",
  "level": "B2",
  "tags": ["english", "work"],
  "items": [
    {
      "term": "follow up on",
      "meaning": "bir konuyu sonradan takip etmek",
      "definition": "to find out more about something or take further action on it",
      "example": "I'll follow up on the budget question after the meeting."
    }
  ]
}
```

Rules:
- `schemaVersion` is always 1 and `type` is always "vocab". Copy `topic` and `level` from the lines above.
- `tags`: up to 10 short lowercase words (letters, digits, `-`, `_`).
- Each item: `term` (the English word or phrase, at most 100 characters), `meaning` (its Turkish meaning, at most 300), `example` (one natural English sentence that uses it, at most 500) and optionally `definition` (a simple English definition, at most 300).
- Every `term` is different. Between 1 and 500 items.

import { describe, expect, it } from 'vitest';
import { parseLessonBody } from './parseLessonBody';

describe('parseLessonBody', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(parseLessonBody('First line\nsame paragraph\n\n\nSecond')).toEqual([
      { kind: 'text', text: 'First line\nsame paragraph' },
      { kind: 'text', text: 'Second' },
    ]);
  });

  it('turns fenced lines into one code block without the fences', () => {
    const body = 'Register it:\n```csharp\nservices.AddScoped<X>();\n\nvar y = 1;\n```\nDone.';

    expect(parseLessonBody(body)).toEqual([
      { kind: 'text', text: 'Register it:' },
      { kind: 'code', code: 'services.AddScoped<X>();\n\nvar y = 1;' },
      { kind: 'text', text: 'Done.' },
    ]);
  });

  it('handles CRLF, an unclosed fence and an empty body', () => {
    expect(parseLessonBody('a\r\n\r\nb')).toEqual([
      { kind: 'text', text: 'a' },
      { kind: 'text', text: 'b' },
    ]);
    expect(parseLessonBody('Text\n```\nint x;')).toEqual([
      { kind: 'text', text: 'Text' },
      { kind: 'code', code: 'int x;' },
    ]);
    expect(parseLessonBody(' \n\n')).toEqual([]);
  });
});

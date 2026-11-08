import { describe, expect, it } from 'vitest';
import { buildLessonPlanPrompt, type LessonPlanInput } from './lessonPlanPrompt';

const input: LessonPlanInput = {
  topic: ' Dependency injection ',
  level: 'advanced',
  parts: 6,
  language: 'tr',
  background: '',
  focusMinutes: 40,
  existingParts: [],
};

describe('buildLessonPlanPrompt', () => {
  it('fills in the answers and the focus length', () => {
    const prompt = buildLessonPlanPrompt(input);

    expect(prompt).toMatch(
      /^Topic: Dependency injection\r?\nLevel: advanced\r?\nLanguage: Turkish\r?\nNumber of parts: 6\r?\n\r?\n/,
    );
    expect(prompt).toContain('one 40-minute pomodoro');
    expect(prompt).not.toContain('{{');
  });

  it('lets the AI choose the number of parts', () => {
    expect(buildLessonPlanPrompt({ ...input, parts: null })).toContain(
      'Number of parts: your choice',
    );
  });

  it('adds the background and the existing parts only when given', () => {
    expect(buildLessonPlanPrompt(input)).not.toMatch(/already/);

    const prompt = buildLessonPlanPrompt({
      ...input,
      background: '  C# biliyorum ',
      existingParts: ['Why DI', 'Lifetimes'],
    });
    expect(prompt).toContain('already knows and wants: C# biliyorum\n');
    expect(prompt).toContain('continue after them:\n- Why DI\n- Lifetimes');
  });

  it('keeps user text literal', () => {
    const prompt = buildLessonPlanPrompt({ ...input, topic: '$& {{level}}' });

    expect(prompt).toContain('Topic: $& {{level}}');
  });
});

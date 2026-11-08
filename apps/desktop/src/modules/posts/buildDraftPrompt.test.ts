import { describe, expect, it } from 'vitest';
import { buildDraftPrompt } from './buildDraftPrompt';

describe('buildDraftPrompt', () => {
  it('fills the placeholders', () => {
    const prompt = buildDraftPrompt({
      topic: 'Todo API',
      style: 'Be short.',
      source: 'Project: X',
    });

    expect(prompt.startsWith('Topic: Todo API\n')).toBe(true);
    expect(prompt).toContain('<style>\nBe short.\n</style>');
    expect(prompt).toContain('<source>\nProject: X\n</source>');
    expect(prompt).not.toContain('{{');
  });

  it('marks an empty style', () => {
    expect(buildDraftPrompt({ topic: 'T', style: '', source: 'S' })).toContain(
      '<style>\n(none)\n</style>',
    );
  });

  it('leaves placeholders and $ patterns inside values alone', () => {
    const prompt = buildDraftPrompt({ topic: 'T', style: '$&', source: 'Note: {{style}}' });

    expect(prompt).toContain('<style>\n$&\n</style>');
    expect(prompt).toContain('<source>\nNote: {{style}}\n</source>');
  });
});

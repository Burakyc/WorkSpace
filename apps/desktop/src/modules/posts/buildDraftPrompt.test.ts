import { describe, expect, it } from 'vitest';
import { linkAnalysisTemplate, promptTemplates } from '../content/prompts';
import { buildDraftPrompt } from './buildDraftPrompt';

describe('buildDraftPrompt', () => {
  it('fills the placeholders', () => {
    const prompt = buildDraftPrompt(promptTemplates.post, {
      topic: 'Todo API',
      style: 'Be short.',
      source: 'Project: X',
    });

    expect(prompt.startsWith('Topic: Todo API\n')).toBe(true);
    expect(prompt).toContain('<style>\nBe short.\n</style>');
    expect(prompt).toContain('<source>\nProject: X\n</source>');
    expect(prompt).not.toContain('{{');
  });

  it('fills the link template', () => {
    const prompt = buildDraftPrompt(linkAnalysisTemplate, {
      topic: 'How DI works',
      style: 'Be short.',
      source: '{ "url": "https://x.test" }',
    });

    expect(prompt.startsWith('Topic: How DI works\n')).toBe(true);
    expect(prompt).toContain('<analysis>\n{ "url": "https://x.test" }\n</analysis>');
    expect(prompt).not.toContain('{{');
  });

  it('marks an empty style', () => {
    expect(
      buildDraftPrompt(promptTemplates.post, { topic: 'T', style: '', source: 'S' }),
    ).toContain('<style>\n(none)\n</style>');
  });

  it('leaves placeholders and $ patterns inside values alone', () => {
    const prompt = buildDraftPrompt(promptTemplates.post, {
      topic: 'T',
      style: '$&',
      source: 'Note: {{style}}',
    });

    expect(prompt).toContain('<style>\n$&\n</style>');
    expect(prompt).toContain('<source>\nNote: {{style}}\n</source>');
  });

  it('makes line ends LF', () => {
    expect(buildDraftPrompt('a\r\nb {{topic}}', { topic: 'T', style: '', source: '' })).toBe(
      'a\nb T',
    );
  });
});

import { describe, expect, it } from 'vitest';
import type { PostDraft } from '../../shared/api/types';
import { draftCopyText, parseHashtags } from './draftText';

const draft: PostDraft = {
  id: '1',
  topic: 'Todo API',
  title: 'Title',
  body: 'Body line.\n\nSecond.',
  hashtags: ['a', 'b'],
  sourceLink: 'https://x.test/',
  imageSuggestion: 'Image',
  createdAt: '',
  updatedAt: '',
};

describe('draftCopyText', () => {
  it('joins body, hashtags and link with blank lines, without title or image', () => {
    expect(draftCopyText(draft)).toBe('Body line.\n\nSecond.\n\n#a #b\n\nhttps://x.test/');
  });

  it('leaves out missing parts', () => {
    expect(draftCopyText({ ...draft, hashtags: [], sourceLink: null })).toBe(draft.body);
    expect(draftCopyText({ ...draft, hashtags: [] })).toBe(`${draft.body}\n\nhttps://x.test/`);
  });
});

describe('parseHashtags', () => {
  it('splits on spaces and commas and drops the #', () => {
    expect(parseHashtags(' #a b,  ##c ')).toEqual(['a', 'b', 'c']);
    expect(parseHashtags('  ')).toEqual([]);
  });
});

import type { PostDraft } from '../../shared/api/types';

/** What "Kopyala" writes: body, hashtags and link, separated by blank lines. No title: a LinkedIn post has no title field. */
export function draftCopyText({ body, hashtags, sourceLink }: PostDraft): string {
  const tags = hashtags.map((tag) => `#${tag}`).join(' ');
  return [body, tags, sourceLink ?? ''].filter((part) => part !== '').join('\n\n');
}

/** The form's hashtag box: separated by spaces or commas, a leading # optional. */
export function parseHashtags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, ''))
    .filter((tag) => tag !== '');
}

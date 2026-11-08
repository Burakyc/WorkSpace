import interview from '../../../../../prompts/interview.md?raw';
import lesson from '../../../../../prompts/lesson.md?raw';
import post from '../../../../../prompts/post.md?raw';
import vocab from '../../../../../prompts/vocab.md?raw';
import type { ContentType } from '../../shared/api/types';

/** The prompt templates of the repo's prompts/ folder, bundled at build time. */
export const promptTemplates: Readonly<Record<ContentType, string>> = {
  vocab,
  lesson,
  interview,
  post,
};

import type { Difficulty, InterviewItem } from '../../shared/api/types';

export interface QuestionFilter {
  difficulty: Difficulty | 'all';
  /** A question tag, or 'all'. */
  tag: string;
  status: 'all' | 'open' | 'practised';
}

export const ALL_QUESTIONS: QuestionFilter = { difficulty: 'all', tag: 'all', status: 'all' };

/** The questions matching every part of the filter, in their added order. */
export function filterQuestions(items: readonly InterviewItem[], filter: QuestionFilter) {
  return items.filter(
    (item) =>
      (filter.difficulty === 'all' || item.difficulty === filter.difficulty) &&
      (filter.tag === 'all' || (item.tags ?? []).includes(filter.tag)) &&
      (filter.status === 'all' || (item.mark === 'practised') === (filter.status === 'practised')),
  );
}

/** Every tag used on a question, sorted. */
export function questionTags(items: readonly InterviewItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.tags ?? []))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
}

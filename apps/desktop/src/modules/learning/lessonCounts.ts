import type { TopicSummary } from '../../shared/api/types';

/** "8 parça · 3 tamamlandı"; no done part at 0. */
export function lessonCounts({ itemCount, marks }: Pick<TopicSummary, 'itemCount' | 'marks'>) {
  const done = marks.done ?? 0;
  return done > 0 ? `${itemCount} parça · ${done} tamamlandı` : `${itemCount} parça`;
}

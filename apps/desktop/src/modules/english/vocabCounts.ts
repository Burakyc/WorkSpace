import type { TopicSummary } from '../../shared/api/types';

/** "12 kart · 5 biliyorum · 2 tekrar"; zero marks are left out. */
export function vocabCounts({ itemCount, marks }: Pick<TopicSummary, 'itemCount' | 'marks'>) {
  const known = marks.known ?? 0;
  const repeat = marks.repeat ?? 0;
  return [`${itemCount} kart`, known > 0 && `${known} biliyorum`, repeat > 0 && `${repeat} tekrar`]
    .filter(Boolean)
    .join(' · ');
}

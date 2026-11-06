import type { TopicSummary } from '../../shared/api/types';

/** "10 soru · 4 çalışıldı"; no practised part at 0. */
export function interviewCounts({ itemCount, marks }: Pick<TopicSummary, 'itemCount' | 'marks'>) {
  const practised = marks.practised ?? 0;
  return practised > 0 ? `${itemCount} soru · ${practised} çalışıldı` : `${itemCount} soru`;
}
